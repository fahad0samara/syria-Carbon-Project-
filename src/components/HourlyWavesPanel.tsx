import { useState } from 'react';
import { PanelHeader } from './PanelHeader';
import type { HourlyPoint } from '../data/syriaRealData';

interface HourlyWavesPanelProps {
  series: HourlyPoint[];
  isLoading: boolean;
  scopeLabel: string;
}

interface WaveDef {
  key: keyof Omit<HourlyPoint, 'time'>;
  label: string;
  color: string;
}

const WAVES: WaveDef[] = [
  { key: 'o3', label: 'الأوزون', color: '#35e8a8' },
  { key: 'pm10', label: 'PM10', color: '#22d3ee' },
  { key: 'pm25', label: 'PM2.5', color: '#38bdf8' },
  { key: 'dust', label: 'الغبار', color: '#f4e04d' },
  { key: 'no2', label: 'NO₂', color: '#f59e0b' },
];

function buildSmoothCurve(pts: Array<[number, number]>): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M${pts[0][0]},${pts[0][1]}`;
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

export function HourlyWavesPanel({
  series,
  isLoading,
  scopeLabel,
}: HourlyWavesPanelProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const safeSeries = series.length >= 2 ? series : [];
  const W = 360;
  const H = 158;
  const padL = 34;
  const padR = 10;
  const padT = 14;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  // True physical scale directly in µg/m³ (no artificial normalization)
  const rawMax = Math.max(
    40,
    ...safeSeries.flatMap((pt) => WAVES.map((w) => pt[w.key]))
  );
  const yMax = Math.ceil(rawMax / 20) * 20;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((r) => Math.round(yMax * r));

  const xAt = (i: number) =>
    padL + (i / Math.max(1, safeSeries.length - 1)) * plotW;
  const yAt = (val: number) =>
    padT + plotH - (Math.max(0, Math.min(yMax, val)) / yMax) * plotH;

  const activePoint = hoverIdx !== null ? safeSeries[hoverIdx] : null;

  return (
    <section aria-label="آخر 24 ساعة" className="w-full relative">
      <PanelHeader
        title="آخر 24 ساعة"
        action={
          <span className="text-[11px] text-[#78a4d4] whitespace-nowrap">
            {scopeLabel}
          </span>
        }
      />

      <div className="flex items-center justify-end flex-wrap gap-x-3 gap-y-1 mb-1 text-[10px] text-[#8eb8e5]">
        {WAVES.map((w) => (
          <span key={w.key} className="inline-flex items-center gap-1">
            <span
              className="w-2 h-2 inline-block"
              style={{ backgroundColor: w.color }}
              aria-hidden="true"
            />
            <span>{w.label}</span>
          </span>
        ))}
      </div>

      <div className="relative w-full">
        {isLoading && safeSeries.length === 0 ? (
          <div className="h-[146px] sm:h-[154px] flex items-center justify-center text-xs text-[#78a4d4] animate-pulse">
            جارٍ التحميل...
          </div>
        ) : safeSeries.length === 0 ? (
          <div className="h-[146px] sm:h-[154px] flex items-center justify-center text-xs text-[#78a4d4]">
            لا توجد بيانات ساعية متاحة
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            direction="ltr"
            className="w-full h-[146px] sm:h-[154px] overflow-visible"
            role="img"
            aria-label="منحنيات تركيز الملوثات الحقيقية بالميكروغرام لكل متر مكعب خلال 24 ساعة"
            onMouseLeave={() => setHoverIdx(null)}
          >
            <text x={padL - 4} y={9} textAnchor="end" className="font-tabular fill-[#648db8] text-[8.5px]">
              µg/m³
            </text>

            {yTicks.map((tick) => {
              const y = yAt(tick);
              return (
                <g key={tick}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={W - padR}
                    y2={y}
                    stroke={
                      tick === 0
                        ? 'rgba(90, 174, 255, 0.28)'
                        : 'rgba(56, 152, 255, 0.1)'
                    }
                  />
                  <text
                    x={padL - 6}
                    y={y + 3}
                    textAnchor="end"
                    className="font-tabular fill-[#6e98c6] text-[8.5px]"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {WAVES.map((w) => {
              const pts: Array<[number, number]> = safeSeries.map((pt, i) => [
                xAt(i),
                yAt(pt[w.key]),
              ]);
              return (
                <path
                  key={w.key}
                  d={buildSmoothCurve(pts)}
                  fill="none"
                  stroke={w.color}
                  strokeWidth="1.65"
                  strokeLinecap="round"
                  opacity="0.94"
                  style={{ filter: `drop-shadow(0 0 3px ${w.color}66)` }}
                />
              );
            })}

            {safeSeries.map((pt, i) => {
              const x = xAt(i);
              return (
                <g key={`${pt.time}-${i}`}>
                  <line
                    x1={x}
                    y1={padT + plotH}
                    x2={x}
                    y2={padT + plotH + 3.5}
                    stroke="rgba(102, 178, 255, 0.42)"
                  />
                  <text
                    x={x}
                    y={H - 8}
                    textAnchor="middle"
                    className="font-tabular fill-[#6e98c6] text-[8px]"
                  >
                    {pt.time.slice(0, 2)}
                  </text>
                </g>
              );
            })}

            {hoverIdx !== null && safeSeries[hoverIdx] && (
              <g pointerEvents="none">
                <line
                  x1={xAt(hoverIdx)}
                  y1={padT}
                  x2={xAt(hoverIdx)}
                  y2={padT + plotH}
                  stroke="rgba(102, 220, 255, 0.55)"
                  strokeDasharray="3 2"
                />
                {WAVES.map((w) => (
                  <circle
                    key={w.key}
                    cx={xAt(hoverIdx)}
                    cy={yAt(safeSeries[hoverIdx][w.key])}
                    r="2.8"
                    fill={w.color}
                    stroke="#030e29"
                    strokeWidth="1"
                  />
                ))}
              </g>
            )}

            {safeSeries.map((_, i) => {
              const colW = plotW / Math.max(1, safeSeries.length);
              return (
                <rect
                  key={i}
                  x={xAt(i) - colW / 2}
                  y={padT}
                  width={colW}
                  height={plotH}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoverIdx(i)}
                  onClick={() => setHoverIdx(hoverIdx === i ? null : i)}
                />
              );
            })}
          </svg>
        )}

        {activePoint && (
          <div
            className="absolute top-0 left-0 right-0 z-20 pointer-events-none flex flex-wrap items-center justify-between gap-2 px-2.5 py-1 bg-[#05183e]/95 border border-cyan-400/35 text-[10.5px] shadow-lg"
            role="status"
          >
            <span className="font-tabular text-cyan-300 font-semibold" dir="ltr">
              {activePoint.time}
            </span>
            <div className="flex items-center gap-2.5 font-tabular text-[#d7eeff]" dir="ltr">
              <span>O₃: {activePoint.o3}</span>
              <span>PM10: {activePoint.pm10}</span>
              <span>PM2.5: {activePoint.pm25}</span>
              <span>NO₂: {activePoint.no2}</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
