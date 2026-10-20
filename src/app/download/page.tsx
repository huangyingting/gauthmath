import React from 'react';
import Link from 'next/link';
import { Smartphone, QrCode, CheckCircle2, Camera, Zap } from 'lucide-react';

export default function DownloadAppPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8" data-testid="download-page">
      <div className="grid grid-cols-1 items-center gap-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-rose-950 p-8 text-white shadow-xl lg:grid-cols-2">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-rose-300">
            <Smartphone className="h-3.5 w-3.5" />
            <span>GAUTH MOBILE APP · iOS & ANDROID</span>
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Snap & Solve Any Homework Question in 3 Seconds
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Trusted by 300M+ students with a 4.9★ App Store & Google Play rating. Sync your web history, bookmarks, and Gauth PLUS subscription across all devices.
          </p>

          <div className="mt-5 space-y-2 text-xs text-slate-200">
            {[
              'Instant camera OCR scanner with 8-handle precision crop',
              'Offline Scientific & Graphing Calculator',
              '24/7 Live Verified Tutor push notifications',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#FF4B4B] px-5 py-3 text-xs font-extrabold text-white shadow-md hover:bg-rose-600"
            >
              <Camera className="h-4 w-4" />
              <span>Launch Web Camera OCR Scanner</span>
            </Link>
            <Link
              href="/calculator"
              className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-xs font-bold text-white hover:bg-white/20"
            >
              <Zap className="h-4 w-4" />
              <span>Open Web Calculator</span>
            </Link>
          </div>
        </div>

        {/* QR Code Card */}
        <div className="flex flex-col items-center justify-center rounded-3xl border border-white/15 bg-white/5 p-6 text-center backdrop-blur-xs">
          <div className="flex h-40 w-40 items-center justify-center rounded-2xl bg-white p-4 text-slate-900 shadow-lg">
            <QrCode className="h-28 w-28" />
          </div>
          <h2 className="mt-4 text-base font-extrabold">
            Scan to Download Gauth App
          </h2>
          <p className="mt-1 text-xs text-slate-300">
            Available on iOS App Store & Google Play Store
          </p>
        </div>
      </div>
    </div>
  );
}
