'use client';

import { useI18n } from '@/components/i18n/LanguageProvider';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Sparkles, Camera, Calculator, ArrowRight, ArrowUpRight,
  CheckCircle2, ChevronDown, LoaderCircle, MoveUpRight,
} from 'lucide-react';
import { GAUTH_SUBJECTS } from '@/components/layout/AppShell';
import { MathKeyboardModal } from '@/components/modals/MathKeyboardModal';
import { ImageCropModal } from '@/components/modals/ImageCropModal';
import { FunctionGraphSvg } from '@/components/math/FunctionGraphSvg';
import { MathFormula } from '@/components/ui/MathFormula';
import { RichText } from '@/components/ui/RichText';
import { VoiceInputButton, ReadAloudButton } from '@/components/ui/VoiceControls';
import { WorkingIndicator } from '@/components/ui/WorkingIndicator';
import { VerificationEvidence } from '@/components/ui/VerificationEvidence';
import type { VerificationStatus } from '@/lib/math-engine/solver';
import type { FunctionGraphData } from '@/lib/math-engine/grapher';

const QUICK_SAMPLE_PROMPTS = [
  { label: 'x² − 5x + 6 = 0', prompt: 'Solve x^2 - 5x + 6 = 0', subject: 'Math' },
  { label: 'Find a derivative', prompt: 'derivative of x^3 - 6x^2 + 9x + 2', subject: 'Math' },
  { label: 'Explore an integral', prompt: 'integrate x^2 + 4x from 0 to 3', subject: 'Math' },
  { label: 'Kinetic energy', prompt: 'A 4 kg projectile is launched at velocity 15 m/s. Find its kinetic energy and explain Newton’s Second Law F = ma.', subject: 'Physics' },
  { label: 'Understand pH', prompt: 'Calculate the pH of a 0.001 M HCl strong acid solution at 25°C and state the Ideal Gas Law PV = nRT.', subject: 'Chemistry' },
  { label: 'Mean, median & spread', prompt: 'stats of 4, 8, 15, 16, 23, 42', subject: 'Statistics' },
];

const LEARNING_TOOLS = [
  { href: '/calculator', title: 'Work it out.', description: 'A calculator for the why, not just the answer.', detail: 'Calculator' },
  { href: '/writing-examples', title: 'Find your words.', description: 'Give your next draft a clearer direction.', detail: 'Writing studio' },
  { href: '/atlas', title: 'Follow your curiosity.', description: 'Big ideas, broken into stories you can explore.', detail: 'Atlas' },
  { href: '/course', title: 'Take the next step.', description: 'Focused lessons. One concept at a time.', detail: 'Academy' },
];

interface StudyQuestion {
  id: string;
  slug: string;
  subject: string;
  topic: string;
  promptText: string;
  answerSummary: string;
}

interface InstantSolution extends StudyQuestion {
  verificationStatus?: VerificationStatus;
  verificationDetail?: string;
  providerUsed: string;
  steps: Array<{ number: number; title: string; latex: string; explanation: string }>;
  graphConfig: FunctionGraphData | null;
}

export default function HomePage() {
  const { t } = useI18n();
  const [selectedSubject, setSelectedSubject] = useState<string>('Math');
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'STANDARD' | 'PRO'>('PRO');
  const [cropBadge, setCropBadge] = useState<string | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [instantSolution, setInstantSolution] = useState<InstantSolution | null>(null);
  const [studyBank, setStudyBank] = useState<StudyQuestion[]>([]);
  const moreSubjectsRef = useRef<HTMLDetailsElement>(null);
  const solutionRef = useRef<HTMLElement>(null);
  const solving = useRef(false);

  useEffect(() => {
    const prefill = new URL(window.location.href).searchParams.get('question');
    if (prefill) setPrompt(prefill.slice(0, 2000));
    fetch('/api/questions')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.questions)) setStudyBank(data.questions.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (instantSolution) solutionRef.current?.scrollIntoView({ block: 'start' });
  }, [instantSolution]);

  const handleSolve = async (overridePrompt?: string, overrideSubject?: string) => {
    const query = (overridePrompt ?? prompt).trim();
    if (solving.current) return;
    if (!query) {
      setErrorMsg('Enter a question or scan a problem to get started.');
      return;
    }
    setErrorMsg(null);
    solving.current = true;
    setIsSolving(true);
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          subject: overrideSubject ?? selectedSubject,
          mode,
          croppedImageData: cropBadge,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'Failed to solve homework problem.');
        return;
      }
      setInstantSolution(data.question);
    } catch {
      setErrorMsg('Network error while solving question.');
    } finally {
      solving.current = false;
      setIsSolving(false);
    }
  };

  const subjectButton = (subject: string) => (
    <button
      key={subject}
      type="button"
      aria-pressed={selectedSubject === subject}
      data-testid={`subject-pill-${subject.toLowerCase().replace(/\s+/g, '-')}`}
      onClick={() => {
        setSelectedSubject(subject);
        if (moreSubjectsRef.current) moreSubjectsRef.current.open = false;
      }}
    >
      {t(subject)}
    </button>
  );

  return (
    <div className="home-page">
      <section className="home-cover" aria-labelledby="home-title">
        <div className="home-intro">
          <p className="eyebrow">{t("For the beautifully curious mind")}</p>
          <h1 id="home-title" className="home-title">
            <span>{t("Less stuck.")}</span>
            <span>{t("More ")}</span>
            <span className="title-accent">{t("understood.")}</span>
          </h1>
          <p className="home-description">{t("Ask. Check the calculation. Understand each step. Then try it yourself, without the answer in view.")}</p>
          <div className="home-intro-note">
            <MoveUpRight className="h-5 w-5" aria-hidden="true" />
            <span>{t("Not just an answer. A way of thinking.")}</span>
          </div>
        </div>

        <div className="question-workspace">
          <form
            className="question-composer"
            data-testid="homework-composer-card"
            onSubmit={(event) => { event.preventDefault(); handleSolve(); }}
            aria-busy={isSolving}
          >
            <div className="composer-heading">
              <span className="eyebrow">{t("Your space to figure it out")}</span>
              <Sparkles className="h-4 w-4 text-atelier-vermilion" aria-hidden="true" />
            </div>
            <h2 className="composer-title">{t("What are you working on?")}</h2>

            <div className="subject-tabs" data-testid="subject-pills-bar" aria-label={t("Choose a subject")}>
              {GAUTH_SUBJECTS.slice(0, 4).map(subjectButton)}
              <details
                className="subject-more"
                ref={moreSubjectsRef}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.currentTarget.open = false;
                    event.currentTarget.querySelector('summary')?.focus();
                  }
                }}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
                }}
              >
                <summary>
                  {GAUTH_SUBJECTS.slice(0, 4).some((subject) => subject === selectedSubject) ? t('More subjects') : t(selectedSubject)}
                  <ChevronDown className="h-3 w-3" aria-hidden="true" />
                </summary>
                <div className="nav-popover">{GAUTH_SUBJECTS.slice(4).map(subjectButton)}</div>
              </details>
            </div>

            <div className="question-editor">
              <label htmlFor="home-question" className="sr-only">{t('Your {subject} question', { subject: t(selectedSubject) })}</label>
              <textarea
                id="home-question"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value.slice(0, 2000))}
                placeholder={t('Type your {subject} question here.\nAn equation, a tricky concept, anything.', { subject: t(selectedSubject).toLowerCase() })}
                rows={4}
                maxLength={2000}
                data-testid="homework-prompt-input"
                aria-describedby={errorMsg ? 'question-error' : undefined}
                aria-invalid={Boolean(errorMsg)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    if (!isSolving) handleSolve();
                  }
                }}
              />
              <div className="editor-tools">
                <div>
                  <button type="button" className="editor-tool" onClick={() => setCropModalOpen(true)} data-testid="open-crop-modal-btn">
                    <Camera className="h-4 w-4" aria-hidden="true" />{t("Scan a problem")}</button>
                  <button type="button" className="editor-tool" onClick={() => setKeyboardOpen(true)} data-testid="open-math-keyboard-btn">
                    <Calculator className="h-4 w-4" aria-hidden="true" />{t("Symbols")}</button>
                  <VoiceInputButton disabled={isSolving} onTranscript={text => setPrompt(previous => `${previous}${previous ? ' ' : ''}${text}`.slice(0, 2000))} />
                </div>
                <span className="editor-count">{prompt.length} / 2000</span>
              </div>
            </div>
            <p className="voice-disclosure">{t('Voice uses Azure Speech. Tap the microphone to record up to 30 seconds; audio is not stored by Gauth.')}</p>

            {cropBadge && (
              <div className="composer-alert flex items-center justify-between gap-3 bg-emerald-50 text-emerald-900">
                <span className="flex min-w-0 items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0" /><span className="truncate">{cropBadge}</span></span>
                <button type="button" className="shrink-0 underline" onClick={() => setCropBadge(null)}>{t("Remove")}</button>
              </div>
            )}
            {errorMsg && <div id="question-error" role="alert" className="composer-alert bg-rose-50 text-rose-800">{t(errorMsg)}</div>}
            {isSolving && <div className="mt-3"><WorkingIndicator label="Solving and checking the calculation..." /></div>}

            <div className="composer-actions">
              <div className="mode-switch" aria-label={t("Answer mode")}>
                <button type="button" aria-pressed={mode === 'STANDARD'} onClick={() => setMode('STANDARD')}>{t("Standard")}</button>
                <button type="button" aria-pressed={mode === 'PRO'} onClick={() => setMode('PRO')} data-testid="toggle-ai-pro-btn">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />{t("AI Pro")}</button>
              </div>
              <button type="submit" disabled={isSolving} className="primary-button" data-testid="solve-homework-submit-btn">
                {isSolving ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                <span>{isSolving ? t('Thinking it through...') : t('Show me how')}</span>
                {!isSolving && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            <div className="composer-hint"><span>{t("A little context makes a better explanation.")}</span><span>Ctrl / ⌘ + Enter</span></div>
          </form>

          <details className="example-prompts">
            <summary>{t("Not sure where to start? Try an example.")}<ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /></summary>
            <div>
              {QUICK_SAMPLE_PROMPTS.map((sample, index) => (
                <button
                  key={sample.label}
                  type="button"
                  disabled={isSolving}
                  data-testid={`sample-prompt-${index}`}
                  onClick={() => {
                    setSelectedSubject(sample.subject);
                    setPrompt(sample.prompt);
                    handleSolve(sample.prompt, sample.subject);
                  }}
                >
                  <span className="mr-2 opacity-60">0{index + 1}</span>{t(sample.label)}
                </button>
              ))}
            </div>
          </details>
        </div>
      </section>

      {instantSolution && (
        <section ref={solutionRef} className="home-solution paper-panel" data-testid="instant-solution-panel" aria-labelledby="solution-title">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0 flex-1">
              <p className="eyebrow text-atelier-vermilion">{t(instantSolution.subject)} / {instantSolution.topic}</p>
              <h2 id="solution-title" className="mt-3 text-xl font-semibold">{instantSolution.promptText}</h2>
            </div>
            <Link href={`/solution/${instantSolution.slug || instantSolution.id}`} className="secondary-button" data-testid="open-full-solution-link">{t("Explore with a tutor")}<ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <VerificationEvidence status={instantSolution.verificationStatus} detail={instantSolution.verificationDetail} />
          <div className="solution-answer">
            <p className="eyebrow text-atelier-jade">{t("The answer")}</p>
            <div className="mt-3 text-2xl font-semibold" data-testid="instant-answer-summary"><RichText text={instantSolution.answerSummary} /></div>
            <ReadAloudButton text={instantSolution.answerSummary} />
          </div>
          <div className="solution-steps">
            {instantSolution.steps.map((step) => (
              <div key={step.number} className="solution-step">
                <span className="step-number">{String(step.number).padStart(2, '0')}</span>
                <div>
                  <h3>{step.title}</h3>
                  <div className="step-formula"><MathFormula latex={step.latex} display /></div>
                  <RichText text={step.explanation} className="mt-2 text-sm leading-7 text-atelier-muted" />
                </div>
              </div>
            ))}
          </div>
          {instantSolution.graphConfig && <div className="mt-8"><FunctionGraphSvg graph={instantSolution.graphConfig} /></div>}
        </section>
      )}

      <section className="tool-directory" aria-labelledby="tools-title">
        <div className="directory-heading">
          <p className="eyebrow">{t("Different ways in. One way forward.")}</p>
          <h2 id="tools-title">{t("Good tools.")}<br />{t("Room to think.")}</h2>
          <p>{t("For the equation that won't click, the blank page, or the idea you want to understand a little better.")}</p>
          <Link href="/study-resources" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold">{t("Find your subject")}<ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="tool-list">
          {LEARNING_TOOLS.map((tool, index) => (
            <Link key={tool.href} href={tool.href} className="tool-link">
              <span>0{index + 1}</span>
              <div><h3>{t(tool.title)} <span className="ml-2 text-xs font-normal tracking-normal text-atelier-muted">{t(tool.detail)}</span></h3><p>{t(tool.description)}</p></div>
              <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <details className="archive-preview">
        <summary><div>{t("There's more in the study bank. ")}<span className="ml-2">{t("Explore worked problems at your own pace.")}</span></div><ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" /></summary>
        <div className="archive-rows">
          {studyBank.map((item) => (
            <Link key={item.id} href={`/solution/${item.slug || item.id}`} className="archive-row" data-testid={`study-bank-card-${item.slug}`}>
              <span>{t(item.subject)}</span><h3>{item.promptText}</h3><ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ))}
        </div>
        <Link href="/search-question" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold">{t("Browse the study bank ")}<ArrowRight className="h-4 w-4" /></Link>
      </details>

      <MathKeyboardModal
        isOpen={keyboardOpen}
        onClose={() => setKeyboardOpen(false)}
        onInsertSymbol={(symbol) => setPrompt((previous) => `${previous}${symbol}`.slice(0, 2000))}
        onBackspace={() => setPrompt((previous) => previous.slice(0, -1))}
        onSubmit={() => handleSolve()}
      />
      <ImageCropModal
        isOpen={cropModalOpen}
        onClose={() => setCropModalOpen(false)}
        onExtractedQuestion={(extracted) => {
          setSelectedSubject(extracted.subject);
          setPrompt(extracted.promptText);
          setCropBadge(extracted.cropSummary);
          handleSolve(extracted.promptText, extracted.subject);
        }}
      />
    </div>
  );
}
