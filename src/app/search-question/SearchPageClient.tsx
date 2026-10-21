'use client';

import { useI18n } from '@/components/i18n/LanguageProvider';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, ArrowRight, Bookmark } from 'lucide-react';
import { TAVI_SUBJECTS } from '@/components/layout/AppShell';
import { RichText } from '@/components/ui/RichText';
import type { QuestionSummary } from '@/lib/page-data';
import { Select } from '@/components/ui/Select';

export default function SearchQuestionPage({ initialQuestions }: { initialQuestions: QuestionSummary[] }) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('All');
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [practice, setPractice] = useState(false);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState(initialQuestions);

  useEffect(() => {
    if (subject === 'All' && !query.trim() && !bookmarkedOnly) {
      setQuestions(initialQuestions);
      setError(null);
      return;
    }
    const params = new URLSearchParams();
    if (subject !== 'All') params.set('subject', subject);
    if (query.trim()) params.set('q', query.trim());
    if (bookmarkedOnly) params.set('bookmarked', '1');

    const controller = new AbortController();
    setError(null);
    fetch(`/api/questions?${params.toString()}`, { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error('The study bank could not be loaded. Please try again.'); return r.json(); })
      .then((data) => {
        if (Array.isArray(data?.questions)) {
          setQuestions(data.questions);
        }
      })
      .catch(() => { if (!controller.signal.aborted) setError('The study bank could not be loaded. Please try again.'); });
    return () => controller.abort();
  }, [query, subject, bookmarkedOnly, initialQuestions]);

  return (
    <div
      className="page-container"
      data-testid="search-question-page"
    >
      {/* Header */}
      <div className="page-heading">
        <div>
          <p className="eyebrow text-atelier-vermilion">{t("The study bank / Ideas worth coming back to")}</p>
          <h1>{t("A good place to find your way.")}</h1>
          <p className="mt-4 max-w-xl text-atelier-muted">{t("Browse worked problems, revisit a saved question, or follow a new thread of curiosity.")}</p>
        </div>

      </div>

      {/* Primary Search Bar (Composite Container — Single Clean Outline) */}
      <div className="lumina-composer-well flex items-center gap-3 px-5 py-4">
        <Search className="h-5 w-5 shrink-0 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t("Search the study bank")}
          placeholder={t("An equation, a concept, a question...")}
          data-testid="study-bank-search-input"
          className="w-full border-0 bg-transparent text-base text-atelier-obsidian placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label htmlFor="study-bank-subject" className="text-sm text-atelier-muted">{t("Look through")}</label>
          <Select id="study-bank-subject" value={subject} onValueChange={setSubject}
            options={['All', ...TAVI_SUBJECTS].map(item => ({ value: item, label: item === 'All' ? t('All subjects') : t(item) }))} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="secondary-button" data-testid="study-practice-toggle" aria-pressed={practice}
          onClick={() => { setPractice(!practice); setRevealed([]); }}>{t(practice ? 'Practice mode on' : 'Practice without answers')}</button>
        <button type="button" onClick={() => setBookmarkedOnly(!bookmarkedOnly)} aria-pressed={bookmarkedOnly} className={`text-button ${bookmarkedOnly ? 'bg-atelier-lilac' : ''}`}>
          <Bookmark className="h-4 w-4" />
          {bookmarkedOnly ? t('Showing saved problems') : t('Saved problems')}
        </button>
        </div>
      </div>
      {practice && <p className="mt-3 text-xs text-atelier-muted">{t('Try each problem on paper first. Reveal the answer only when you are ready to compare.')}</p>}
      {error && <p className="mt-3 text-sm text-rose-800" role="alert">{t(error)}</p>}

      {/* Results Grid */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {questions.map((q) => (
          <article
            key={q.id}
            data-testid="study-question-card"
            className="lumina-card group flex flex-col justify-between p-5 transition-colors hover:border-atelier-vermilion"
          >
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500">
                  {t(q.subject)}
                </span>
                {q.isBookmarked && <Bookmark className="h-3.5 w-3.5 text-atelier-vermilion" aria-label={t('Bookmarked')} />}
              </div>
              <h2 className="mt-3.5 font-mono text-base font-bold text-atelier-obsidian group-hover:text-atelier-vermilion">
                <Link href={`/solution/${q.slug || q.id}`}>{q.promptText}</Link>
              </h2>
              <p className="mt-1.5 text-xs text-slate-400">{q.topic}</p>
            </div>

            <div className="mt-4 rounded-lg bg-atelier-subtle/60 px-4 py-3 text-sm">
              {practice && !revealed.includes(q.id)
                ? <button type="button" className="text-button" data-testid="study-reveal-answer" onClick={() => setRevealed(previous => [...previous, q.id])}>{t('Reveal answer')}</button>
                : <div data-testid="study-answer"><RichText text={q.answerSummary} /></div>}
              {(!practice || revealed.includes(q.id)) && <Link href={`/solution/${q.slug || q.id}`} className="mt-3 inline-flex items-center gap-2 text-xs text-atelier-vermilion">{t('Understand the steps')}<ArrowRight className="h-3 w-3" /></Link>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
