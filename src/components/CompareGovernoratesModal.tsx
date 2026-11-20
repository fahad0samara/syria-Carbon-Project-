import { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  Snowflake,
  Sun,
  Wind,
  X,
} from 'lucide-react';
import { SYRIA_GOVERNORATES } from '../data/syriaGeo';
import {
  describeWmoCodeAr,
  getAqiBadgeAr,
  type GovernorateAirQuality,
  type HourlyPoint,
  type WeatherIconKind,
} from '../data/syriaRealData';
import { PanelHeader } from './PanelHeader';

interface CompareGovernoratesModalProps {
  isOpen: boolean;
  onClose: () => void;
  aqByGov: Record<string, GovernorateAirQuality>;
  initialGovA: string;
  initialGovB: string;
}

type HourlyMetricKey = keyof Omit<HourlyPoint, 'time'>;

const HOURLY_METRICS: Array<{ key: HourlyMetricKey; label: string }> = [
  { key: 'pm25', label: 'PM2.5' },
  { key: 'pm10', label: 'PM10' },
  { key: 'o3', label: 'الأوزون' },
  { key: 'no2', label: 'NO₂' },
  { key: 'dust', label: 'الغبار' },
];

const WEEKDAYS_AR = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

function getDayLabel(isoDate: string, idx: number): string {
  if (idx === 0) return 'اليوم';
  if (idx === 1) return 'غداً';
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  return WEEKDAYS_AR[new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay()] || isoDate;
}

function WeatherGlyph({ kind, className = 'w-4 h-4' }: { kind: WeatherIconKind; className?: string }) {
  switch (kind) {
    case 'clear':
      return <Sun className={`${className} text-[#f7df59] shrink-0`} />;
    case 'partly-cloudy':
      return <CloudSun className={`${className} text-[#7dd3fc] shrink-0`} />;
    case 'cloudy':
      return <Cloud className={`${className} text-[#93c5fd] shrink-0`} />;
    case 'fog':
      return <CloudFog className={`${className} text-[#a5c8eb] shrink-0`} />;
    case 'drizzle':
      return <CloudDrizzle className={`${className} text-[#38bdf8] shrink-0`} />;
    case 'rain':
      return <CloudRain className={`${className} text-[#38bdf8] shrink-0`} />;
    case 'snow':
      return <Snowflake className={`${className} text-[#e0f2fe] shrink-0`} />;
    case 'storm':
      return <CloudLightning className={`${className} text-[#fbbf24] shrink-0`} />;
  }
}

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

export function CompareGovernoratesModal({
  isOpen,
  onClose,
  aqByGov,
  initialGovA,
  initialGovB,
}: CompareGovernoratesModalProps) {
  const [govAId, setGovAId] = useState(initialGovA);
  const [govBId, setGovBId] = useState(initialGovB);
  const [hourlyMetric, setHourlyMetric] = useState<HourlyMetricKey>('pm25');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setGovAId(initialGovA);
      setGovBId(initialGovB);
      setHoverIdx(null);
    }
  }, [isOpen, initialGovA, initialGovB]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const govA = SYRIA_GOVERNORATES.find((g) => g.id === govAId) ?? SYRIA_GOVERNORATES[0];
  const govB = SYRIA_GOVERNORATES.find((g) => g.id === govBId) ?? SYRIA_GOVERNORATES[1];
  const dataA = aqByGov[govA.id];
  const dataB = aqByGov[govB.id];

  const handleSwap = () => {
    setGovAId(govBId);
    setGovBId(govAId);
  };

  const handleSelectA = (nextId: string) => {
    if (nextId === govBId) {
      setGovBId(govAId);
    }
    setGovAId(nextId);
  };

  const handleSelectB = (nextId: string) => {
    if (nextId === govAId) {
      setGovAId(govBId);
    }
    setGovBId(nextId);
  };

  const pollutantRows =
    dataA && dataB
      ? [
          { label: 'مؤشر الهواء (AQI)', a: dataA.usAqi, b: dataB.usAqi, unit: '' },
          { label: 'PM2.5', a: dataA.pm25, b: dataB.pm25, unit: 'µg/m³' },
          { label: 'PM10', a: dataA.pm10, b: dataB.pm10, unit: 'µg/m³' },
          { label: 'الأوزون O₃', a: dataA.o3, b: dataB.o3, unit: 'µg/m³' },
          { label: 'ثاني أكسيد النيتروجين NO₂', a: dataA.no2, b: dataB.no2, unit: 'µg/m³' },
          { label: 'ثاني أكسيد الكبريت SO₂', a: dataA.so2, b: dataB.so2, unit: 'µg/m³' },
          { label: 'الغبار العالق', a: dataA.dust, b: dataB.dust, unit: 'µg/m³' },
        ]
      : [];

  // Build 24h overlay chart data
  const hourlyA = dataA?.hourly ?? [];
  const hourlyB = dataB?.hourly ?? [];
  const pointCount = Math.min(hourlyA.length, hourlyB.length);
  const chartW = 540;
  const chartH = 162;
  const padL = 36;
  const padR = 14;
  const padT = 14;
  const padB = 26;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const maxHourlyVal = Math.max(
    15,
    ...hourlyA.slice(0, pointCount).map((p) => p[hourlyMetric]),
    ...hourlyB.slice(0, pointCount).map((p) => p[hourlyMetric])
  );
  const yMax = Math.ceil(maxHourlyVal / 10) * 10;
  const xAt = (i: number) =>
    padL + (i / Math.max(1, pointCount - 1)) * plotW;
  const yAt = (v: number) =>
    padT + plotH - (Math.max(0, Math.min(yMax, v)) / yMax) * plotH;

  const pathA = buildSmoothCurve(
    hourlyA.slice(0, pointCount).map((p, i) => [xAt(i), yAt(p[hourlyMetric])])
  );
  const pathB = buildSmoothCurve(
    hourlyB.slice(0, pointCount).map((p, i) => [xAt(i), yAt(p[hourlyMetric])])
  );

  const daysA = dataA?.dailyWeather ?? [];
  const daysB = dataB?.dailyWeather ?? [];
  const dayCount = Math.min(daysA.length, daysB.length);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#020a1f]/86 backdrop-blur-sm p-2 sm:p-4 lg:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="مقارنة محافظتين"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="syria-command-bg relative w-full max-w-[1120px] max-h-[92vh] overflow-y-auto syria-scroll border border-cyan-400/30 shadow-[0_20px_70px_rgba(0,10,36,0.9)] flex flex-col">
        {/* Sticky Top Header & Governorate Selectors */}
        <div className="sticky top-0 z-30 bg-[#041436]/96 backdrop-blur-md border-b border-cyan-500/20 px-4 sm:px-6 py-3.5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg sm:text-xl font-bold text-white">
              مقارنة المحافظات
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-[#9ec4ea] hover:text-white border border-cyan-500/25 hover:border-cyan-400/50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <X className="w-4 h-4" />
              <span>إغلاق</span>
            </button>
          </div>

          {/* Side-by-side Governorate Selector Row */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 bg-[#38bdf8] shrink-0" aria-hidden="true" />
              <label htmlFor="compare-gov-a" className="sr-only">
                المحافظة الأولى
              </label>
              <select
                id="compare-gov-a"
                value={govAId}
                onChange={(e) => handleSelectA(e.target.value)}
                className="w-full bg-[#071f4d] border border-cyan-400/40 text-white text-xs sm:text-sm font-semibold px-2.5 py-2 focus:outline-none focus:border-cyan-300 cursor-pointer"
              >
                {SYRIA_GOVERNORATES.map((g) => (
                  <option key={g.id} value={g.id} className="bg-[#05183e] text-white">
                    {g.nameAr}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleSwap}
              aria-label="تبديل المحافظتين"
              title="تبديل المحافظتين"
              className="p-2 bg-[#08255a] hover:bg-[#0e367d] border border-cyan-400/30 text-cyan-300 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 bg-[#f5df4d] shrink-0" aria-hidden="true" />
              <label htmlFor="compare-gov-b" className="sr-only">
                المحافظة الثانية
              </label>
              <select
                id="compare-gov-b"
                value={govBId}
                onChange={(e) => handleSelectB(e.target.value)}
                className="w-full bg-[#071f4d] border border-amber-300/40 text-white text-xs sm:text-sm font-semibold px-2.5 py-2 focus:outline-none focus:border-amber-200 cursor-pointer"
              >
                {SYRIA_GOVERNORATES.map((g) => (
                  <option key={g.id} value={g.id} className="bg-[#05183e] text-white">
                    {g.nameAr}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {!dataA || !dataB ? (
            <div className="py-12 text-center text-sm text-[#89b5e3]">
              جارٍ تحميل بيانات المحافظتين...
            </div>
          ) : (
            <>
              {/* Overview Summary Cards Side-by-Side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    gov: govA,
                    data: dataA,
                    accentBorder: 'border-cyan-400/35',
                    accentText: 'text-[#5ccdff]',
                    dot: 'bg-[#38bdf8]',
                  },
                  {
                    gov: govB,
                    data: dataB,
                    accentBorder: 'border-amber-300/35',
                    accentText: 'text-[#f7e560]',
                    dot: 'bg-[#f5df4d]',
                  },
                ].map(({ gov, data, accentBorder, accentText, dot }) => {
                  const badge = getAqiBadgeAr(data.usAqi);
                  const wInfo =
                    data.weatherCode !== null
                      ? describeWmoCodeAr(data.weatherCode)
                      : null;

                  return (
                    <div
                      key={gov.id}
                      className={`hud-table-surface border ${accentBorder} p-4 flex flex-col gap-3`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 ${dot}`} />
                          <h3 className="font-display text-base sm:text-lg font-bold text-white">
                            {gov.nameAr}
                          </h3>
                          <span className="text-xs text-[#7ca8d4]">
                            · {gov.areaKm2.toLocaleString('en-US')} كم²
                          </span>
                        </div>
                        <span className={`text-xs font-semibold ${accentText}`}>
                          {badge.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-2 pt-1 border-t border-cyan-500/15 text-center">
                        <div>
                          <div className="text-[10.5px] text-[#7ca8d4]">AQI</div>
                          <div className={`font-tabular text-xl font-bold ${accentText}`}>
                            {data.usAqi}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10.5px] text-[#7ca8d4]">الحرارة</div>
                          <div className="font-tabular text-lg font-bold text-white flex items-center justify-center gap-1" dir="ltr">
                            {data.temperatureC !== null ? `${data.temperatureC}°` : '-'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10.5px] text-[#7ca8d4]">الرطوبة</div>
                          <div className="font-tabular text-lg font-bold text-[#9fd4ff]" dir="ltr">
                            {data.humidityPct !== null ? `${data.humidityPct}%` : '-'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10.5px] text-[#7ca8d4]">الرياح</div>
                          <div className="font-tabular text-lg font-bold text-[#48f7ba]" dir="ltr">
                            {data.windKmh !== null ? `${data.windKmh}` : '-'}
                          </div>
                        </div>
                      </div>

                      {wInfo && (
                        <div className="flex items-center justify-between text-xs text-[#9ec4ea] pt-1 border-t border-cyan-500/12">
                          <span className="inline-flex items-center gap-1.5">
                            <WeatherGlyph kind={wInfo.icon} />
                            <span>{wInfo.label}</span>
                          </span>
                          <span className="text-[11px] text-[#78a4d4]">
                            سرعة الرياح بوحدة كم/س
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Middle Split: Pollutant Comparison Bars + 24h Dual Spline Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Direct Pollutant Comparison */}
                <section aria-label="مقارنة الملوثات" className="w-full">
                  <PanelHeader
                    title="مقارنة جودة الهواء"
                    action={
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="inline-flex items-center gap-1 text-[#5ccdff]">
                          <span className="w-2 h-2 bg-[#38bdf8] inline-block" />
                          {govA.nameAr}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[#f7e560]">
                          <span className="w-2 h-2 bg-[#f5df4d] inline-block" />
                          {govB.nameAr}
                        </span>
                      </div>
                    }
                  />

                  <div className="hud-table-surface p-3.5 space-y-3">
                    {pollutantRows.map((row) => {
                      const rowMax = Math.max(1, row.a, row.b);
                      const pctA = row.a > 0 ? Math.max(3, (row.a / rowMax) * 100) : 0;
                      const pctB = row.b > 0 ? Math.max(3, (row.b / rowMax) * 100) : 0;
                      const diff = Math.round((row.a - row.b) * 10) / 10;

                      return (
                        <div key={row.label} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#cde5ff] font-medium">
                              {row.label}
                            </span>
                            <div className="flex items-center gap-2 font-tabular text-[11px]" dir="ltr">
                              <span className="text-[#5ccdff] font-semibold">
                                {row.a}
                              </span>
                              <span className="text-[#4a6f9c]">vs</span>
                              <span className="text-[#f7e560] font-semibold">
                                {row.b}
                              </span>
                              {row.unit && (
                                <span className="text-[10px] text-[#6d98c4]">
                                  {row.unit}
                                </span>
                              )}
                              <span
                                className={`text-[10px] min-w-[40px] text-right ${
                                  diff === 0
                                    ? 'text-[#7ca8d4]'
                                    : diff > 0
                                      ? 'text-[#fb923c]'
                                      : 'text-[#48f7ba]'
                                }`}
                              >
                                {diff === 0 ? '0' : diff > 0 ? `+${diff}` : `${diff}`}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="h-[6px] w-full rounded-full bg-[#09214d] overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-400"
                                style={{
                                  width: `${pctA}%`,
                                  background: 'linear-gradient(270deg, #49cbff, #2494f2)',
                                }}
                              />
                            </div>
                            <div className="h-[6px] w-full rounded-full bg-[#09214d] overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-400"
                                style={{
                                  width: `${pctB}%`,
                                  background: 'linear-gradient(270deg, #f7e560, #e5a823)',
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* 24-Hour Side-by-Side Curve Overlay */}
                <section aria-label="مقارنة آخر 24 ساعة" className="w-full relative">
                  <PanelHeader
                    title="آخر 24 ساعة"
                    action={
                      <div className="flex items-center gap-1.5 text-[11px]" role="tablist">
                        {HOURLY_METRICS.map((m, idx) => (
                          <span key={m.key} className="inline-flex items-center gap-1.5">
                            {idx > 0 && <span className="text-[#365a85]">/</span>}
                            <button
                              type="button"
                              role="tab"
                              aria-selected={hourlyMetric === m.key}
                              onClick={() => setHourlyMetric(m.key)}
                              className={`transition-colors whitespace-nowrap cursor-pointer ${
                                hourlyMetric === m.key
                                  ? 'text-cyan-300 font-semibold underline underline-offset-4'
                                  : 'text-[#6c96c4] hover:text-cyan-200'
                              }`}
                            >
                              {m.label}
                            </button>
                          </span>
                        ))}
                      </div>
                    }
                  />

                  <div className="hud-table-surface p-3.5 relative">
                    <div className="flex items-center justify-between mb-2 text-[11px] text-[#9ec4ea]">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-3 h-[2px] bg-[#38bdf8] inline-block" />
                          {govA.nameAr}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-3 h-[2px] bg-[#f5df4d] inline-block" />
                          {govB.nameAr}
                        </span>
                      </div>
                      <span className="font-tabular text-[10px] text-[#6d98c4]">
                        µg/m³
                      </span>
                    </div>

                    <div className="relative w-full">
                      <svg
                        viewBox={`0 0 ${chartW} ${chartH}`}
                        direction="ltr"
                        className="w-full h-[176px] overflow-visible"
                        role="img"
                        aria-label={`مقارنة ${hourlyMetric} بين ${govA.nameAr} و${govB.nameAr} خلال 24 ساعة`}
                        onMouseLeave={() => setHoverIdx(null)}
                      >
                        {[0, 0.25, 0.5, 0.75, 1].map((r) => {
                          const v = Math.round(yMax * r);
                          const y = yAt(v);
                          return (
                            <g key={v}>
                              <line
                                x1={padL}
                                y1={y}
                                x2={chartW - padR}
                                y2={y}
                                stroke={
                                  v === 0
                                    ? 'rgba(90, 174, 255, 0.32)'
                                    : 'rgba(56, 152, 255, 0.1)'
                                }
                              />
                              <text
                                x={padL - 6}
                                y={y + 3}
                                textAnchor="end"
                                className="font-tabular fill-[#6e98c6] text-[9.5px]"
                              >
                                {v}
                              </text>
                            </g>
                          );
                        })}

                        {pathA && (
                          <path
                            d={pathA}
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            style={{ filter: 'drop-shadow(0 0 4px rgba(56,189,248,0.55))' }}
                          />
                        )}
                        {pathB && (
                          <path
                            d={pathB}
                            fill="none"
                            stroke="#f5df4d"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            style={{ filter: 'drop-shadow(0 0 4px rgba(245,223,77,0.55))' }}
                          />
                        )}

                        {hourlyA.slice(0, pointCount).map((pt, i) => {
                          const x = xAt(i);
                          return (
                            <text
                              key={`${pt.time}-${i}`}
                              x={x}
                              y={chartH - 6}
                              textAnchor="middle"
                              className="font-tabular fill-[#6e98c6] text-[9px]"
                            >
                              {pt.time.slice(0, 2)}
                            </text>
                          );
                        })}

                        {hoverIdx !== null &&
                          hourlyA[hoverIdx] &&
                          hourlyB[hoverIdx] && (
                            <g pointerEvents="none">
                              <line
                                x1={xAt(hoverIdx)}
                                y1={padT}
                                x2={xAt(hoverIdx)}
                                y2={padT + plotH}
                                stroke="rgba(102, 220, 255, 0.55)"
                                strokeDasharray="3 2"
                              />
                              <circle
                                cx={xAt(hoverIdx)}
                                cy={yAt(hourlyA[hoverIdx][hourlyMetric])}
                                r="3.5"
                                fill="#38bdf8"
                                stroke="#030e29"
                                strokeWidth="1.2"
                              />
                              <circle
                                cx={xAt(hoverIdx)}
                                cy={yAt(hourlyB[hoverIdx][hourlyMetric])}
                                r="3.5"
                                fill="#f5df4d"
                                stroke="#030e29"
                                strokeWidth="1.2"
                              />
                            </g>
                          )}

                        {hourlyA.slice(0, pointCount).map((_, i) => {
                          const colW = plotW / Math.max(1, pointCount);
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

                      {hoverIdx !== null && hourlyA[hoverIdx] && hourlyB[hoverIdx] && (
                        <div className="mt-2 flex items-center justify-between px-2.5 py-1.5 bg-[#05183e] border border-cyan-400/30 text-xs">
                          <span className="font-tabular text-cyan-300 font-semibold" dir="ltr">
                            {hourlyA[hoverIdx].time}
                          </span>
                          <div className="flex items-center gap-4">
                            <span className="text-[#5ccdff]">
                              {govA.nameAr}:{' '}
                              <span className="font-tabular font-bold">
                                {hourlyA[hoverIdx][hourlyMetric]}
                              </span>
                            </span>
                            <span className="text-[#f7e560]">
                              {govB.nameAr}:{' '}
                              <span className="font-tabular font-bold">
                                {hourlyB[hoverIdx][hourlyMetric]}
                              </span>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </div>

              {/* 5-Day Side-by-Side Weather Forecast Comparison */}
              <section aria-label="مقارنة توقعات الطقس لمدة 5 أيام" className="w-full">
                <PanelHeader title="توقعات الطقس (5 أيام)" />

                <div className="hud-table-surface overflow-x-auto syria-scroll">
                  {dayCount === 0 ? (
                    <div className="py-8 text-center text-xs text-[#78a4d4]">
                      لا توجد توقعات طقس متاحة حالياً
                    </div>
                  ) : (
                    <table className="w-full text-right border-collapse min-w-[560px]">
                    <thead>
                      <tr className="border-b border-cyan-500/20 text-[11px] text-[#7ca8d4]">
                        <th className="py-2.5 px-3 font-semibold">اليوم</th>
                        <th className="py-2.5 px-3 font-semibold text-[#5ccdff]">
                          {govA.nameAr}
                        </th>
                        <th className="py-2.5 px-3 font-semibold text-[#f7e560]">
                          {govB.nameAr}
                        </th>
                        <th className="py-2.5 px-3 font-semibold text-left">
                          فارق العظمى
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cyan-500/12 text-xs">
                      {Array.from({ length: dayCount }).map((_, i) => {
                        const dA = daysA[i];
                        const dB = daysB[i];
                        const infoA = describeWmoCodeAr(dA.weatherCode);
                        const infoB = describeWmoCodeAr(dB.weatherCode);
                        const tempDiff =
                          Math.round((dA.tempMax - dB.tempMax) * 10) / 10;

                        return (
                          <tr
                            key={dA.date}
                            className="hover:bg-cyan-400/6 transition-colors"
                          >
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <div className="font-semibold text-white">
                                {getDayLabel(dA.date, i)}
                              </div>
                              <div
                                className="font-tabular text-[10px] text-[#6d98c4]"
                                dir="ltr"
                              >
                                {dA.date.slice(5)}
                              </div>
                            </td>

                            <td className="py-2.5 px-3">
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="inline-flex items-center gap-1.5 text-[#d7eeff]">
                                  <WeatherGlyph kind={infoA.icon} />
                                  <span>{infoA.label}</span>
                                </span>
                                <span className="font-tabular" dir="ltr">
                                  <span className="text-[#77b6f2]">
                                    {Math.round(dA.tempMin)}°
                                  </span>
                                  <span className="text-[#4a6f9c] mx-0.5">/</span>
                                  <span className="text-[#5ccdff] font-semibold">
                                    {Math.round(dA.tempMax)}°
                                  </span>
                                </span>
                                <span className="inline-flex items-center gap-1 font-tabular text-[11px] text-[#7ca8d4]">
                                  <Droplets className="w-3 h-3 text-[#38bdf8]" />
                                  {dA.precipProb}%
                                </span>
                                <span className="inline-flex items-center gap-1 font-tabular text-[11px] text-[#7ca8d4]">
                                  <Wind className="w-3 h-3 text-[#48f7ba]" />
                                  {dA.windMaxKmh}
                                </span>
                              </div>
                            </td>

                            <td className="py-2.5 px-3">
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="inline-flex items-center gap-1.5 text-[#d7eeff]">
                                  <WeatherGlyph kind={infoB.icon} />
                                  <span>{infoB.label}</span>
                                </span>
                                <span className="font-tabular" dir="ltr">
                                  <span className="text-[#77b6f2]">
                                    {Math.round(dB.tempMin)}°
                                  </span>
                                  <span className="text-[#4a6f9c] mx-0.5">/</span>
                                  <span className="text-[#f7e560] font-semibold">
                                    {Math.round(dB.tempMax)}°
                                  </span>
                                </span>
                                <span className="inline-flex items-center gap-1 font-tabular text-[11px] text-[#7ca8d4]">
                                  <Droplets className="w-3 h-3 text-[#38bdf8]" />
                                  {dB.precipProb}%
                                </span>
                                <span className="inline-flex items-center gap-1 font-tabular text-[11px] text-[#7ca8d4]">
                                  <Wind className="w-3 h-3 text-[#48f7ba]" />
                                  {dB.windMaxKmh}
                                </span>
                              </div>
                            </td>

                            <td className="py-2.5 px-3 text-left font-tabular whitespace-nowrap" dir="ltr">
                              <span
                                className={
                                  tempDiff === 0
                                    ? 'text-[#7ca8d4]'
                                    : tempDiff > 0
                                      ? 'text-[#f7e560]'
                                      : 'text-[#5ccdff]'
                                }
                              >
                                {tempDiff > 0 ? `+${tempDiff}°` : `${tempDiff}°`}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
