'use client';

import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Play,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Send,
  Sparkles,
  Clock,
} from 'lucide-react';
import { FunctionGraphSvg } from '@/components/math/FunctionGraphSvg';
import { generateFunctionGraph } from '@/lib/math-engine/grapher';

interface CourseSlide {
  step: number;
  title: string;
  formula: string;
  content: string;
  interactiveGraph?: string;
}

interface AcademyCourseItem {
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

export default function AcademyCoursePage() {
  const [courses, setCourses] = useState<AcademyCourseItem[]>([]);
  const [activeCourse, setActiveCourse] = useState<AcademyCourseItem | null>(
    null
  );
  const [slideIndex, setSlideIndex] = useState(0);
  const [tutorQuestion, setTutorQuestion] = useState('');
  const [tutorReply, setTutorReply] = useState<string | null>(null);
  const [askingTutor, setAskingTutor] = useState(false);

  useEffect(() => {
    fetch('/api/courses')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.courses) && data.courses.length > 0) {
          setCourses(data.courses);
          setActiveCourse(data.courses[0]);
        }
      })
      .catch(() => {});
  }, []);

  const currentSlide = activeCourse?.slides?.[slideIndex] || null;
  const graphData = currentSlide?.interactiveGraph
    ? generateFunctionGraph(currentSlide.interactiveGraph, {
        xMin: -5,
        xMax: 5,
      })
    : null;

  const handleAskCourseTutor = async () => {
    if (!activeCourse || !tutorQuestion.trim()) return;
    setAskingTutor(true);
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: activeCourse.slug,
          question: tutorQuestion,
          slideIndex,
          slideTitle: currentSlide?.title,
          slideFormula: currentSlide?.formula,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setTutorReply(data.reply);
      }
    } finally {
      setAskingTutor(false);
    }
  };

  return (
    <div
      className="mx-auto max-w-6xl px-4 py-8 sm:px-8"
      data-testid="academy-course-page"
    >
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 p-6 text-white shadow-xl sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-rose-300">
          <GraduationCap className="h-3.5 w-3.5" />
          <span>GAUTH ACADEMY · 15-MINUTE INTERACTIVE VISUAL COURSES</span>
        </div>
        <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">
          Master Any STEM Concept in 15 Minutes with Interactive Visuals
        </h1>
        <p className="mt-2 max-w-2xl text-xs text-slate-300 sm:text-sm">
          Step through animated mathematical derivations, live 2D function plots, and ask the embedded AI Course Tutor questions at any slide.
        </p>
      </div>

      {/* Course Selector Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {courses.map((course) => {
          const active = activeCourse?.slug === course.slug;
          return (
            <button
              key={course.slug}
              type="button"
              onClick={() => {
                setActiveCourse(course);
                setSlideIndex(0);
                setTutorReply(null);
              }}
              data-testid={`academy-course-card-${course.slug}`}
              className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition ${
                active
                  ? 'border-[#FF4B4B] bg-rose-50/40 shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[#FF4B4B]">
                    {course.category}
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Clock className="h-3 w-3" />
                    {Math.round(course.durationSec / 60)} min
                  </span>
                </div>
                <h3 className="mt-2.5 text-sm font-extrabold text-slate-900">
                  {course.title}
                </h3>
                <p className="mt-1 text-[11px] text-slate-500">
                  {course.subCategory}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] font-bold text-[#FF4B4B]">
                <span>{course.slides.length} Interactive Slides</span>
                <Play className="h-3.5 w-3.5" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Interactive Course Slide Player */}
      {activeCourse && currentSlide && (
        <div
          className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
          data-testid="academy-slide-player"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#FF4B4B]">
                {activeCourse.category} · Slide {slideIndex + 1} of{' '}
                {activeCourse.slides.length}
              </span>
              <h2
                className="mt-1 text-xl font-black text-slate-900"
                data-testid="academy-slide-title"
              >
                {currentSlide.title}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={slideIndex === 0}
                onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
                data-testid="academy-prev-slide-btn"
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                type="button"
                disabled={slideIndex >= activeCourse.slides.length - 1}
                onClick={() =>
                  setSlideIndex((i) =>
                    Math.min(activeCourse.slides.length - 1, i + 1)
                  )
                }
                data-testid="academy-next-slide-btn"
                className="inline-flex items-center gap-1 rounded-xl bg-[#FF4B4B] px-4 py-2 text-xs font-bold text-white hover:bg-rose-600 disabled:opacity-40"
              >
                Next Slide
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left: Formula & Pedagogical Narrative */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                  Core Mathematical Law
                </div>
                <div className="mt-1.5 overflow-x-auto font-mono text-sm font-bold text-indigo-950">
                  {currentSlide.formula}
                </div>
              </div>

              <p className="text-sm leading-relaxed text-slate-700">
                {currentSlide.content}
              </p>

              {/* Embedded Slide AI Tutor Box */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
                  <MessageSquare className="h-4 w-4 text-[#FF4B4B]" />
                  <span>Ask Gauth Course Tutor about this slide</span>
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  <input
                    type="text"
                    value={tutorQuestion}
                    onChange={(e) => setTutorQuestion(e.target.value)}
                    placeholder="e.g. Why do higher powers of h vanish in the limit?"
                    data-testid="academy-tutor-input"
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#FF4B4B] focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAskCourseTutor}
                    disabled={askingTutor}
                    data-testid="academy-tutor-ask-btn"
                    className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{askingTutor ? '...' : 'Ask'}</span>
                  </button>
                </div>

                {tutorReply && (
                  <div
                    className="mt-3 rounded-xl border border-emerald-200 bg-white p-3 text-xs leading-relaxed text-slate-700"
                    data-testid="academy-tutor-reply"
                  >
                    <span className="mr-1.5 inline-flex items-center gap-1 font-bold text-emerald-700">
                      <Sparkles className="h-3 w-3" />
                      Course Tutor:
                    </span>
                    {tutorReply}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Interactive 2D Simulation Graph */}
            <div>
              {graphData && (
                <FunctionGraphSvg
                  graph={graphData}
                  accentColor={activeCourse.simulationType || '#FF4B4B'}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
