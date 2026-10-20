import React from 'react';
import { ShieldAlert, CheckCircle2, BookOpen } from 'lucide-react';

export default function HonorCodePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8" data-testid="honor-page">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
          <ShieldAlert className="h-4 w-4" />
          <span>GAUTH ACADEMIC INTEGRITY & HONOR CODE</span>
        </div>
        <h1 className="mt-3 text-3xl font-black text-slate-900">
          Learn the Steps, Master the Concept—Never Plagiarize
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Gauth is designed to teach underlying mathematical and scientific reasoning through step-by-step explanations, interactive graphs, and follow-up tutoring—not to bypass academic assessments.
        </p>

        <div className="mt-6 space-y-3">
          {[
            'Use Gauth step-by-step derivations to check your own homework and understand where your reasoning diverged.',
            'Do not submit live exam, quiz, or closed-book assessment questions.',
            'Use Gauth Writing Helper annotations and outlines as structural study guides to improve your own original prose.',
          ].map((rule, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs leading-relaxed text-slate-700"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
