'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, BookOpen, ArrowRight, ShieldCheck, Bookmark } from 'lucide-react';
import { GAUTH_SUBJECTS } from '@/components/layout/AppShell';

export default function SearchQuestionPage() {
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('All');
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [questions, setQuestions] = useState<
    Array<{
      id: string;
      slug: string;
      subject: string;
      topic: string;
      promptText: string;
      answerSummary: string;
      isBookmarked: boolean;
    }>
  >([]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (subject !== 'All') params.set('subject', subject);
    if (query.trim()) params.set('q', query.trim());
    if (bookmarkedOnly) params.set('bookmarked', '1');

    fetch(`/api/questions?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.questions)) {
          setQuestions(data.questions);
        }
      })
      .catch(() => {});
  }, [query, subject, bookmarkedOnly]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8" data-testid="search-question-page">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
            Verified Homework Study Bank & Question Search
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Search step-by-step verified solutions across all 12 subjects or filter your bookmarked problems
          </p>
        </div>

        <button
          type="button"
          onClick={() => setBookmarkedOnly(!bookmarkedOnly)}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
            bookmarkedOnly
              ? 'border-amber-400 bg-amber-50 text-amber-800'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Bookmark className="h-3.5 w-3.5" />
          <span>{bookmarkedOnly ? 'Showing Bookmarked Only' : 'Filter Bookmarked'}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="mt-6 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
        <Search className="h-5 w-5 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search equations, calculus derivatives, physics laws, chemistry pH, or keywords..."
          data-testid="study-bank-search-input"
          className="w-full border-0 bg-transparent text-sm text-slate-900 focus:outline-hidden"
        />
      </div>

      {/* Subject Filter Pills */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {['All', ...GAUTH_SUBJECTS].map((subj) => (
          <button
            key={subj}
            type="button"
            onClick={() => setSubject(subj)}
            className={`rounded-full px-3 py-1 text-xs font-bold transition ${
              subject === subj
                ? 'bg-[#FF4B4B] text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {subj}
          </button>
        ))}
      </div>

      {/* Results Grid */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {questions.map((q) => (
          <Link
            key={q.id}
            href={`/solution/${q.slug || q.id}`}
            className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:border-rose-300 hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-lg bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-[#FF4B4B]">
                  {q.subject}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  99.8% Verified
                </span>
              </div>
              <h2 className="mt-3 font-mono text-sm font-bold text-slate-900 group-hover:text-[#FF4B4B]">
                {q.promptText}
              </h2>
              <p className="mt-1 text-xs text-slate-500">{q.topic}</p>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
              <span className="truncate font-mono font-semibold text-slate-700">
                Ans: {q.answerSummary}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#FF4B4B]" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
