'use client';

import { useI18n } from '@/components/i18n/LanguageProvider';
import React, { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Send,
  UserCheck,
  Sparkles,
  ArrowLeft,
  Lightbulb,
  MessageSquare,
} from 'lucide-react';
import { FunctionGraphSvg } from '@/components/math/FunctionGraphSvg';
import { MathFormula } from '@/components/ui/MathFormula';
import { RichText } from '@/components/ui/RichText';
import { WorkingIndicator } from '@/components/ui/WorkingIndicator';
import { VoiceInputButton, ReadAloudButton } from '@/components/ui/VoiceControls';
import { VerificationEvidence } from '@/components/ui/VerificationEvidence';
import type { VerificationStatus } from '@/lib/math-engine/solver';
import type { TutorMode } from '@/lib/tutoring';
import type { FunctionGraphData } from '@/lib/math-engine/grapher';

interface SolutionStep {
  number: number;
  title: string;
  latex: string;
  explanation: string;
}

interface QuestionDetail {
  id: string;
  slug: string;
  subject: string;
  topic: string;
  promptText: string;
  latexExpression: string;
  answerSummary: string;
  quickTip: string;
  providerUsed: string;
  accuracyScore: number;
  verificationStatus: VerificationStatus;
  verificationDetail: string;
  isBookmarked: boolean;
  helpfulCount: number;
  unhelpfulCount: number;
  tutorEscalationStatus: string;
  tutorName: string;
  steps: SolutionStep[];
  keyConcepts: Array<{ title: string; formula: string; description: string }>;
  graphConfig: FunctionGraphData | null;
  followUpMessages: Array<{
    role: string;
    author?: string;
    text: string;
    timestamp: string;
  }>;
}

export default function SolutionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t, locale } = useI18n();
  const { id } = use(params);
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [related, setRelated] = useState<
    Array<{ id: string; slug: string; promptText: string; subject: string; answerSummary: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [tutorMode, setTutorMode] = useState<TutorMode>('explain');
  const [selectedStep, setSelectedStep] = useState<number | undefined>();
  const [showSolution, setShowSolution] = useState(true);
  const request = useRef<AbortController | null>(null);
  const lastRequest = useRef<{ text: string; step?: number; mode: TutorMode } | null>(null);
  const transcript = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    const controller = new AbortController();
    setChatError(null);
    setSendingChat(false);
    setPendingMessage(null);
    setSelectedStep(undefined);
    setChatInput('');
    fetch(`/api/questions/${id}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && data.question) {
          setQuestion(data.question);
          setRelated(data.relatedQuestions || []);
        }
      })
      .catch(() => { if (!controller.signal.aborted) setChatError('The solution could not be loaded. Please reload the page.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); request.current?.abort(); request.current = null; };
  }, [id]);
  useEffect(() => {
    if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [question?.followUpMessages, pendingMessage]);

  const handleBookmark = async () => {
    if (!question) return;
    const res = await fetch(`/api/questions/${question.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isBookmarked: !question.isBookmarked }),
    });
    const data = await res.json();
    if (data.ok) {
      setQuestion((prev) =>
        prev ? { ...prev, isBookmarked: !prev.isBookmarked } : prev
      );
    }
  };

  const handleVote = async (vote: 'helpful' | 'unhelpful') => {
    if (!question) return;
    const res = await fetch(`/api/questions/${question.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vote }),
    });
    const data = await res.json();
    if (data.ok) {
      setQuestion((prev) =>
        prev
          ? {
              ...prev,
              helpfulCount: data.question.helpfulCount,
              unhelpfulCount: data.question.unhelpfulCount,
            }
          : prev
      );
    }
  };

  const handleSendFollowUp = async (textOverride?: string, step = selectedStep, mode = tutorMode) => {
    if (!question || request.current) return;
    const msg = (textOverride ?? chatInput).trim();
    if (!msg) return;
    setSendingChat(true);
    setChatError(null);
    setPendingMessage(msg);
    lastRequest.current = { text: msg, step, mode };
    const controller = new AbortController();
    request.current = controller;
    try {
      const res = await fetch(`/api/questions/${question.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: msg, mode, stepNumber: step, locale }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok || !data.ok || !Array.isArray(data.followUpMessages)) throw new Error(data.error || 'The tutor could not reply. Please try again.');
      if (!controller.signal.aborted) {
        setQuestion((prev) =>
          prev ? { ...prev, followUpMessages: data.followUpMessages } : prev
        );
        setChatInput('');
      }
    } catch (failure) {
      if (!controller.signal.aborted) setChatError(failure instanceof TypeError ? 'Could not reach the tutor. Please try again.' : failure instanceof Error ? failure.message : 'The tutor could not reply. Please try again.');
    } finally {
      if (!controller.signal.aborted) { setSendingChat(false); setPendingMessage(null); }
      if (request.current === controller) request.current = null;
    }
  };

  const handleEscalateLiveTutor = async () => {
    if (!question) return;
    setEscalating(true);
    try {
      const res = await fetch(`/api/questions/${question.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escalateTutor: true }),
      });
      const data = await res.json();
      if (data.ok && data.question) {
        setQuestion((prev) =>
          prev
            ? {
                ...prev,
                tutorEscalationStatus: data.question.tutorEscalationStatus,
                tutorName: data.question.tutorName,
                followUpMessages: data.question.followUpMessages,
              }
            : prev
        );
      }
    } finally {
      setEscalating(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-8 text-center text-sm text-slate-500">{t("Loading verified step-by-step solution...")}</div>
    );
  }

  if (!question) {
    return (
      <div className="mx-auto max-w-4xl p-8 text-center">
        {chatError && <p className="mb-4 text-sm text-rose-800" role="alert">{t(chatError)}</p>}
        <h1 className="text-xl font-bold text-slate-900">{t("Solution Not Found")}</h1>
        <Link
          href="/"
          className="primary-button mt-4"
        >
          <ArrowLeft className="h-4 w-4" />{t("Back to AI Homework Helper")}</Link>
      </div>
    );
  }

  return (
    <div
      className="page-container"
      data-testid="solution-detail-page"
    >
      {/* Top Breadcrumb */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-atelier-muted hover:text-atelier-vermilion"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{t("Ask Another Question")}</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBookmark}
            data-testid="bookmark-solution-btn"
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
              question.isBookmarked
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span>{question.isBookmarked ? t('Bookmarked') : t('Bookmark')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(question.answerSummary);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>{copied ? t('Copied!') : t('Copy Answer')}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: Problem, Steps, Graph & AI Follow-up */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {/* Question Card */}
          <div className="paper-panel p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-atelier-vermilion">
                {t(question.subject)}
              </span>
              <span className="px-2 py-1 text-xs text-atelier-muted">
                {question.topic}
              </span>
            </div>

            <h1
              className="mt-6 break-words text-2xl font-semibold leading-snug text-atelier-ink sm:text-3xl"
              data-testid="solution-prompt-heading"
            >
              {question.promptText}
            </h1>
            <VerificationEvidence status={question.verificationStatus} detail={question.verificationDetail} />
            <button type="button" className="text-button mt-3" onClick={() => setShowSolution(!showSolution)} aria-expanded={showSolution}>
              {t(showSolution ? 'Hide the worked solution' : 'Reveal the worked solution')}
            </button>

            {/* Final Answer Highlight Box */}
            {showSolution && <>
            <div className="solution-answer">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="eyebrow flex items-center gap-1.5 text-atelier-jade">
                  {t("The answer")}</span>
                <span className="text-[11px] font-semibold text-emerald-700">{t("Engine: ")}{question.providerUsed}
                </span>
              </div>
              <ReadAloudButton text={question.answerSummary} />
              <div
                className="mt-2 text-xl font-semibold text-slate-900"
                data-testid="solution-final-answer"
              >
                <RichText text={question.answerSummary} />
              </div>
            </div>

            {/* Step-by-Step Cards */}
            <div className="mt-6 space-y-5">
              <h2 className="eyebrow text-atelier-muted">{t('Step-by-Step Explanation ({count} Steps)', { count: question.steps.length })}</h2>
              {question.steps.map((step) => (
                <div
                  key={step.number}
                  data-testid={`solution-step-${step.number}`}
                  className="border-l border-atelier-border pl-5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs text-atelier-muted">
                      {step.number}
                    </span>
                    <h3 className="text-base font-semibold text-atelier-ink">
                      {step.title}
                    </h3>
                  </div>
                  <div className="mt-3 min-w-0 rounded-md bg-atelier-canvas px-3 py-2 text-base text-atelier-ink">
                    <MathFormula latex={step.latex} display />
                  </div>
                  <RichText text={step.explanation} className="mt-3 text-sm leading-7 text-atelier-muted" />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button type="button" disabled={sendingChat} data-testid={`explain-step-${step.number}`} className="text-button"
                      onClick={() => { setSelectedStep(step.number); void handleSendFollowUp(t('Explain this step in simpler terms.'), step.number, 'explain'); }}>{t('Explain this step')}</button>
                    <ReadAloudButton text={`${step.title}. ${step.explanation}`} />
                  </div>
                </div>
              ))}
            </div>
            </>}

            {/* Helpful / Unhelpful Feedback Row */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <div className="text-xs text-atelier-muted">{t('Did this help you understand?')}</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleVote('helpful')}
                  data-testid="vote-helpful-btn"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  <span>{t('Helpful ({count})', { count: question.helpfulCount })}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleVote('unhelpful')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                  <span>({question.unhelpfulCount})</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2D Function Graph Card */}
          {showSolution && question.graphConfig && (
            <FunctionGraphSvg graph={question.graphConfig} />
          )}

          {/* Interactive Follow-Up Tutor Chat */}
          <div
            className="paper-panel p-5 sm:p-6"
            data-testid="followup-tutor-chat"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-atelier-lilac text-atelier-vermilion">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-atelier-ink">{t("Keep the conversation going.")}</h3>
                  <p className="text-[11px] text-slate-500">{t("Ask about a step, or try another way of thinking.")}</p>
                </div>
              </div>
            </div>

            {/* Chat History */}
            <div ref={transcript} className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1" aria-busy={sendingChat}>
              {question.followUpMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl p-3.5 text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'ml-8 bg-slate-900 text-white'
                      : m.role === 'tutor'
                        ? 'border border-amber-300 bg-amber-50 text-slate-900'
                        : 'mr-8 border border-slate-200 bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="mb-1 font-bold text-[10px] uppercase tracking-wider opacity-75">
                    {m.author ||
                      (m.role === 'user' ? t('You') : t('Gauth AI Super Tutor'))}
                  </div>
                  <RichText text={m.text} />
                  {m.role !== 'user' && <ReadAloudButton text={m.text} />}
                </div>
              ))}
              {pendingMessage && <><div className="tutor-message tutor-message-user"><RichText text={pendingMessage} /></div><WorkingIndicator /></>}
            </div>
            {chatError && <div className="tutor-error" role="alert"><span>{t(chatError)}</span><button type="button" className="text-button"
              onClick={() => { const last = lastRequest.current; if (last) void handleSendFollowUp(last.text, last.step, last.mode); }}>{t('Retry')}</button></div>}
            <div className="filter-tabs mt-4" aria-label={t('How should the tutor help?')}>
              {(['hint', 'explain', 'check'] as const).map(mode => <button key={mode} type="button" disabled={sendingChat} aria-pressed={tutorMode === mode}
                data-testid={`tutor-mode-${mode}`} onClick={() => { setTutorMode(mode); if (mode === 'hint') setShowSolution(false); }}>
                {t(mode === 'hint' ? 'Hint first' : mode === 'check' ? 'Check my attempt' : 'Explain')}
              </button>)}
            </div>
            {selectedStep !== undefined && <button type="button" className="text-button mt-2" disabled={sendingChat} onClick={() => setSelectedStep(undefined)}>{t('Focused on step {number} · Clear', { number: selectedStep })}</button>}

            {/* Quick Suggestion Chips */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[
                'How do I verify this answer by substitution?',
                'Explain Step 2 in simpler terms',
                'Give me a similar practice problem',
              ].map((chip, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={sendingChat}
                  onClick={() => handleSendFollowUp(chip)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {t(chip)}
                </button>
              ))}
            </div>

            {/* Chat Input */}
            <div className="lumina-composer-well mt-5 flex flex-wrap items-center gap-2 p-2">
              <input
                type="text"
                aria-label={t("Your follow-up question")}
                value={chatInput}
                disabled={sendingChat}
                maxLength={2000}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={t("Ask why a step works or request another method...")}
                data-testid="followup-chat-input"
                className="min-w-0 flex-1 px-2 py-3 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendFollowUp();
                  }
                }}
              />
              <VoiceInputButton disabled={sendingChat} onTranscript={text => setChatInput(previous => `${previous}${previous ? ' ' : ''}${text}`.slice(0, 2000))} />
              <button
                type="button"
                onClick={() => handleSendFollowUp()}
                disabled={sendingChat || !chatInput.trim()}
                data-testid="followup-chat-send-btn"
                className="primary-button"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{sendingChat ? t('Sending...') : t('Ask Tutor')}</span>
              </button>
            </div>
            <p className="voice-disclosure">{t('Voice uses Azure Speech. Tap the microphone to record up to 30 seconds; audio is not stored by Gauth.')}</p>
          </div>
        </div>

        {/* Right Column: Live Human Expert Escalation, Key Concepts & Related Questions */}
        <aside className="min-w-0 space-y-6">
          {/* 24/7 Live Human Verified Expert Tutor Escalation Card */}
          <div className="rounded-xl bg-atelier-lilac p-6">
            <div className="flex items-center gap-2.5">
              <div className="text-atelier-vermilion">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="eyebrow text-atelier-vermilion">{t("Another perspective")}</span>
                <h3 className="mt-2 text-lg font-semibold text-atelier-ink">{t("A little extra guidance?")}</h3>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-atelier-muted">{t("Request help with this problem and continue the discussion in your tutor conversation.")}</p>
            <button
              type="button"
              onClick={handleEscalateLiveTutor}
              disabled={escalating || ['VERIFIED_BY_TUTOR', 'QUEUED_FOR_TUTOR'].includes(question.tutorEscalationStatus)}
              data-testid="escalate-live-tutor-btn"
              className="secondary-button mt-5 w-full disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>
                {question.tutorEscalationStatus === 'VERIFIED_BY_TUTOR'
                  ? t('Reviewed by a tutor')
                  : question.tutorEscalationStatus === 'QUEUED_FOR_TUTOR' ? t('Review requested')
                  : escalating
                    ? t('Requesting review...')
                    : t('Request a tutor review')}
              </span>
            </button>
          </div>

          {/* Quick Tip & Key Concepts */}
          {showSolution && <details className="border-b border-atelier-border pb-6">
            <summary className="flex items-center gap-2 text-sm font-semibold">
              <Lightbulb className="h-4 w-4" />
              <span>{t("Key Concept & Quick Tip")}</span>
            </summary>
            <RichText text={question.quickTip} className="mt-5 text-sm leading-7 text-atelier-muted" />
            {question.keyConcepts.map((kc, i) => (
              <div
                key={i}
                className="mt-5 border-t border-atelier-border pt-4"
              >
                <div className="text-xs font-bold text-slate-900">
                  {kc.title}
                </div>
                <div className="mt-2 text-base text-atelier-vermilion">
                  <MathFormula latex={kc.formula} display />
                </div>
                <RichText text={kc.description} className="mt-1 text-[11px] text-slate-500" />
              </div>
            ))}
          </details>}

          {/* Related Study Bank Questions */}
          <details className="border-b border-atelier-border pb-6">
            <summary className="text-sm font-semibold">{t('Similar {subject} Questions', { subject: t(question.subject) })}</summary>
            <div className="mt-3 space-y-2.5">
              {related.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/solution/${rel.slug || rel.id}`}
                  className="block border-b border-atelier-border py-4 transition hover:text-atelier-vermilion"
                >
                  <div className="font-mono text-xs font-bold text-slate-900">
                    {rel.promptText}
                  </div>
                </Link>
              ))}
            </div>
          </details>
        </aside>
      </div>
    </div>
  );
}
