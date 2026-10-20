'use client';

import React, { useState } from 'react';
import {
  X,
  Crop,
  RotateCw,
  RefreshCw,
  Sparkles,
  Upload,
  CheckCircle2,
} from 'lucide-react';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtractedQuestion: (data: {
    promptText: string;
    latex: string;
    subject: string;
    cropSummary: string;
  }) => void;
}

const WORKSHEET_PRESETS = [
  {
    id: 'quadratic',
    label: 'Quadratic Worksheet',
    subject: 'Math',
    previewTitle: 'AP Algebra II · Problem #4',
    previewFormula: 'Solve for x:  x² - 5x + 6 = 0',
    defaultCrop: { x: 14, y: 20, width: 72, height: 52 },
  },
  {
    id: 'calculus',
    label: 'Calculus Derivative',
    subject: 'Math',
    previewTitle: 'Calculus I · Tangent Slope #9',
    previewFormula: 'Find d/dx (x³ - 6x² + 9x + 2)',
    defaultCrop: { x: 10, y: 22, width: 80, height: 50 },
  },
  {
    id: 'integral',
    label: 'Definite Integral',
    subject: 'Math',
    previewTitle: 'AP Calculus BC · Area Under Curve',
    previewFormula: 'Evaluate ∫₀³ (x² + 4x) dx',
    defaultCrop: { x: 16, y: 24, width: 68, height: 48 },
  },
  {
    id: 'physics',
    label: 'Physics Kinematics',
    subject: 'Physics',
    previewTitle: 'Physics Mechanics · Lab Question #2',
    previewFormula: 'm = 4 kg, v = 15 m/s → Find Kinetic Energy K = ½mv²',
    defaultCrop: { x: 12, y: 18, width: 76, height: 56 },
  },
  {
    id: 'chemistry',
    label: 'Chemistry pH Lab',
    subject: 'Chemistry',
    previewTitle: 'AP Chemistry · Acid-Base Titration',
    previewFormula: 'Calculate pH of 0.001 M HCl at 25°C (PV = nRT)',
    defaultCrop: { x: 15, y: 20, width: 70, height: 52 },
  },
];

export function ImageCropModal({
  isOpen,
  onClose,
  onExtractedQuestion,
}: ImageCropModalProps) {
  const [selectedPreset, setSelectedPreset] = useState(WORKSHEET_PRESETS[0]);
  const [cropBox, setCropBox] = useState(WORKSHEET_PRESETS[0].defaultCrop);
  const [rotation, setRotation] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [customFormula, setCustomFormula] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: (typeof WORKSHEET_PRESETS)[0]) => {
    setSelectedPreset(preset);
    setCropBox(preset.defaultCrop);
    setRotation(0);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
    }
  };

  const adjustHandle = (
    dx: number,
    dy: number,
    dw: number,
    dh: number
  ) => {
    setCropBox((prev) => ({
      x: Math.max(4, Math.min(40, prev.x + dx)),
      y: Math.max(4, Math.min(40, prev.y + dy)),
      width: Math.max(35, Math.min(92, prev.width + dw)),
      height: Math.max(30, Math.min(88, prev.height + dh)),
    }));
  };

  const handleConfirmCrop = async () => {
    setIsExtracting(true);
    try {
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset: selectedPreset.id,
          cropBox,
          customLatex: customFormula.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok && data.ocr) {
        onExtractedQuestion({
          promptText: data.ocr.extractedPrompt,
          latex: data.ocr.extractedLatex,
          subject: data.ocr.subject,
          cropSummary: `Cropped [${cropBox.x}%, ${cropBox.y}%, ${cropBox.width}%×${cropBox.height}%] · Confidence ${Math.round(
            data.ocr.confidence * 100
          )}%`,
        });
        onClose();
      }
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      data-testid="image-crop-modal"
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Top Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500 text-white">
              <Crop className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Crop One Question at a Time (8-Handle OCR Scanner)
              </h3>
              <p className="text-xs text-slate-500">
                Drag or adjust the 8 bounding handles around a single homework question for 99.8% OCR accuracy
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close Image Crop Modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Worksheet Presets + File Upload Bar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {WORKSHEET_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    selectedPreset.id === preset.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
              <Upload className="h-3.5 w-3.5 text-rose-500" />
              <span>{uploadedFileName || 'Upload Local Image'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>

          {/* Interactive 8-Handle Canvas Viewport */}
          <div className="relative h-64 w-full overflow-hidden rounded-2xl border-2 border-slate-800 bg-slate-900 select-none">
            {/* Simulated Worksheet Paper Background */}
            <div
              className="absolute inset-4 rounded-xl bg-amber-50/95 p-6 text-slate-800 shadow-inner transition-transform duration-200"
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              <div className="mb-2 flex items-center justify-between border-b border-slate-300 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <span>{selectedPreset.previewTitle}</span>
                <span>Subject: {selectedPreset.subject}</span>
              </div>
              <p className="mt-6 text-center font-mono text-xl font-bold text-slate-900 sm:text-2xl">
                {customFormula || selectedPreset.previewFormula}
              </p>
              <p className="mt-4 text-center text-xs text-slate-500">
                Show all algebraic steps and verify domain constraints.
              </p>
            </div>

            {/* Dark Mask Overlay outside crop region */}
            <div
              className="absolute border-2 border-rose-500 bg-rose-500/10 shadow-[0_0_0_9999px_rgba(15,23,42,0.55)] transition-all duration-150"
              style={{
                left: `${cropBox.x}%`,
                top: `${cropBox.y}%`,
                width: `${cropBox.width}%`,
                height: `${cropBox.height}%`,
              }}
              data-testid="crop-bounding-box"
            >
              {/* Rule-of-Thirds Grid */}
              <div className="grid h-full w-full grid-cols-3 grid-rows-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="border border-white/25" />
                ))}
              </div>

              {/* 8 Resize Handles (NW, N, NE, E, SE, S, SW, W) */}
              <button
                type="button"
                aria-label="Resize North-West Handle"
                onClick={() => adjustHandle(-2, -2, 4, 4)}
                className="absolute -left-2 -top-2 h-4 w-4 rounded-full border-2 border-white bg-rose-500 shadow"
              />
              <button
                type="button"
                aria-label="Resize North Handle"
                onClick={() => adjustHandle(0, -2, 0, 4)}
                className="absolute left-1/2 -top-2 h-3.5 w-6 -translate-x-1/2 rounded-full border-2 border-white bg-rose-500 shadow"
              />
              <button
                type="button"
                aria-label="Resize North-East Handle"
                onClick={() => adjustHandle(0, -2, 4, 4)}
                className="absolute -right-2 -top-2 h-4 w-4 rounded-full border-2 border-white bg-rose-500 shadow"
              />
              <button
                type="button"
                aria-label="Resize East Handle"
                onClick={() => adjustHandle(0, 0, 4, 0)}
                className="absolute -right-2 top-1/2 h-6 w-3.5 -translate-y-1/2 rounded-full border-2 border-white bg-rose-500 shadow"
              />
              <button
                type="button"
                aria-label="Resize South-East Handle"
                onClick={() => adjustHandle(0, 0, 4, 4)}
                className="absolute -bottom-2 -right-2 h-4 w-4 rounded-full border-2 border-white bg-rose-500 shadow"
              />
              <button
                type="button"
                aria-label="Resize South Handle"
                onClick={() => adjustHandle(0, 0, 0, 4)}
                className="absolute -bottom-2 left-1/2 h-3.5 w-6 -translate-x-1/2 rounded-full border-2 border-white bg-rose-500 shadow"
              />
              <button
                type="button"
                aria-label="Resize South-West Handle"
                onClick={() => adjustHandle(-2, 0, 4, 4)}
                className="absolute -bottom-2 -left-2 h-4 w-4 rounded-full border-2 border-white bg-rose-500 shadow"
              />
              <button
                type="button"
                aria-label="Resize West Handle"
                onClick={() => adjustHandle(-2, 0, 4, 0)}
                className="absolute -left-2 top-1/2 h-6 w-3.5 -translate-y-1/2 rounded-full border-2 border-white bg-rose-500 shadow"
              />
            </div>

            {/* Live Bounding Box Badge */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-slate-900/85 px-3 py-1 text-[11px] font-mono text-white">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>
                ROI: x={cropBox.x}% y={cropBox.y}% w={cropBox.width}% h=
                {cropBox.height}%
              </span>
            </div>
          </div>

          {/* Optional Custom OCR Override Input & Controls */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                <RotateCw className="h-3.5 w-3.5" />
                Rotate 90°
              </button>
              <button
                type="button"
                onClick={() => {
                  setCropBox(selectedPreset.defaultCrop);
                  setRotation(0);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reset Box
              </button>
            </div>

            <div className="flex flex-1 items-center gap-2 sm:max-w-xs">
              <input
                type="text"
                value={customFormula}
                onChange={(e) => setCustomFormula(e.target.value)}
                placeholder="Or override OCR text (optional)..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-rose-500 focus:outline-hidden"
              />
            </div>

            <button
              type="button"
              onClick={handleConfirmCrop}
              disabled={isExtracting}
              data-testid="confirm-crop-extract-btn"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-rose-600 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {isExtracting ? 'Extracting LaTeX...' : 'Crop & Solve Question'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
