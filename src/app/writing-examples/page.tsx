'use client';

import React, { useState, useEffect } from 'react';
import {
  PenTool,
  Sparkles,
  CheckCircle2,
  FileText,
  Award,
} from 'lucide-react';

interface AnnotationItem {
  paragraph: number;
  type: string;
  badge: string;
  comment: string;
}

interface WritingDoc {
  id: string;
  slug: string;
  title: string;
  genre: string;
  gradeLevel: string;
  wordCount: number;
  contentText: string;
  aiScore: number;
  annotations: AnnotationItem[];
}

export default function WritingExamplesPage() {
  const [docs, setDocs] = useState<WritingDoc[]>([]);
  const [activeDoc, setActiveDoc] = useState<WritingDoc | null>(null);
  const [selectedGenre, setSelectedGenre] = useState('All');

  // Interactive Essay Grader / Co-Writer state
  const [customTitle, setCustomTitle] = useState('');
  const [customGenre, setCustomGenre] = useState('Argumentative Essay');
  const [customContent, setCustomContent] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetch('/api/writing')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.documents) && data.documents.length > 0) {
          setDocs(data.documents);
          setActiveDoc(data.documents[0]);
        }
      })
      .catch(() => {});
  }, []);

  const genres = [
    'All',
    'Argumentative Essay',
    'Research Paper',
    'College Application Essay',
  ];

  const filtered =
    selectedGenre === 'All'
      ? docs
      : docs.filter((d) => d.genre === selectedGenre);

  const handleAnalyzeEssay = async (action: 'grade' | 'polish' | 'outline') => {
    const contentToUse =
      customContent.trim() ||
      'Artificial intelligence diagnostic assistants improve clinical accuracy when paired with demographic calibration audits and physician oversight.';
    const titleToUse =
      customTitle.trim() || 'AI Governance in Modern Clinical Diagnostics';

    setAnalyzing(true);
    try {
      const res = await fetch('/api/writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titleToUse,
          genre: customGenre,
          content: contentToUse,
          action,
        }),
      });
      const data = await res.json();
      if (data.ok && data.document) {
        setDocs((prev) => [data.document, ...prev]);
        setActiveDoc(data.document);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div
      className="mx-auto max-w-6xl px-4 py-8 sm:px-8"
      data-testid="writing-examples-page"
    >
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-6 text-white shadow-xl sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-emerald-300">
          <PenTool className="h-3.5 w-3.5" />
          <span>GAUTH AI WRITING HELPER · RUBRIC GRADER & ANNOTATED EXEMPLARS</span>
        </div>
        <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">
          A+ Annotated Essay Examples & AI Writing Co-Pilot
        </h1>
        <p className="mt-2 max-w-2xl text-xs text-slate-300 sm:text-sm">
          Inspect paragraph-by-paragraph rhetorical annotations on university-level essays, or paste your draft for instant 4-dimension rubric scoring.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {genres.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setSelectedGenre(g)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                selectedGenre === g
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 4 Columns: Curated Essay List + AI Draft Evaluator */}
        <div className="space-y-6 lg:col-span-4">
          <div className="space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Curated & Graded Essays ({filtered.length})
            </h2>
            {filtered.map((doc) => {
              const active = activeDoc?.id === doc.id;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setActiveDoc(doc)}
                  data-testid={`writing-doc-card-${doc.slug}`}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    active
                      ? 'border-emerald-500 bg-emerald-50/40 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-emerald-800">
                      {doc.genre}
                    </span>
                    <span className="font-mono font-extrabold text-emerald-700">
                      Score: {doc.aiScore}/100
                    </span>
                  </div>
                  <h3 className="mt-2 text-sm font-extrabold text-slate-900">
                    {doc.title}
                  </h3>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {doc.wordCount} words · {doc.gradeLevel}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Interactive AI Essay Grader & Outline Generator Card */}
          <div
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs"
            data-testid="ai-essay-grader-card"
          >
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
              <Sparkles className="h-4 w-4 text-[#FF4B4B]" />
              Grade or Outline Your Own Essay
            </h3>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Essay Title or Prompt..."
              data-testid="writing-title-input"
              className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
            />
            <select
              value={customGenre}
              onChange={(e) => setCustomGenre(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
            >
              <option value="Argumentative Essay">Argumentative Essay</option>
              <option value="Research Paper">Research Paper</option>
              <option value="College Application Essay">
                College Application Essay
              </option>
            </select>
            <textarea
              value={customContent}
              onChange={(e) => setCustomContent(e.target.value)}
              placeholder="Paste your essay paragraphs here for instant rubric grading & academic polish..."
              rows={4}
              data-testid="writing-content-input"
              className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => handleAnalyzeEssay('grade')}
                disabled={analyzing}
                data-testid="writing-grade-btn"
                className="flex-1 rounded-xl bg-slate-900 py-2.5 text-xs font-extrabold text-white hover:bg-slate-800"
              >
                {analyzing ? 'Grading...' : 'Grade & Annotate'}
              </button>
              <button
                type="button"
                onClick={() => handleAnalyzeEssay('outline')}
                disabled={analyzing}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Outline
              </button>
            </div>
          </div>
        </div>

        {/* Right 8 Columns: Annotated Essay Reader */}
        <div className="lg:col-span-8">
          {activeDoc && (
            <div
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8"
              data-testid="writing-active-reader"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-700">
                    {activeDoc.genre} · {activeDoc.gradeLevel}
                  </span>
                  <h2
                    className="mt-2 text-xl font-black text-slate-900 sm:text-2xl"
                    data-testid="writing-reader-title"
                  >
                    {activeDoc.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
                  <Award className="h-5 w-5 text-emerald-600" />
                  <div>
                    <div className="text-[10px] font-bold uppercase text-emerald-700">
                      Gauth AI Rubric Score
                    </div>
                    <div
                      className="font-mono text-lg font-black text-emerald-950"
                      data-testid="writing-reader-score"
                    >
                      {activeDoc.aiScore} / 100
                    </div>
                  </div>
                </div>
              </div>

              {/* Essay Paragraphs */}
              <div className="mt-6 space-y-4">
                {activeDoc.contentText
                  .split(/\n\n+/)
                  .filter(Boolean)
                  .map((para, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-sm leading-relaxed text-slate-800"
                    >
                      <span className="mr-2 rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                        ¶{idx + 1}
                      </span>
                      {para}
                    </div>
                  ))}
              </div>

              {/* Structural & Rhetorical Annotations */}
              <div className="mt-6 border-t border-slate-100 pt-5">
                <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  Instructor & AI Rhetorical Annotations
                </h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {activeDoc.annotations.map((ann, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4"
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-emerald-900">
                          Paragraph {ann.paragraph}: {ann.type}
                        </span>
                        <span className=" inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] text-white">
                          <CheckCircle2 className="h-3 w-3" />
                          {ann.badge}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                        {ann.comment}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
