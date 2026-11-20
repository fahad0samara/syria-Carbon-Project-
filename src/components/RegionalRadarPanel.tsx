import { useMemo, useState } from 'react';
import { PanelHeader } from './PanelHeader';
import { SYRIA_GOVERNORATES } from '../data/syriaGeo';
import type { GovernorateAirQuality } from '../data/syriaRealData';

interface RegionalRadarPanelProps {
  aqByGov: Record<string, GovernorateAirQuality>;
  isLoading: boolean;
  selectedGovId: string | null;
  onSelectGovernorate: (govId: string) => void;
}

export function RegionalRadarPanel({
  aqByGov,
  isLoading,
  selectedGovId,
  onSelectGovernorate,
}: RegionalRadarPanelProps) {
  const [hoveredHubId, setHoveredHubId] = useState<string | null>(null);

  // Dynamically select the top 6 Syrian governorates by live US AQI (always including selectedGovId if active)
  const hubs = useMemo(() => {
    const live = SYRIA_GOVERNORATES.filter((g) => Boolean(aqByGov[g.id])).sort(
      (a, b) => (aqByGov[b.id]?.usAqi ?? 0) - (aqByGov[a.id]?.usAqi ?? 0)
    );
    const top = live.slice(0, 6);
    if (
      selectedGovId &&
      aqByGov[selectedGovId] &&
      !top.some((g) => g.id === selectedGovId)
    ) {
      const sel = SYRIA_GOVERNORATES.find((g) => g.id === selectedGovId);
      if (sel && top.length === 6) {
        top[5] = sel;
      } else if (sel) {
        top.push(sel);
      }
    }
    return top;
  }, [aqByGov, selectedGovId]);

  const cx = 148;
  const cy = 92;
  const maxR = 62;
  const levels = [1, 0.78, 0.56, 0.34];
  const n = Math.max(3, hubs.length);

  const hasData = hubs.length >= 3;

  const angleFor = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

  const pointAt = (i: number, ratio: number): [number, number] => {
    const a = angleFor(i);
    const r = maxR * Math.max(0.05, Math.min(1, ratio));
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };

  // True data-driven scale bounds (no hardcoded inflation floors)
  const maxO3 = Math.max(1, ...hubs.map((h) => aqByGov[h.id]?.o3 ?? 0));
  const maxAqi = Math.max(1, ...hubs.map((h) => aqByGov[h.id]?.usAqi ?? 0));

  const o3Points = hubs.map((h, i) =>
    pointAt(i, (aqByGov[h.id]?.o3 ?? 0) / maxO3)
  );
  const aqiPoints = hubs.map((h, i) =>
    pointAt(i, (aqByGov[h.id]?.usAqi ?? 0) / maxAqi)
  );

  const toPoly = (pts: Array<[number, number]>) =>
    pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

  const hoveredHub = hoveredHubId
    ? hubs.find((h) => h.id === hoveredHubId)
    : null;
  const hoveredAq = hoveredHubId ? aqByGov[hoveredHubId] : null;

  return (
    <section aria-label="أعلى المحافظات (الأوزون والمؤشر)" className="w-full relative">
      <PanelHeader title="الأوزون والمؤشر" />

      <div className="relative flex items-center justify-center min-h-[168px]">
        {hasData && (
          <div className="absolute top-0 left-1 flex flex-col gap-1 text-[10px] text-[#9ec4ea]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-1.5 bg-[#00e5ff] inline-block" />
              الأوزون
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-1.5 bg-[#f5e050] inline-block" />
              AQI
            </span>
          </div>
        )}

        {isLoading && !hasData ? (
          <div className="text-xs text-[#78a4d4] animate-pulse">
            جارٍ التحميل...
          </div>
        ) : !hasData ? (
          <div className="text-xs text-[#78a4d4]">
            لا توجد بيانات متاحة
          </div>
        ) : (
          <svg
            viewBox="0 0 296 184"
            className="w-full max-w-[300px] h-[168px] overflow-visible"
            role="img"
            aria-label="مخطط مقارن للأوزون ومؤشر جودة الهواء لأعلى ست محافظات سورية حالياً"
            onMouseLeave={() => setHoveredHubId(null)}
          >
            {levels.map((lvl, idx) => {
              const pts = hubs.map((_, i) => pointAt(i, lvl));
              return (
                <polygon
                  key={lvl}
                  points={toPoly(pts)}
                  fill={`rgba(24, 82, 168, ${0.14 + idx * 0.08})`}
                  stroke="rgba(86, 174, 255, 0.22)"
                  strokeWidth="0.9"
                />
              );
            })}

            {hubs.map((hub, i) => {
              const [x, y] = pointAt(i, 1);
              return (
                <line
                  key={hub.id}
                  x1={cx}
                  y1={cy}
                  x2={x}
                  y2={y}
                  stroke="rgba(86, 174, 255, 0.16)"
                  strokeWidth="0.9"
                />
              );
            })}

            <polygon
              points={toPoly(o3Points)}
              fill="rgba(0, 229, 255, 0.28)"
              stroke="#22e8ff"
              strokeWidth="1.6"
              style={{ filter: 'drop-shadow(0 0 5px rgba(0, 229, 255, 0.45))' }}
            />
            {o3Points.map(([x, y], i) => (
              <circle
                key={`o3-${i}`}
                cx={x}
                cy={y}
                r="2.4"
                fill="#d8ffff"
                stroke="#00d4ff"
                strokeWidth="1"
              />
            ))}

            <polygon
              points={toPoly(aqiPoints)}
              fill="rgba(245, 224, 80, 0.26)"
              stroke="#f5e050"
              strokeWidth="1.6"
              style={{ filter: 'drop-shadow(0 0 5px rgba(245, 224, 80, 0.45))' }}
            />
            {aqiPoints.map(([x, y], i) => (
              <circle
                key={`aqi-${i}`}
                cx={x}
                cy={y}
                r="2.4"
                fill="#fff9cc"
                stroke="#f5c542"
                strokeWidth="1"
              />
            ))}

            {hubs.map((hub, i) => {
              const a = angleFor(i);
              const lx = cx + (maxR + 24) * Math.cos(a);
              const ly = cy + (maxR + 18) * Math.sin(a);
              const isSelected = selectedGovId === hub.id;

              return (
                <g
                  key={hub.id}
                  onClick={() => onSelectGovernorate(hub.id)}
                  onMouseEnter={() => setHoveredHubId(hub.id)}
                  className="cursor-pointer"
                >
                  <text
                    x={lx}
                    y={ly + 3}
                    textAnchor="middle"
                    className={`text-[11px] transition-colors ${
                      isSelected
                        ? 'fill-[#48f7ba] font-bold'
                        : 'fill-[#94bee8] hover:fill-white font-medium'
                    }`}
                  >
                    {hub.nameAr}
                  </text>
                </g>
              );
            })}
          </svg>
        )}

        {hoveredHub && hoveredAq && (
          <div
            className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none flex items-center justify-between px-2.5 py-1 bg-[#05183e]/95 border border-cyan-400/35 text-[10.5px]"
            role="status"
          >
            <span className="font-semibold text-white">{hoveredHub.nameAr}</span>
            <div className="flex items-center gap-3 text-[#d7eeff]">
              <span>
                الأوزون <span className="font-tabular text-cyan-300">{hoveredAq.o3}</span> µg/m³
              </span>
              <span>
                المؤشر <span className="font-tabular text-amber-300">{hoveredAq.usAqi}</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
