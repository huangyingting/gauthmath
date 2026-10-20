'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
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

  useEffect(() => {
    setLoading(true);
    fetch(`/api/questions/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && data.question) {
          setQuestion(data.question);
          setRelated(data.relatedQuestions || []);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

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

  const handleSendFollowUp = async (textOverride?: string) => {
    if (!question) return;
    const msg = (textOverride ?? chatInput).trim();
    if (!msg) return;
    setSendingChat(true);
    setChatInput('');
    try {
      const res = await fetch(`/api/questions/${question.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: msg }),
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.followUpMessages)) {
        setQuestion((prev) =>
          prev ? { ...prev, followUpMessages: data.followUpMessages } : prev
        );
      }
    } finally {
      setSendingChat(false);
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
      <div className="mx-auto max-w-5xl p-8 text-center text-sm text-slate-500">
        Loading verified step-by-step solution...
      </div>
    );
  }

  if (!question) {
    return (
      <div className="mx-auto max-w-4xl p-8 text-center">
        <h1 className="text-xl font-bold text-slate-900">Solution Not Found</h1>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#FF4B4B] px-4 py-2 text-xs font-bold text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to AI Homework Helper
        </Link>
      </div>
    );
  }

  return (
    <div
      className="mx-auto max-w-6xl px-4 py-6 sm:px-8"
      data-testid="solution-detail-page"
    >
      {/* Top Breadcrumb */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#FF4B4B]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Ask Another Question</span>
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
            <span>{question.isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
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
            <span>{copied ? 'Copied!' : 'Copy Answer'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: Problem, Steps, Graph & AI Follow-up */}
        <div className="space-y-6 lg:col-span-2">
          {/* Question Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-extrabold text-[#FF4B4B]">
                {question.subject}
              </span>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {question.topic}
              </span>
              <span
                className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                  question.accuracyScore >= 90
                    ? 'bg-emerald-50 text-emerald-700'
                    : question.accuracyScore > 0
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-rose-50 text-rose-700'
                }`}
              >
                {question.accuracyScore >= 90
                  ? `${question.accuracyScore}% Verified Accuracy`
                  : question.accuracyScore > 0
                    ? `${question.accuracyScore}% Numerical Approximation`
                    : 'Unsupported / Needs Clarification'}
              </span>
            </div>

            <h1
              className="mt-4 font-mono text-xl font-black text-slate-900 sm:text-2xl"
              data-testid="solution-prompt-heading"
            >
              {question.promptText}
            </h1>

            {/* Final Answer Highlight Box */}
            <div className="mt-5 rounded-2xl border-2 border-emerald-200 bg-emerald-50/70 p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Final Verified Answer
                </span>
                <span className="text-[11px] font-semibold text-emerald-700">
                  Engine: {question.providerUsed}
                </span>
              </div>
              <div
                className="mt-2 font-mono text-xl font-black text-slate-900"
                data-testid="solution-final-answer"
              >
                {question.answerSummary}
              </div>
            </div>

            {/* Step-by-Step Cards */}
            <div className="mt-6 space-y-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-500">
                Step-by-Step Explanation ({question.steps.length} Steps)
              </h2>
              {question.steps.map((step) => (
                <div
                  key={step.number}
                  data-testid={`solution-step-${step.number}`}
                  className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FF4B4B] text-xs font-extrabold text-white">
                      {step.number}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      {step.title}
                    </h3>
                  </div>
                  <div className="mt-2.5 overflow-x-auto rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 font-mono text-sm font-bold text-indigo-950">
                    <MathFormula latex={step.latex} />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    {step.explanation}
                  </p>
                </div>
              ))}
            </div>

            {/* Helpful / Unhelpful Feedback Row */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <div className="text-xs font-semibold text-slate-500">
                Verified by <strong>{question.tutorName}</strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleVote('helpful')}
                  data-testid="vote-helpful-btn"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  <span>Helpful ({question.helpfulCount})</span>
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
          {question.graphConfig && (
            <FunctionGraphSvg graph={question.graphConfig} />
          )}

          {/* Interactive Follow-Up Tutor Chat */}
          <div
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs"
            data-testid="followup-tutor-chat"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Ask Gauth Super Tutor a Follow-Up Question
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Powered by Pluggable Copilot SDK / Azure OpenAI + Symbolic Verifier
                  </p>
                </div>
              </div>
            </div>

            {/* Chat History */}
            <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
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
                      (m.role === 'user' ? 'You' : 'Gauth AI Super Tutor')}
                  </div>
                  <div className="whitespace-pre-line">{m.text}</div>
                </div>
              ))}
            </div>

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
                  onClick={() => handleSendFollowUp(chip)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Chat Input */}
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask why a step works or request another method..."
                data-testid="followup-chat-input"
                className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendFollowUp();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => handleSendFollowUp()}
                disabled={sendingChat}
                data-testid="followup-chat-send-btn"
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{sendingChat ? 'Sending...' : 'Ask Tutor'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Human Expert Escalation, Key Concepts & Related Questions */}
        <div className="space-y-6">
          {/* 24/7 Live Human Verified Expert Tutor Escalation Card */}
          <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-slate-950">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-extrabold text-amber-950">
                  24/7 HUMAN EXPERTS ONLINE
                </span>
                <h3 className="mt-0.5 text-sm font-extrabold text-slate-900">
                  Need a Live Human Tutor?
                </h3>
              </div>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-slate-600">
              Connect with one of 50,000+ verified Ph.D. & Master’s STEM tutors for personalized whiteboard annotation.
            </p>
            <button
              type="button"
              onClick={handleEscalateLiveTutor}
              disabled={escalating || question.tutorEscalationStatus === 'ANSWERED'}
              data-testid="escalate-live-tutor-btn"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-slate-800 disabled:bg-emerald-600"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>
                {question.tutorEscalationStatus === 'ANSWERED'
                  ? 'Live Expert Connected (See Chat)'
                  : escalating
                    ? 'Connecting Live Tutor...'
                    : 'Connect Live Verified Expert'}
              </span>
            </button>
          </div>

          {/* Quick Tip & Key Concepts */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-600">
              <Lightbulb className="h-4 w-4" />
              <span>Key Concept & Quick Tip</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-700">
              {question.quickTip}
            </p>
            {question.keyConcepts.map((kc, i) => (
              <div
                key={i}
                className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3"
              >
                <div className="text-xs font-bold text-slate-900">
                  {kc.title}
                </div>
                <div className="mt-1 font-mono text-xs font-semibold text-indigo-700">
                  {kc.formula}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {kc.description}
                </div>
              </div>
            ))}
          </div>

          {/* Related Study Bank Questions */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-extrabold text-slate-900">
              Similar {question.subject} Questions
            </h3>
            <div className="mt-3 space-y-2.5">
              {related.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/solution/${rel.slug || rel.id}`}
                  className="block rounded-2xl border border-slate-100 bg-slate-50/70 p-3 transition hover:border-rose-300 hover:bg-rose-50/40"
                >
                  <div className="font-mono text-xs font-bold text-slate-900">
                    {rel.promptText}
                  </div>
                  <div className="mt-1 truncate font-mono text-[11px] text-slate-500">
                    Ans: {rel.answerSummary}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
