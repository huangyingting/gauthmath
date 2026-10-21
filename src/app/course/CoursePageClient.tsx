'use client';

import { useI18n } from '@/components/i18n/LanguageProvider';
import React, { useState, useLayoutEffect } from 'react';
import {
  GraduationCap,
  Play,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { FunctionGraphSvg } from '@/components/math/FunctionGraphSvg';
import { MathFormula } from '@/components/ui/MathFormula';
import { RichText } from '@/components/ui/RichText';
import { ContentTutor } from '@/components/ui/ContentTutor';
import { ReadAloudButton } from '@/components/ui/VoiceControls';
import { generateFunctionGraph } from '@/lib/math-engine/grapher';

interface CourseSlide {
  step: number;
  title: string;
  formula: string;
  content: string;
  interactiveGraph?: string;
}

export interface AcademyCourseItem {
  id: string;
  slug: string;
  title: string;
  category: string;
  subCategory: string;
  summary: string;
  durationSec: number;
  viewsCount: number;
  simulationType: string;
  slides: CourseSlide[];
}

export default function AcademyCoursePage({ courses }: { courses: AcademyCourseItem[] }) {
  const { t } = useI18n();
  const [activeCourse, setActiveCourse] = useState<AcademyCourseItem | null>(
    courses[0] || null
  );
  const [slideIndex, setSlideIndex] = useState(0);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem('tavi-course-progress') || '{}');
      if (!saved || typeof saved !== 'object' || Array.isArray(saved) || !Object.values(saved).every(value => Number.isInteger(value) && Number(value) >= 0)) throw new Error('Invalid saved progress.');
      const positions = saved as Record<string, number>;
      setProgress(positions);
      if (courses[0]) setSlideIndex(Math.min(positions[courses[0].slug] || 0, Math.max(0, courses[0].slides.length - 1)));
    } catch { setError('Your lesson position could not be restored on this device.'); }
  }, []);

  const currentSlide = activeCourse?.slides?.[slideIndex] || null;
  const graphData = currentSlide?.interactiveGraph
    ? generateFunctionGraph(currentSlide.interactiveGraph, {
        xMin: -5,
        xMax: 5,
      })
    : null;

  const changeSlide = (index: number) => {
    if (!activeCourse) return;
    setSlideIndex(index);
    const updated = { ...progress, [activeCourse.slug]: index };
    setProgress(updated);
    try {
      localStorage.setItem('tavi-course-progress', JSON.stringify(updated));
    } catch { setError('Your lesson position could not be saved on this device.'); }
  };

  return (
    <div
      className="page-container"
      data-testid="academy-course-page"
    >
      {/* Header Banner */}
      <div className="page-heading">
        <div className="eyebrow flex items-center gap-2 text-atelier-vermilion">
          <GraduationCap className="h-3.5 w-3.5" />
          <span>{t("The academy / Small lessons, bigger understanding")}</span>
        </div>
        {error && <p role="alert" className="mb-4 text-sm text-rose-800">{t(error)}</p>}
        <h1>{t("One idea. A little deeper.")}</h1>
        <p className="mt-4 text-atelier-muted">{t("Find your own pace with short, focused lessons. See a concept take shape, and ask questions along the way.")}</p>
      </div>

      {/* Course Selector Cards */}
      <details className="mb-6 rounded-lg border border-atelier-border p-4">
        <summary className="flex items-center justify-between gap-4 text-sm">
          <span><span className="mr-3 text-atelier-muted">{t("Your course")}</span>{activeCourse?.title || t('Choose a lesson')}</span>
          <span className="shrink-0 text-xs text-atelier-vermilion">{t("Change course")}</span>
        </summary>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {courses.map((course) => {
          const active = activeCourse?.slug === course.slug;
          return (
            <button
              key={course.slug}
              type="button"
              onClick={() => {
                setActiveCourse(course);
                setSlideIndex(Math.min(progress[course.slug] || 0, course.slides.length - 1));
              }}
              data-testid={`academy-course-card-${course.slug}`}
              aria-pressed={active}
              className={`flex flex-col justify-between rounded-lg border p-5 text-left transition ${
                active
                  ? 'border-atelier-vermilion bg-atelier-lilac'
                  : 'border-atelier-border hover:bg-atelier-subtle'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-atelier-vermilion">
                    {t(course.category)}
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Clock className="h-3 w-3" />
                    {t('{duration} min', { duration: Math.round(course.durationSec / 60) })}</span>
                </div>
                <h3 className="mt-2.5 text-sm font-extrabold text-slate-900">
                  {course.title}
                </h3>
                <p className="mt-1 text-[11px] text-slate-500">
                  {course.subCategory}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-atelier-border pt-3 text-xs text-atelier-vermilion">
                <span>{course.slides.length}{t(" Interactive Slides")}</span>
                <Play className="h-3.5 w-3.5" />
              </div>
            </button>
          );
        })}
      </div>
      </details>

      {/* Interactive Course Slide Player */}
      {activeCourse && currentSlide && (
        <div
          className="paper-panel p-5 sm:p-6"
          data-testid="academy-slide-player"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="eyebrow text-atelier-vermilion">
                {t(activeCourse.category)} · {t('Slide {current} of {total}', { current: slideIndex + 1, total: activeCourse.slides.length })}
              </span>
              <h2
                className="mt-3 text-2xl font-semibold text-atelier-ink"
                data-testid="academy-slide-title"
              >
                {currentSlide.title}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={slideIndex === 0}
                onClick={() => changeSlide(Math.max(0, slideIndex - 1))}
                data-testid="academy-prev-slide-btn"
                className="secondary-button disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />{t("Previous")}</button>
              <button
                type="button"
                disabled={slideIndex >= activeCourse.slides.length - 1}
                onClick={() =>
                  changeSlide(Math.min(activeCourse.slides.length - 1, slideIndex + 1))
                }
                data-testid="academy-next-slide-btn"
                className="primary-button disabled:opacity-40"
              >{t("Next Slide")}<ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-atelier-muted">
              <progress className="h-1 w-32 accent-atelier-vermilion" aria-label={t('Lesson position')} value={slideIndex + 1} max={activeCourse.slides.length} />
              <span>{t('Resume where you left off on this device.')}</span>
              <ReadAloudButton text={`${currentSlide.title}. ${currentSlide.content}`} />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left: Formula & Pedagogical Narrative */}
            <div className="min-w-0 space-y-4">
              <div className="rounded-lg bg-atelier-lilac p-4">
                <div className="eyebrow text-atelier-vermilion">{t("Core Mathematical Law")}</div>
                <div className="mt-2 text-base text-atelier-ink">
                  <MathFormula latex={currentSlide.formula} display />
                </div>
              </div>

              <RichText text={currentSlide.content} className="text-base leading-7 text-atelier-muted" />

              {/* Embedded Slide AI Tutor Box */}
              <ContentTutor key={`${activeCourse.slug}:${slideIndex}`} endpoint="/api/courses"
                context={{ slug: activeCourse.slug, slideIndex }} title="Want to go a little deeper?"
                placeholder="Ask about this lesson" testPrefix="academy"
                citation={`${activeCourse.title} / ${currentSlide.title}`} />
            </div>

            {/* Right: Interactive 2D Simulation Graph */}
            <div>
              {graphData && (
                <FunctionGraphSvg
                  graph={graphData}
                  accentColor={activeCourse.simulationType || '#6A496B'}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
