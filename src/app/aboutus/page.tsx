import React from 'react';
import { Globe, Users, Award, ShieldCheck } from 'lucide-react';

export default function AboutUsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8" data-testid="aboutus-page">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs">
        <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-extrabold text-[#FF4B4B]">
          ABOUT GAUTH
        </span>
        <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
          Democratizing Personalized STEM & Humanities Education Worldwide
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Gauth combines neuro-symbolic AI, exact Computer Algebra Systems (CAS), interactive 3D/2D visual pedagogy, and 50,000+ verified human experts so every learner has a world-class tutor on demand.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { icon: Users, stat: '300M+', label: 'Global Students Served' },
            { icon: Award, stat: '99.8%', label: 'Symbolic CAS Accuracy' },
            { icon: Globe, stat: '12', label: 'Core STEM & Humanities Subjects' },
            { icon: ShieldCheck, stat: '50,000+', label: 'Verified Live Tutors' },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center"
              >
                <Icon className="mx-auto h-6 w-6 text-[#FF4B4B]" />
                <div className="mt-2 text-2xl font-black text-slate-900">
                  {item.stat}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">{item.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
