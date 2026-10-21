'use client';

import { useI18n } from '@/components/i18n/LanguageProvider';
import { RichText } from '@/components/ui/RichText';
import { ContentTutor } from '@/components/ui/ContentTutor';
import { ReadAloudButton } from '@/components/ui/VoiceControls';
import React, { useState } from 'react';
import {
  Compass,
  Eye,
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

export interface AtlasStoryItem {
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

export default function AtlasPage({ stories }: { stories: AtlasStoryItem[] }) {
  const { t } = useI18n();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeStory, setActiveStory] = useState<AtlasStoryItem | null>(stories[0] || null);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(
    null
  );

  const categories = ['All', 'Physics', 'Biology', 'Math', 'Social Science'];
  const filtered =
    selectedCategory === 'All'
      ? stories
      : stories.filter((s) => s.category === selectedCategory);

  return (
    <div
      className="page-container"
      data-testid="atlas-page"
    >
      {/* Hero */}
      <div className="page-heading">
        <div className="eyebrow flex items-center gap-2 text-atelier-vermilion">
          <Compass className="h-3.5 w-3.5" />
          <span>{t("Atlas / Follow a bigger idea")}</span>
        </div>
        <h1>{t("A world of “oh, now I see.”")}</h1>
        <p className="mt-4 text-atelier-muted">{t("Take the scenic route through science, history, and the ideas that connect them.")}</p>

        {/* Category Filter Pills */}
        <div className="filter-tabs mt-7">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              aria-pressed={selectedCategory === cat}
            >
              {t(cat)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 4 Columns: Story Cards List */}
        <div className="space-y-3 lg:col-span-4">
          <h2 className="eyebrow mb-5 text-atelier-muted">          {t('Pick a thread ({count})', { count: filtered.length })}
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
                aria-pressed={isSelected}
                className={`w-full rounded-lg p-5 text-left transition ${
                  isSelected
                    ? 'bg-atelier-lilac'
                    : 'hover:bg-atelier-subtle'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-atelier-vermilion">
                    {t(story.category)}
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Eye className="h-3 w-3" />
                    {story.viewsCount.toLocaleString()}
                  </span>
                </div>
                <h3 className="mt-3 text-base font-semibold text-atelier-ink">
                  {story.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm text-atelier-muted">
                  {story.summary}
                </p>
              </button>
            );
          })}
        </div>

        {/* Right 8 Columns: Interactive Story Reader & Quiz */}
        <div className="min-w-0 lg:col-span-8">
          {activeStory && (
            <div
              className="paper-panel overflow-hidden"
              data-testid="atlas-active-reader"
            >
              {/* Story Visual Header */}
              <div
                className="bg-atelier-lilac p-5 text-atelier-ink sm:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-atelier-muted">
                  <span>{t(activeStory.category)}{t(" · Visual Deep Dive")}</span>
                  <span>{activeStory.viewsCount.toLocaleString()}{t(" Learners")}</span>
                </div>
                <h2
                  className="mt-5 text-2xl font-semibold sm:text-3xl"
                  data-testid="atlas-reader-title"
                >
                  {activeStory.title}
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-atelier-muted">
                  {activeStory.summary}
                </p>
                <ReadAloudButton text={`${activeStory.title}. ${activeStory.summary}`} />
              </div>

              {/* Chapters Breakdown */}
              <div className="space-y-6 p-5 sm:p-6">
                {activeStory.chapters.map((ch) => (
                  <div
                    key={ch.number}
                    className="border-b border-atelier-border pb-6"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="mr-2 text-xs text-atelier-muted">
                        0{ch.number}
                      </span>
                      <h3 className="text-lg font-semibold text-atelier-ink">
                        {ch.heading}
                      </h3>
                    </div>
                    <RichText text={ch.body} className="mt-4 text-base leading-7 text-atelier-muted" />
                    <div className="mt-5 inline-flex items-center gap-2 rounded-md bg-atelier-subtle px-3.5 py-2 text-xs font-medium text-atelier-ink">
                      <Sparkles className="h-3.5 w-3.5 text-atelier-vermilion" />
                      <span>{t("Key Metric: ")}{ch.statCallout}</span>
                    </div>
                  </div>
                ))}

                {/* Interactive Mastery Quiz */}
                {activeStory.quiz && activeStory.quiz.question && (
                  <div
                    className="rounded-xl bg-atelier-lilac p-6"
                    data-testid="atlas-interactive-quiz"
                  >
                    <div className="eyebrow flex items-center gap-2 text-atelier-vermilion">
                      <Award className="h-4 w-4" />
                      <span>{t("Interactive Concept Check")}</span>
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
                            disabled={selectedQuizOption !== null}
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
                        <strong className="text-emerald-700">{t("Explanation:")}{' '}
                        </strong>
                        <RichText text={activeStory.quiz.explanation} />
                        <button type="button" className="text-button mt-3" data-testid="atlas-quiz-retry"
                          onClick={() => setSelectedQuizOption(null)}>{t('Try the quiz again')}</button>
                      </div>
                    )}
                    <ContentTutor key={activeStory.slug} endpoint="/api/atlas" context={{ action: 'ask_concept', slug: activeStory.slug }}
                      title="Ask about this story" placeholder="What would you like to understand?" testPrefix="atlas" citation={activeStory.title} />
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
