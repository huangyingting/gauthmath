'use client';

import React, { useState } from 'react';
import type { FunctionGraphData, KeyGraphFeature } from '@/lib/math-engine/grapher';

interface FunctionGraphSvgProps {
  graph: FunctionGraphData;
  accentColor?: string;
  className?: string;
}

export function FunctionGraphSvg({
  graph,
  accentColor = '#FF4B4B',
  className = '',
}: FunctionGraphSvgProps) {
  const [hoveredFeature, setHoveredFeature] = useState<KeyGraphFeature | null>(
    null
  );

  const { width, height, domain, range, svgPaths, features } = graph;
  const [xMin, xMax] = domain;
  const [yMin, yMax] = range;

  const projectX = (x: number) => ((x - xMin) / (xMax - xMin)) * width;
  const projectY = (y: number) => height - ((y - yMin) / (yMax - yMin)) * height;

  const originX = projectX(0);
  const originY = projectY(0);

  const xTicks: number[] = [];
  const xStep = Math.max(1, Math.round((xMax - xMin) / 10));
  for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x += xStep) {
    if (x !== 0) xTicks.push(x);
  }

  const yTicks: number[] = [];
  const yStep = Math.max(1, Math.round((yMax - yMin) / 8));
  for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y += yStep) {
    if (y !== 0) yTicks.push(y);
  }

  return (
    <div
      className={`relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}
      data-testid="function-graph-card"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          <span className="font-mono text-xs font-semibold text-slate-800">
            y = {graph.expression}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono">
            Domain: [{xMin}, {xMax}]
          </span>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono">
            Range: [{yMin}, {yMax}]
          </span>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-slate-100 bg-slate-50/70">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full select-none"
          role="img"
          aria-label={`2D Function Graph of ${graph.expression}`}
        >
          {/* Vertical Grid Lines */}
          {xTicks.map((x) => {
            const px = projectX(x);
            return (
              <g key={`vx-${x}`}>
                <line
                  x1={px}
                  y1={0}
                  x2={px}
                  y2={height}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={px}
                  y={Math.min(height - 6, Math.max(14, originY + 14))}
                  textAnchor="middle"
                  fill="#64748B"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {x}
                </text>
              </g>
            );
          })}

          {/* Horizontal Grid Lines */}
          {yTicks.map((y) => {
            const py = projectY(y);
            return (
              <g key={`hy-${y}`}>
                <line
                  x1={0}
                  y1={py}
                  x2={width}
                  y2={py}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={Math.min(width - 18, Math.max(18, originX - 8))}
                  y={py + 3}
                  textAnchor="end"
                  fill="#64748B"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {y}
                </text>
              </g>
            );
          })}

          {/* Primary Coordinate Axes */}
          {originY >= 0 && originY <= height && (
            <line
              x1={0}
              y1={originY}
              x2={width}
              y2={originY}
              stroke="#94A3B8"
              strokeWidth="1.5"
            />
          )}
          {originX >= 0 && originX <= width && (
            <line
              x1={originX}
              y1={0}
              x2={originX}
              y2={height}
              stroke="#94A3B8"
              strokeWidth="1.5"
            />
          )}

          {/* Plotted Curve Branches */}
          {svgPaths.map((d, idx) => (
            <path
              key={idx}
              d={d}
              fill="none"
              stroke={accentColor}
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Interactive Feature Points (Roots, Extrema, Y-Intercept) */}
          {features.map((feat, idx) => {
            const cx = projectX(feat.x);
            const cy = projectY(feat.y);
            if (cx < 0 || cx > width || cy < 0 || cy > height) return null;
            const fill =
              feat.type === 'root'
                ? '#EF4444'
                : feat.type === 'y_intercept'
                  ? '#3B82F6'
                  : '#10B981';

            return (
              <g
                key={`${feat.type}-${idx}`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredFeature(feat)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={6}
                  fill={fill}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
                <text
                  x={cx + 8}
                  y={cy - 8}
                  fill="#1E293B"
                  fontSize="10"
                  fontWeight="600"
                  fontFamily="monospace"
                >
                  {feat.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Key Graph Features Legend */}
      {features.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {features.map((f, i) => (
            <span
              key={i}
              onMouseEnter={() => setHoveredFeature(f)}
              onMouseLeave={() => setHoveredFeature(null)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                hoveredFeature === f
                  ? 'border-rose-400 bg-rose-50 text-rose-700'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor:
                    f.type === 'root'
                      ? '#EF4444'
                      : f.type === 'y_intercept'
                        ? '#3B82F6'
                        : '#10B981',
                }}
              />
              {f.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
