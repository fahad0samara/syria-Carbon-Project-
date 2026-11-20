import { PanelHeader } from './PanelHeader';

interface AqiGaugePanelProps {
  scopeLabel: string;
  isLoading: boolean;
  metrics: {
    usAqi: number;
    pm25: number;
    pm10: number;
    o3: number;
  } | null;
  isFiltered: boolean;
  onResetScope: () => void;
}

interface RingDef {
  id: string;
  value: number | null;
  max: number;
  label: string;
  sublabel: string;
  stroke: string;
  glow: string;
  textColor: string;
  startAngleDeg: number;
}

export function AqiGaugePanel({
  scopeLabel,
  isLoading,
  metrics,
  isFiltered,
  onResetScope,
}: AqiGaugePanelProps) {
  const rings: RingDef[] = [
    {
      id: 'aqi',
      value: metrics ? Math.round(metrics.usAqi) : null,
      max: 150,
      label: 'مؤشر الهواء',
      sublabel: 'US AQI',
      stroke: '#3bf0b2',
      glow: 'rgba(59, 240, 178, 0.55)',
      textColor: '#48f7ba',
      startAngleDeg: 115,
    },
    {
      id: 'o3',
      value: metrics ? Math.round(metrics.o3) : null,
      max: 180,
      label: 'الأوزون',
      sublabel: 'O₃ µg/m³',
      stroke: '#358cff',
      glow: 'rgba(53, 140, 255, 0.55)',
      textColor: '#4da3ff',
      startAngleDeg: 145,
    },
    {
      id: 'pm10',
      value: metrics ? Math.round(metrics.pm10) : null,
      max: 150,
      label: 'الغبار العالق',
      sublabel: 'PM10 µg/m³',
      stroke: '#f5df4d',
      glow: 'rgba(245, 223, 77, 0.55)',
      textColor: '#f7e560',
      startAngleDeg: 100,
    },
  ];

  const radius = 34;
  const circumference = 2 * Math.PI * radius;

  return (
    <section aria-label="جودة الهواء" className="w-full">
      <PanelHeader
        title="جودة الهواء"
        action={
          isFiltered ? (
            <button
              type="button"
              onClick={onResetScope}
              className="text-[11px] text-cyan-300 hover:text-white underline underline-offset-4 transition-colors px-1 py-0.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              كل سوريا
            </button>
          ) : (
            <span className="text-[11px] text-[#78a4d4] whitespace-nowrap">
              {scopeLabel}
            </span>
          )
        }
      />

      <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1">
        {rings.map((ring) => {
          const pct =
            ring.value !== null && ring.value > 0
              ? Math.max(0.03, Math.min(1, ring.value / ring.max))
              : 0;
          const dashOffset = circumference * (1 - pct);

          return (
            <div key={ring.id} className="flex flex-col items-center text-center">
              <div className="relative w-[84px] h-[84px] sm:w-[90px] sm:h-[90px]">
                <svg
                  viewBox="0 0 92 92"
                  className="w-full h-full"
                  role="img"
                  aria-label={`${ring.label}: ${ring.value ?? 'غير متوفر'}`}
                >
                  <circle
                    cx="46"
                    cy="46"
                    r={radius}
                    fill="rgba(4, 18, 46, 0.58)"
                    stroke="rgba(160, 198, 240, 0.14)"
                    strokeWidth="8.5"
                  />
                  <circle
                    cx="46"
                    cy="46"
                    r="27"
                    fill="none"
                    stroke="rgba(125, 188, 255, 0.16)"
                    strokeWidth="1"
                  />
                  {ring.value !== null && pct > 0 && (
                    <circle
                      cx="46"
                      cy="46"
                      r={radius}
                      fill="none"
                      stroke={ring.stroke}
                      strokeWidth="8.5"
                      strokeLinecap="butt"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                      transform={`rotate(${ring.startAngleDeg} 46 46)`}
                      style={{
                        filter: `drop-shadow(0 0 5px ${ring.glow})`,
                        transition: 'stroke-dashoffset 500ms cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    />
                  )}
                </svg>

                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className={`font-tabular text-[22px] sm:text-[25px] font-bold leading-none ${
                      isLoading && ring.value === null ? 'animate-pulse opacity-50' : ''
                    }`}
                    style={{
                      color: ring.textColor,
                      textShadow: `0 0 12px ${ring.glow}`,
                    }}
                  >
                    {ring.value !== null ? ring.value : isLoading ? '...' : '-'}
                  </span>
                </div>
              </div>

              <span className="mt-1.5 text-[11px] font-semibold text-[#b8daf8] leading-tight whitespace-nowrap">
                {ring.label}
              </span>
              <span className="text-[9.5px] text-[#6d98c4] leading-tight mt-0.5 whitespace-nowrap">
                {ring.sublabel}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
