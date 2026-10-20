'use client';

import React, { useState, useEffect } from 'react';
import {
  Compass,
  Eye,
  BookOpen,
  CheckCircle2,
  Sparkles,
  Award,
} from 'lucide-react';

interface AtlasChapter {
  number: number;
  heading: string;
  body: string;
  statCallout: string;
}

interface AtlasQuiz {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface AtlasStoryItem {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  visualTheme: string;
  viewsCount: number;
  chapters: AtlasChapter[];
  quiz: AtlasQuiz;
}

export default function AtlasPage() {
  const [stories, setStories] = useState<AtlasStoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeStory, setActiveStory] = useState<AtlasStoryItem | null>(null);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(
    null
  );

  useEffect(() => {
    fetch('/api/atlas')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.stories) && data.stories.length > 0) {
          setStories(data.stories);
          setActiveStory(data.stories[0]);
        }
      })
      .catch(() => {});
  }, []);

  const categories = ['All', 'Physics', 'Biology', 'Math', 'Social Science'];
  const filtered =
    selectedCategory === 'All'
      ? stories
      : stories.filter((s) => s.category === selectedCategory);

  return (
    <div
      className="mx-auto max-w-6xl px-4 py-8 sm:px-8"
      data-testid="atlas-page"
    >
      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-indigo-300">
          <Compass className="h-3.5 w-3.5" />
          <span>GAUTH ATLAS · INTERACTIVE VISUAL KNOWLEDGE ENCYCLOPEDIA</span>
        </div>
        <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">
          See How Complex Science & History Actually Work
        </h1>
        <p className="mt-2 max-w-2xl text-xs text-slate-300 sm:text-sm">
          Explore multi-chapter visual investigations with quantitative callouts and interactive mastery quizzes.
        </p>

        {/* Category Filter Pills */}
        <div className="mt-5 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                selectedCategory === cat
                  ? 'bg-[#FF4B4B] text-white'
                  : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 4 Columns: Story Cards List */}
        <div className="space-y-3 lg:col-span-4">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Featured Visual Investigations ({filtered.length})
          </h2>
          {filtered.map((story) => {
            const isSelected = activeStory?.slug === story.slug;
            return (
              <button
                key={story.slug}
                type="button"
                onClick={() => {
                  setActiveStory(story);
                  setSelectedQuizOption(null);
                }}
                data-testid={`atlas-story-card-${story.slug}`}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-indigo-700">
                    {story.category}
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Eye className="h-3 w-3" />
                    {story.viewsCount.toLocaleString()}
                  </span>
                </div>
                <h3 className="mt-2 text-sm font-extrabold text-slate-900">
                  {story.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                  {story.summary}
                </p>
              </button>
            );
          })}
        </div>

        {/* Right 8 Columns: Interactive Story Reader & Quiz */}
        <div className="lg:col-span-8">
          {activeStory && (
            <div
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              data-testid="atlas-active-reader"
            >
              {/* Story Visual Header */}
              <div
                className={`bg-gradient-to-r ${activeStory.visualTheme || 'from-indigo-600 to-purple-600'} p-6 text-white sm:p-8`}
              >
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-white/80">
                  <span>{activeStory.category} · Visual Deep Dive</span>
                  <span>{activeStory.viewsCount.toLocaleString()} Learners</span>
                </div>
                <h2
                  className="mt-2 text-xl font-black sm:text-2xl"
                  data-testid="atlas-reader-title"
                >
                  {activeStory.title}
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-white/90 sm:text-sm">
                  {activeStory.summary}
                </p>
              </div>

              {/* Chapters Breakdown */}
              <div className="space-y-5 p-6 sm:p-8">
                {activeStory.chapters.map((ch) => (
                  <div
                    key={ch.number}
                    className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-5"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900 text-xs font-extrabold text-white">
                        0{ch.number}
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900">
                        {ch.heading}
                      </h3>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-slate-700 sm:text-sm">
                      {ch.body}
                    </p>
                    <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-extrabold text-indigo-800">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Key Metric: {ch.statCallout}</span>
                    </div>
                  </div>
                ))}

                {/* Interactive Mastery Quiz */}
                {activeStory.quiz && activeStory.quiz.question && (
                  <div
                    className="mt-6 rounded-3xl border-2 border-indigo-100 bg-indigo-50/40 p-6"
                    data-testid="atlas-interactive-quiz"
                  >
                    <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-indigo-700">
                      <Award className="h-4 w-4" />
                      <span>Interactive Concept Check</span>
                    </div>
                    <h4 className="mt-2 text-sm font-extrabold text-slate-900 sm:text-base">
                      {activeStory.quiz.question}
                    </h4>

                    <div className="mt-4 space-y-2">
                      {activeStory.quiz.options.map((opt, idx) => {
                        const isPicked = selectedQuizOption === idx;
                        const isCorrect = idx === activeStory.quiz.correctIndex;
                        let style =
                          'border-slate-200 bg-white text-slate-800 hover:border-indigo-300';
                        if (selectedQuizOption !== null) {
                          if (isCorrect) {
                            style =
                              'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold';
                          } else if (isPicked) {
                            style =
                              'border-rose-400 bg-rose-50 text-rose-800';
                          }
                        }

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedQuizOption(idx)}
                            data-testid={`atlas-quiz-option-${idx}`}
                            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-xs transition ${style}`}
                          >
                            <span>{opt}</span>
                            {selectedQuizOption !== null && isCorrect && (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {selectedQuizOption !== null && (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-3.5 text-xs text-slate-700">
                        <strong className="text-emerald-700">
                          Verified Explanation:{' '}
                        </strong>
                        {activeStory.quiz.explanation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
