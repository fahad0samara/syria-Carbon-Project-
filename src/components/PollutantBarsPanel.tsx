import { useMemo, useState } from 'react';
import { PanelHeader } from './PanelHeader';
import { SYRIA_GOVERNORATES } from '../data/syriaGeo';
import type { GovernorateAirQuality } from '../data/syriaRealData';

interface PollutantBarsPanelProps {
  aqByGov: Record<string, GovernorateAirQuality>;
  isLoading: boolean;
  selectedGovId: string | null;
  onSelectGovernorate: (govId: string) => void;
}

type MetricKey = 'pm10' | 'pm25' | 'o3' | 'so2';

const METRIC_OPTIONS: Array<{ key: MetricKey; label: string }> = [
  { key: 'pm10', label: 'PM10' },
  { key: 'pm25', label: 'PM2.5' },
  { key: 'o3', label: 'الأوزون' },
  { key: 'so2', label: 'الكبريت' },
];

export function PollutantBarsPanel({
  aqByGov,
  isLoading,
  selectedGovId,
  onSelectGovernorate,
}: PollutantBarsPanelProps) {
  const [metric, setMetric] = useState<MetricKey>('pm10');

  const topFive = useMemo(() => {
    return [...SYRIA_GOVERNORATES]
      .map((gov) => ({
        gov,
        value: aqByGov[gov.id]?.[metric] ?? null,
      }))
      .filter((item): item is { gov: (typeof SYRIA_GOVERNORATES)[number]; value: number } => item.value !== null)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [aqByGov, metric]);

  const maxVal = useMemo(
    () => Math.max(1, ...topFive.map((item) => item.value)),
    [topFive]
  );

  return (
    <section aria-label="أعلى المحافظات" className="w-full">
      <PanelHeader
        title="أعلى المحافظات"
        action={
          <div className="flex items-center gap-1.5 text-[11px]" role="tablist" aria-label="اختيار الملوث">
            {METRIC_OPTIONS.map((opt, idx) => (
              <span key={opt.key} className="inline-flex items-center gap-1.5">
                {idx > 0 && <span className="text-[#365a85]" aria-hidden="true">/</span>}
                <button
                  type="button"
                  role="tab"
                  aria-selected={metric === opt.key}
                  onClick={() => setMetric(opt.key)}
                  className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    metric === opt.key
                      ? 'text-cyan-300 font-semibold underline underline-offset-4'
                      : 'text-[#6c96c4] hover:text-cyan-200'
                  }`}
                >
                  {opt.label}
                </button>
              </span>
            ))}
          </div>
        }
      />

      <div className="space-y-3 pt-1">
        {isLoading && topFive.length === 0 ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[90px_1fr_68px] items-center gap-3">
              <div className="h-3 bg-cyan-500/15 animate-pulse rounded" />
              <div className="h-[11px] bg-cyan-500/10 animate-pulse rounded-full" />
              <div className="h-3 bg-cyan-500/15 animate-pulse rounded" />
            </div>
          ))
        ) : topFive.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#78a4d4]">
            لا توجد بيانات متاحة
          </div>
        ) : (
          topFive.map(({ gov, value }) => {
            const pct =
              value > 0 ? Math.max(3, Math.min(100, (value / maxVal) * 100)) : 0;
            const isSelected = selectedGovId === gov.id;

            return (
              <button
                key={gov.id}
                type="button"
                onClick={() => onSelectGovernorate(gov.id)}
                className="w-full grid grid-cols-[minmax(74px,88px)_1fr_minmax(74px,auto)] items-center gap-3 text-right group cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
                title={`محافظة ${gov.nameAr}: ${value} ميكروغرام/م³`}
              >
                <span
                  className={`text-xs truncate transition-colors ${
                    isSelected
                      ? 'text-[#48f7ba] font-semibold'
                      : 'text-[#b7d6f5] group-hover:text-white'
                  }`}
                >
                  {gov.nameAr}
                </span>

                <div className="relative h-[11px] w-full rounded-full bg-[#09214d]/85 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background: isSelected
                        ? 'linear-gradient(270deg, #3bf0b2 0%, #34c6ff 100%)'
                        : 'linear-gradient(270deg, #49cbff 0%, #2494f2 100%)',
                      boxShadow: isSelected
                        ? '0 0 10px rgba(59, 240, 178, 0.65)'
                        : '0 0 8px rgba(73, 203, 255, 0.5)',
                    }}
                  />
                </div>

                <span className="font-tabular text-xs text-[#69c6ff] text-left whitespace-nowrap" dir="ltr">
                  {value}{' '}
                  <span className="text-[10px] text-[#6d98c4]">µg/m³</span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
