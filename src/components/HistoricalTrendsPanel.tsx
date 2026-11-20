import { useState } from 'react';
import { PanelHeader } from './PanelHeader';
import type { WorldBankYearMetric } from '../data/syriaRealData';

interface HistoricalTrendsPanelProps {
  metrics: WorldBankYearMetric[];
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function HistoricalTrendsPanel({
  metrics,
  isLoading,
  error,
  onRetry,
}: HistoricalTrendsPanelProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const W = 360;
  const H = 158;
  const padL = 32;
  const padR = 36;
  const padT = 14;
  const padB = 24;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const leftMax = Math.max(
    40,
    Math.ceil(
      Math.max(
        0,
        ...metrics.flatMap((d) => [d.co2MillionTons, d.pm25AnnualMean])
      ) / 10
    ) * 10
  );

  const pcVals = metrics.map((d) => d.co2PerCapitaTons);
  const rightMin =
    pcVals.length > 0 ? Math.floor((Math.min(...pcVals) - 0.15) * 10) / 10 : 1.0;
  const rightMax =
    pcVals.length > 0 ? Math.ceil((Math.max(...pcVals) + 0.15) * 10) / 10 : 2.0;

  const yLeft = (v: number) => padT + plotH - (v / leftMax) * plotH;
  const yRight = (v: number) =>
    padT +
    plotH -
    ((v - rightMin) / Math.max(0.1, rightMax - rightMin)) * plotH;

  const groupW = plotW / Math.max(1, metrics.length);
  const barW = 9.5;

  const trendPoints = metrics
    .map((d, i) => {
      const x = padL + groupW * i + groupW / 2;
      const y = yRight(d.co2PerCapitaTons);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const hovered = hoverIdx !== null ? metrics[hoverIdx] : null;
  const rightTicks = [0, 0.33, 0.66, 1].map(
    (r) => Math.round((rightMin + (rightMax - rightMin) * r) * 100) / 100
  );

  return (
    <section aria-label="انبعاثات الكربون" className="w-full relative">
      <PanelHeader
        title="انبعاثات الكربون"
        action={
          <span className="text-[10px] text-[#78a4d4] whitespace-nowrap">
            البنك الدولي
          </span>
        }
      />

      <div className="flex items-center justify-end flex-wrap gap-x-3 gap-y-1 mb-1 text-[10px] text-[#9ec4ea]">
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 bg-[#2faeff] inline-block" />
          الكربون
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 bg-[#3ef2b2] inline-block" />
          PM2.5
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-[2px] bg-[#f5a535] inline-block" />
          للفرد
        </span>
      </div>

      <div className="relative w-full">
        {isLoading && metrics.length === 0 ? (
          <div className="h-[146px] sm:h-[154px] flex items-center justify-center text-xs text-[#78a4d4] animate-pulse">
            جارٍ التحميل...
          </div>
        ) : error && metrics.length === 0 ? (
          <div className="h-[146px] sm:h-[154px] flex flex-col items-center justify-center gap-2 text-xs text-rose-200">
            <span>{error}</span>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="underline underline-offset-4 text-white cursor-pointer"
              >
                إعادة المحاولة
              </button>
            )}
          </div>
        ) : metrics.length === 0 ? (
          <div className="h-[146px] sm:h-[154px] flex items-center justify-center text-xs text-[#78a4d4]">
            لا توجد بيانات متاحة
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            direction="ltr"
            className="w-full h-[146px] sm:h-[154px] overflow-visible"
            role="img"
            aria-label="مخطط الأعمدة والاتجاه لبيانات البنك الدولي الرسمية عن انبعاثات الكربون والتعرض للجسيمات الدقيقة في سوريا"
            onMouseLeave={() => setHoverIdx(null)}
          >
            <defs>
              <linearGradient id="co2BarV2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#35b4ff" />
                <stop offset="100%" stopColor="#1b6bd6" stopOpacity="0.82" />
              </linearGradient>
              <linearGradient id="pmBarV2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#48f7ba" />
                <stop offset="100%" stopColor="#19b885" stopOpacity="0.85" />
              </linearGradient>
            </defs>

            <text x={padL - 4} y={8} textAnchor="end" className="font-tabular fill-[#648db8] text-[8px]">
              Mt / µg
            </text>
            <text x={W - padR + 4} y={8} textAnchor="start" className="font-tabular fill-[#b6925c] text-[8px]">
              t / cap
            </text>

            {[0, 0.25, 0.5, 0.75, 1].map((r) => {
              const v = Math.round(leftMax * r);
              const y = yLeft(v);
              return (
                <g key={v}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={W - padR}
                    y2={y}
                    stroke={v === 0 ? 'rgba(90, 174, 255, 0.32)' : 'rgba(56, 152, 255, 0.1)'}
                  />
                  <text
                    x={padL - 5}
                    y={y + 3}
                    textAnchor="end"
                    className="font-tabular fill-[#6e98c6] text-[8.5px]"
                  >
                    {v}
                  </text>
                </g>
              );
            })}

            {rightTicks.map((v) => {
              const y = yRight(v);
              return (
                <text
                  key={v}
                  x={W - padR + 5}
                  y={y + 3}
                  textAnchor="start"
                  className="font-tabular fill-[#cfa15c] text-[8.5px]"
                >
                  {v.toFixed(1)}
                </text>
              );
            })}

            {metrics.map((d, i) => {
              const centerX = padL + groupW * i + groupW / 2;
              const yCo2 = yLeft(d.co2MillionTons);
              const hCo2 = padT + plotH - yCo2;
              const yPm = yLeft(d.pm25AnnualMean);
              const hPm = padT + plotH - yPm;
              const active = hoverIdx === i;

              return (
                <g
                  key={d.year}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoverIdx(i)}
                  onClick={() => setHoverIdx(hoverIdx === i ? null : i)}
                >
                  {active && (
                    <rect
                      x={padL + groupW * i + 4}
                      y={padT}
                      width={groupW - 8}
                      height={plotH}
                      fill="rgba(56, 189, 248, 0.08)"
                    />
                  )}
                  <rect
                    x={centerX - barW - 2.5}
                    y={yCo2}
                    width={barW}
                    height={hCo2}
                    fill="url(#co2BarV2)"
                  />
                  <rect
                    x={centerX + 2.5}
                    y={yPm}
                    width={barW}
                    height={hPm}
                    fill="url(#pmBarV2)"
                  />
                  <text
                    x={centerX}
                    y={H - 6}
                    textAnchor="middle"
                    className={`font-tabular text-[9px] ${
                      active ? 'fill-cyan-200 font-bold' : 'fill-[#7ea7d4]'
                    }`}
                  >
                    {d.year}
                  </text>
                </g>
              );
            })}

            <polyline
              points={trendPoints}
              fill="none"
              stroke="#f5a535"
              strokeWidth="1.75"
              style={{ filter: 'drop-shadow(0 0 4px rgba(245, 165, 53, 0.55))' }}
            />
            {metrics.map((d, i) => {
              const x = padL + groupW * i + groupW / 2;
              const y = yRight(d.co2PerCapitaTons);
              return (
                <circle
                  key={`pt-${d.year}`}
                  cx={x}
                  cy={y}
                  r={hoverIdx === i ? '3.5' : '2.2'}
                  fill="#ffd37a"
                  stroke="#030e29"
                  strokeWidth="0.9"
                />
              );
            })}
          </svg>
        )}

        {hovered && (
          <div
            className="absolute top-0 left-0 right-0 z-20 pointer-events-none flex flex-wrap items-center justify-between gap-2 px-2.5 py-1 bg-[#05183e]/95 border border-cyan-400/35 text-[10.5px] shadow-lg"
            role="status"
          >
            <span className="font-tabular text-amber-300 font-bold">
              عام {hovered.year}
            </span>
            <div className="flex items-center gap-2.5 text-[#d7eeff]">
              <span>
                الكربون <span className="font-tabular">{hovered.co2MillionTons}</span> مليون طن
              </span>
              <span>
                PM2.5 <span className="font-tabular">{hovered.pm25AnnualMean}</span>
              </span>
              <span>
                الفرد <span className="font-tabular">{hovered.co2PerCapitaTons}</span> طن
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
