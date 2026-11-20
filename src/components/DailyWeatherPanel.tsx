import { useMemo, useState } from 'react';
import {
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
} from 'lucide-react';
import { PanelHeader } from './PanelHeader';
import {
  describeWmoCodeAr,
  type DailyWeatherDay,
  type WeatherIconKind,
} from '../data/syriaRealData';

interface DailyWeatherPanelProps {
  days: DailyWeatherDay[];
  isLoading: boolean;
  scopeLabel: string;
}

const WEEKDAYS_AR = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

function getArabicDayName(isoDate: string, index: number): string {
  if (index === 0) return 'اليوم';
  if (index === 1) return 'غداً';
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return WEEKDAYS_AR[dt.getUTCDay()] || isoDate;
}

function WeatherGlyph({ kind }: { kind: WeatherIconKind }) {
  const cls = 'w-4 h-4 shrink-0';
  switch (kind) {
    case 'clear':
      return <Sun className={`${cls} text-[#f7df59]`} />;
    case 'partly-cloudy':
      return <CloudSun className={`${cls} text-[#7dd3fc]`} />;
    case 'cloudy':
      return <Cloud className={`${cls} text-[#93c5fd]`} />;
    case 'fog':
      return <CloudFog className={`${cls} text-[#a5c8eb]`} />;
    case 'drizzle':
      return <CloudDrizzle className={`${cls} text-[#38bdf8]`} />;
    case 'rain':
      return <CloudRain className={`${cls} text-[#38bdf8]`} />;
    case 'snow':
      return <Snowflake className={`${cls} text-[#e0f2fe]`} />;
    case 'storm':
      return <CloudLightning className={`${cls} text-[#fbbf24]`} />;
  }
}

export function DailyWeatherPanel({
  days,
  isLoading,
  scopeLabel,
}: DailyWeatherPanelProps) {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  const safeIdx = selectedIdx < days.length ? selectedIdx : 0;
  const activeDay = days[safeIdx] ?? null;

  const { rangeMin, rangeSpan } = useMemo(() => {
    if (days.length === 0) return { rangeMin: 0, rangeSpan: 1 };
    const min = Math.min(...days.map((d) => d.tempMin));
    const max = Math.max(...days.map((d) => d.tempMax));
    return {
      rangeMin: min,
      rangeSpan: Math.max(1, max - min),
    };
  }, [days]);

  const activeInfo = activeDay ? describeWmoCodeAr(activeDay.weatherCode) : null;

  return (
    <section aria-label="توقعات الطقس اليومية" className="w-full max-w-[740px] mx-auto">
      <PanelHeader
        title="توقعات الطقس"
        action={
          <div className="flex items-center gap-3 text-[11px] text-[#8db8e6]">
            <span>{scopeLabel}</span>
            {activeDay && activeInfo && (
              <span className="hidden sm:inline-flex items-center gap-2 text-[#b8daf8]">
                <span>{activeInfo.label}</span>
                <span className="inline-flex items-center gap-1 font-tabular text-[#75d8ff]">
                  <Droplets className="w-3 h-3 text-[#38bdf8]" />
                  {activeDay.precipProb}%
                </span>
                <span className="inline-flex items-center gap-1 font-tabular text-[#a5d8ff]">
                  <Wind className="w-3 h-3 text-[#48f7ba]" />
                  {activeDay.windMaxKmh} كم/س
                </span>
              </span>
            )}
          </div>
        }
      />

      <div className="hud-table-surface px-2 py-2">
        {isLoading && days.length === 0 ? (
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-[74px] bg-cyan-500/10 animate-pulse rounded-[2px]"
              />
            ))}
          </div>
        ) : days.length === 0 ? (
          <div className="h-[74px] flex items-center justify-center text-xs text-[#78a4d4]">
            لا توجد بيانات طقس متاحة
          </div>
        ) : (
          <div className="flex overflow-x-auto pb-1 sm:pb-0 sm:grid sm:grid-cols-5 gap-1.5 syria-scroll">
            {days.map((day, idx) => {
              const info = describeWmoCodeAr(day.weatherCode);
              const isSelected = safeIdx === idx;
              const barLeftPct = ((day.tempMin - rangeMin) / rangeSpan) * 100;
              const barWidthPct = Math.max(
                18,
                ((day.tempMax - day.tempMin) / rangeSpan) * 100
              );

              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedIdx(idx)}
                  className={`min-w-[116px] sm:min-w-0 flex-1 flex flex-col justify-between px-2 py-1.5 text-right transition-colors cursor-pointer border ${
                    isSelected
                      ? 'bg-cyan-400/14 border-cyan-400/45'
                      : 'bg-[#071c47]/45 border-transparent hover:bg-cyan-400/8'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[11.5px] font-semibold truncate ${
                        isSelected ? 'text-white' : 'text-[#c3e0fc]'
                      }`}
                    >
                      {getArabicDayName(day.date, idx)}
                    </span>
                    <WeatherGlyph kind={info.icon} />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#83aedb] mt-1">
                    <span className="truncate">{info.label}</span>
                    {day.precipProb > 0 && (
                      <span className="font-tabular text-[#5ccdff] shrink-0">
                        {day.precipProb}%
                      </span>
                    )}
                  </div>

                  {/* Temperature min-to-max visual range bar + crisp tabular temps */}
                  <div className="mt-1.5 space-y-1">
                    <div
                      className="relative h-1 w-full rounded-full bg-[#0a2352] overflow-hidden"
                      dir="ltr"
                    >
                      <div
                        className="absolute top-0 bottom-0 rounded-full"
                        style={{
                          left: `${Math.min(82, barLeftPct)}%`,
                          width: `${Math.min(100 - barLeftPct, barWidthPct)}%`,
                          background:
                            'linear-gradient(90deg, #38bdf8 0%, #3bf0b2 55%, #f7df59 100%)',
                        }}
                      />
                    </div>
                    <div
                      className="flex items-center justify-between font-tabular text-[11px]"
                      dir="ltr"
                    >
                      <span className="text-[#77b6f2]">
                        {Math.round(day.tempMin)}°
                      </span>
                      <span className="text-[#f7e560] font-semibold">
                        {Math.round(day.tempMax)}°
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Mobile detail readout line for the selected forecast day */}
        {activeDay && activeInfo && (
          <div className="sm:hidden mt-2 pt-1.5 border-t border-cyan-500/15 flex items-center justify-between text-[11px] text-[#b8daf8]">
            <span>
              {getArabicDayName(activeDay.date, safeIdx)}: {activeInfo.label}
            </span>
            <div className="flex items-center gap-3 font-tabular">
              <span className="inline-flex items-center gap-1 text-[#75d8ff]">
                <Droplets className="w-3 h-3 text-[#38bdf8]" />
                {activeDay.precipProb}%
              </span>
              <span className="inline-flex items-center gap-1 text-[#a5d8ff]">
                <Wind className="w-3 h-3 text-[#48f7ba]" />
                {activeDay.windMaxKmh} كم/س
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
