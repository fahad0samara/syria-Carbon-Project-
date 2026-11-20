import { Fragment, useMemo } from 'react';
import { SYRIA_GOVERNORATES, SYRIA_MAP_VIEWBOX } from '../data/syriaGeo';
import {
  SYRIA_NETWORK_ARCS,
  getAlertLabelAr,
  getAlertLevel,
  type AlertLevel,
  type GovernorateAirQuality,
} from '../data/syriaRealData';

interface SyriaMap3DProps {
  aqByGov: Record<string, GovernorateAirQuality>;
  selectedGovId: string | null;
  hoveredGovId: string | null;
  statusFilter: AlertLevel | 'all';
  onSelectGovernorate: (govId: string | null) => void;
  onHoverGovernorate: (govId: string | null) => void;
  onChangeStatusFilter: (level: AlertLevel | 'all') => void;
  onCompareGovernorate: (govId: string) => void;
}

const STATUS_STYLE: Record<
  AlertLevel,
  {
    core: string;
    mid: string;
    edge: string;
    glow: string;
  }
> = {
  normal: {
    core: '#d4fff7',
    mid: '#2ce8f5',
    edge: '#00c8ff',
    glow: 'rgba(44, 232, 245, 0.85)',
  },
  warning: {
    core: '#fffad1',
    mid: '#f7d147',
    edge: '#f0a818',
    glow: 'rgba(247, 209, 71, 0.9)',
  },
  critical: {
    core: '#ffd6de',
    mid: '#ff4d6d',
    edge: '#e11d48',
    glow: 'rgba(255, 77, 109, 0.9)',
  },
};

export function SyriaMap3D({
  aqByGov,
  selectedGovId,
  hoveredGovId,
  statusFilter,
  onSelectGovernorate,
  onHoverGovernorate,
  onChangeStatusFilter,
  onCompareGovernorate,
}: SyriaMap3DProps) {
  const govMap = useMemo(
    () => Object.fromEntries(SYRIA_GOVERNORATES.map((g) => [g.id, g])),
    []
  );

  // Derive default focal governorate dynamically from the live highest-AQI governorate
  const highestAqiGovId = useMemo(() => {
    let bestId: string | null = null;
    let bestAqi = -1;
    for (const g of SYRIA_GOVERNORATES) {
      const aq = aqByGov[g.id];
      if (aq && aq.usAqi > bestAqi) {
        bestAqi = aq.usAqi;
        bestId = g.id;
      }
    }
    return bestId;
  }, [aqByGov]);

  const visualFocalId = hoveredGovId || selectedGovId || highestAqiGovId;
  const inspectorGovId = hoveredGovId || selectedGovId;
  const inspectorGov = inspectorGovId ? govMap[inspectorGovId] : null;
  const inspectorAq = inspectorGovId ? aqByGov[inspectorGovId] : null;

  // Build smooth arching corridor curves between neighboring Syrian governorates; highlight dynamically from live AQI or selection
  const arcPaths = useMemo(() => {
    return SYRIA_NETWORK_ARCS.map((arc, idx) => {
      const a = govMap[arc.from];
      const b = govMap[arc.to];
      if (!a || !b) return null;
      const mx = (a.stationX + b.stationX) / 2;
      const my = (a.stationY + b.stationY) / 2;
      const dist = Math.hypot(b.stationX - a.stationX, b.stationY - a.stationY);
      const lift = Math.min(76, Math.max(26, dist * 0.34));
      const d = `M${a.stationX},${a.stationY} Q${mx.toFixed(1)},${(my - lift).toFixed(1)} ${b.stationX},${b.stationY}`;
      const aqiA = aqByGov[arc.from]?.usAqi;
      const aqiB = aqByGov[arc.to]?.usAqi;
      const touchesFocus =
        Boolean(inspectorGovId) &&
        (arc.from === inspectorGovId || arc.to === inspectorGovId);
      const elevated =
        (aqiA !== undefined && aqiA >= 51) || (aqiB !== undefined && aqiB >= 51);
      return {
        id: `sy-arc-${idx}`,
        d,
        highlight: touchesFocus || elevated,
        dur: `${3.8 + (idx % 4) * 0.65}s`,
        begin: `${(idx * 0.42).toFixed(2)}s`,
      };
    }).filter(Boolean) as Array<{
      id: string;
      d: string;
      highlight: boolean;
      dur: string;
      begin: string;
    }>;
  }, [govMap, aqByGov, inspectorGovId]);

  // Draw Damascus after Rif Dimashq, and lifted focal governorate on top
  const orderedPolygons = useMemo(() => {
    return [...SYRIA_GOVERNORATES].sort((a, b) => {
      const aRank = a.id === visualFocalId ? 3 : a.id === 'damascus' ? 2 : 1;
      const bRank = b.id === visualFocalId ? 3 : b.id === 'damascus' ? 2 : 1;
      return aRank - bRank;
    });
  }, [visualFocalId]);

  const counts = useMemo(() => {
    const c: Record<AlertLevel, number> = { normal: 0, warning: 0, critical: 0 };
    SYRIA_GOVERNORATES.forEach((g) => {
      const aq = aqByGov[g.id];
      if (!aq) return;
      c[getAlertLevel(aq.usAqi)] += 1;
    });
    return c;
  }, [aqByGov]);

  const { width, height } = SYRIA_MAP_VIEWBOX;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      {/* Main Holographic 3D Syria Stage */}
      <div className="relative w-full max-w-[760px] mx-auto">
        {/* Desktop Floating HUD Popover (top-left empty sea space); stays clickable when selected, non-blocking on hover */}
        {inspectorGov && inspectorAq && (
          <div
            className={`hidden sm:block z-20 min-w-[244px] max-w-[272px] absolute top-1 left-1 bg-[#051a44]/92 backdrop-blur-sm border border-cyan-400/35 px-3 py-2 shadow-[0_8px_28px_rgba(0,12,40,0.68)] ${
              selectedGovId === inspectorGov.id
                ? 'pointer-events-auto'
                : 'pointer-events-none'
            }`}
            role="region"
            aria-label={`تفاصيل ${inspectorGov.nameAr}`}
          >
            <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-cyan-400/18">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-display text-sm font-bold text-white truncate">
                  {inspectorGov.nameAr}
                </span>
                <span className="text-[10.5px] text-cyan-300/90 whitespace-nowrap">
                  {getAlertLabelAr(getAlertLevel(inspectorAq.usAqi))}
                </span>
              </div>
              {selectedGovId === inspectorGov.id ? (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onCompareGovernorate(inspectorGov.id)}
                    className="text-[11px] text-[#f7e560] hover:text-white underline underline-offset-2 whitespace-nowrap cursor-pointer"
                  >
                    مقارنة
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectGovernorate(null)}
                    className="text-[11px] text-cyan-300 hover:text-white underline underline-offset-2 whitespace-nowrap cursor-pointer"
                  >
                    الكل
                  </button>
                </div>
              ) : (
                <span className="text-[10px] text-[#6d98c4] whitespace-nowrap">
                  انقر للتثبيت
                </span>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2 pt-1.5 text-center">
              <div>
                <div className="text-[9.5px] text-[#7ca8d4]">AQI</div>
                <div className="font-tabular text-xs font-bold text-[#48f7ba]">
                  {inspectorAq.usAqi}
                </div>
              </div>
              <div>
                <div className="text-[9.5px] text-[#7ca8d4]">PM2.5</div>
                <div className="font-tabular text-xs font-bold text-[#5ccdff]">
                  {inspectorAq.pm25}
                </div>
              </div>
              <div>
                <div className="text-[9.5px] text-[#7ca8d4]">SO₂</div>
                <div className="font-tabular text-xs font-bold text-[#f7df59]">
                  {inspectorAq.so2}
                </div>
              </div>
              <div>
                <div className="text-[9.5px] text-[#7ca8d4]">الحرارة</div>
                <div className="font-tabular text-xs font-bold text-white" dir="ltr">
                  {inspectorAq.temperatureC !== null
                    ? `${inspectorAq.temperatureC}°C`
                    : '-'}
                </div>
              </div>
            </div>

            <div className="mt-1.5 pt-1 border-t border-cyan-400/12 flex items-center justify-between gap-2 text-[10px] text-[#86b3e0]">
              <span>
                الرياح{' '}
                <span className="font-tabular text-[#cbe6ff]">
                  {inspectorAq.windKmh !== null ? `${inspectorAq.windKmh}` : '-'}
                </span>{' '}
                كم/س · الرطوبة{' '}
                <span className="font-tabular text-[#cbe6ff]">
                  {inspectorAq.humidityPct !== null ? `${inspectorAq.humidityPct}%` : '-'}
                </span>
              </span>
              <span className="font-tabular whitespace-nowrap">
                {inspectorGov.areaKm2.toLocaleString('en-US')} كم²
              </span>
            </div>
          </div>
        )}

        <svg
          viewBox={`0 15 ${width} ${height - 15}`}
          className="w-full h-auto lg:max-h-[520px] block mx-auto select-none overflow-visible"
          role="img"
          aria-label="خريطة الجمهورية العربية السورية التفاعلية ثلاثية الأبعاد"
        >
          <defs>
            {/* Fine luminous cyan dot-matrix fill matching the reference surface texture */}
            <pattern
              id="syriaDotMatrix"
              width="5.2"
              height="5.2"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1.6" cy="1.6" r="0.82" fill="rgba(136, 232, 255, 0.36)" />
            </pattern>

            {/* Clip to Syria's exact national boundary for true inward rim illumination */}
            <clipPath id="syriaNationalClip">
              {SYRIA_GOVERNORATES.map((g) => (
                <path key={`clip-${g.id}`} d={g.d} />
              ))}
            </clipPath>

            {/* Deep cobalt-sapphire interior surface */}
            <radialGradient id="syriaBaseFill" cx="46%" cy="46%" r="60%">
              <stop offset="0%" stopColor="#1657b5" stopOpacity="0.84" />
              <stop offset="65%" stopColor="#0e3c8d" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#0a2d70" stopOpacity="0.96" />
            </radialGradient>

            {/* Elevated focal governorate surface (deeper marine teal like reference highlighted district) */}
            <linearGradient id="syriaFocalFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d5b7a" stopOpacity="0.94" />
              <stop offset="100%" stopColor="#093c58" stopOpacity="0.98" />
            </linearGradient>

            {/* Crisp emerald-cyan 3D extruded bevel for the lifted governorate */}
            <linearGradient id="focalBevelGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#18b69b" />
              <stop offset="50%" stopColor="#46f5c0" />
              <stop offset="100%" stopColor="#1fa6c9" />
            </linearGradient>

            {/* Soft blur filters */}
            <filter id="syriaInsetRimBlur" x="-12%" y="-12%" width="124%" height="124%">
              <feGaussianBlur stdDeviation="8" />
            </filter>
            <filter id="syriaOuterHalo" x="-14%" y="-14%" width="128%" height="128%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="syriaDropShadow" x="-14%" y="-14%" width="128%" height="132%">
              <feGaussianBlur stdDeviation="10" />
            </filter>

            {/* Top-level userSpaceOnUse gradients for all 14 vertical plasma light pillars */}
            {SYRIA_GOVERNORATES.map((gov) => {
              const aq = aqByGov[gov.id];
              if (!aq) return null;
              const aqi = aq.usAqi;
              const level = getAlertLevel(aqi);
              const style = STATUS_STYLE[level];
              const isFocal = visualFocalId === gov.id;
              const isExplicit =
                hoveredGovId === gov.id || selectedGovId === gov.id;
              const liftY = isFocal ? (isExplicit ? -7 : -4) : 0;
              const sx = gov.stationX;
              const sy = gov.stationY + liftY;
              const beamH = Math.round(62 + Math.min(82, aqi * 1.05));

              return (
                <Fragment key={`grads-${gov.id}`}>
                  <linearGradient
                    id={`aura-${gov.id}`}
                    gradientUnits="userSpaceOnUse"
                    x1={sx}
                    y1={sy}
                    x2={sx}
                    y2={sy - beamH}
                  >
                    <stop offset="0%" stopColor={style.mid} stopOpacity="0.62" />
                    <stop offset="45%" stopColor={style.edge} stopOpacity="0.28" />
                    <stop offset="100%" stopColor={style.edge} stopOpacity="0" />
                  </linearGradient>
                  <linearGradient
                    id={`core-${gov.id}`}
                    gradientUnits="userSpaceOnUse"
                    x1={sx}
                    y1={sy}
                    x2={sx}
                    y2={sy - beamH * 0.94}
                  >
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                    <stop offset="22%" stopColor={style.core} stopOpacity="0.92" />
                    <stop offset="68%" stopColor={style.mid} stopOpacity="0.48" />
                    <stop offset="100%" stopColor={style.mid} stopOpacity="0" />
                  </linearGradient>
                </Fragment>
              );
            })}
          </defs>

          {/* Soft ambient shadow cast onto the dark command grid */}
          <g
            transform="translate(0, 22)"
            opacity="0.62"
            filter="url(#syriaDropShadow)"
            aria-hidden="true"
          >
            {SYRIA_GOVERNORATES.map((g) => (
              <path key={`sh-${g.id}`} d={g.d} fill="#01091c" />
            ))}
          </g>

          {/* Clean 3D Extruded Plateau Wall (stepped beveled cliff edge) */}
          <g aria-hidden="true">
            <g transform="translate(0, 12)">
              {SYRIA_GOVERNORATES.map((g) => (
                <path
                  key={`wall-bot-${g.id}`}
                  d={g.d}
                  fill="#0a3374"
                  stroke="#1c7cd6"
                  strokeWidth="1.2"
                />
              ))}
            </g>
            <g transform="translate(0, 6)">
              {SYRIA_GOVERNORATES.map((g) => (
                <path
                  key={`wall-mid-${g.id}`}
                  d={g.d}
                  fill="#0f4799"
                  stroke="#36b8fa"
                  strokeWidth="1.1"
                />
              ))}
            </g>
          </g>

          {/* Glowing Outer Perimeter Contour */}
          <g aria-hidden="true" filter="url(#syriaOuterHalo)" opacity="0.72">
            {SYRIA_GOVERNORATES.map((g) => (
              <path
                key={`outer-${g.id}`}
                d={g.d}
                fill="none"
                stroke="#4be8ff"
                strokeWidth="2.2"
              />
            ))}
          </g>

          {/* Syria Base Map Polygons + True Inward Cyan Shoreline Glow */}
          <g>
            {/* Base fills for non-lifted governorates */}
            {orderedPolygons
              .filter((g) => g.id !== visualFocalId)
              .map((gov) => {
                const govAq = aqByGov[gov.id];
                const level = govAq ? getAlertLevel(govAq.usAqi) : null;
                const dimmed =
                  statusFilter !== 'all' &&
                  level !== null &&
                  statusFilter !== level;

                return (
                  <g
                    key={gov.id}
                    onClick={() =>
                      onSelectGovernorate(selectedGovId === gov.id ? null : gov.id)
                    }
                    onMouseEnter={() => onHoverGovernorate(gov.id)}
                    onMouseLeave={() => onHoverGovernorate(null)}
                    className="cursor-pointer"
                    style={{
                      opacity: dimmed ? 0.34 : 1,
                      transition: 'opacity 200ms ease',
                    }}
                  >
                    <path
                      d={gov.d}
                      fill="url(#syriaBaseFill)"
                      stroke="rgba(126, 224, 255, 0.56)"
                      strokeWidth="1.05"
                      strokeLinejoin="round"
                    />
                    <path d={gov.d} fill="url(#syriaDotMatrix)" pointerEvents="none" />
                  </g>
                );
              })}

            {/* Inward luminous cyan rim glow clipped strictly inside Syria's silhouette */}
            <g clipPath="url(#syriaNationalClip)" pointerEvents="none">
              <g filter="url(#syriaInsetRimBlur)" opacity="0.34">
                {SYRIA_GOVERNORATES.map((g) => (
                  <path
                    key={`inrim-${g.id}`}
                    d={g.d}
                    fill="none"
                    stroke="#58ebff"
                    strokeWidth="7"
                  />
                ))}
              </g>
            </g>

            {/* Re-stroke crisp internal governorate borders above the inset glow */}
            <g pointerEvents="none">
              {SYRIA_GOVERNORATES.filter((g) => g.id !== visualFocalId).map((g) => (
                <path
                  key={`bdr-${g.id}`}
                  d={g.d}
                  fill="none"
                  stroke="rgba(146, 232, 255, 0.45)"
                  strokeWidth="0.95"
                  strokeLinejoin="round"
                />
              ))}
            </g>

            {/* Elevated Focal Governorate with Luminous Emerald-Cyan 3D Bevel Edge */}
            {visualFocalId &&
              govMap[visualFocalId] &&
              (() => {
                const focal = govMap[visualFocalId];
                const focalAq = aqByGov[focal.id];
                const focalLevel = focalAq ? getAlertLevel(focalAq.usAqi) : null;
                const focalDimmed =
                  statusFilter !== 'all' &&
                  focalLevel !== null &&
                  statusFilter !== focalLevel;
                const isExplicit =
                  hoveredGovId === focal.id || selectedGovId === focal.id;
                const liftPx = focalDimmed ? 0 : isExplicit ? -7 : -4;
                return (
                  <g
                    onClick={() =>
                      onSelectGovernorate(
                        selectedGovId === focal.id ? null : focal.id
                      )
                    }
                    onMouseEnter={() => onHoverGovernorate(focal.id)}
                    onMouseLeave={() => onHoverGovernorate(null)}
                    className="cursor-pointer"
                    style={{
                      transform: `translateY(${liftPx}px)`,
                      opacity: focalDimmed ? 0.34 : 1,
                      transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease',
                    }}
                  >
                    {/* Glowing emerald-mint 3D slab edge beneath the lifted governorate */}
                    <path
                      d={focal.d}
                      transform="translate(0, 7)"
                      fill="url(#focalBevelGrad)"
                      opacity="0.88"
                    />
                    <path
                      d={focal.d}
                      transform="translate(0, 3.5)"
                      fill="#12748c"
                      stroke="#5fffe0"
                      strokeWidth="1.2"
                    />
                    <path
                      d={focal.d}
                      fill="url(#syriaFocalFill)"
                      stroke="#7effe4"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                    <path d={focal.d} fill="url(#syriaDotMatrix)" pointerEvents="none" />
                  </g>
                );
              })()}
          </g>

          {/* Curved Luminous Telemetry Arcs & Moving Light Comets */}
          <g pointerEvents="none">
            {arcPaths.map((arc) => (
              <g key={arc.id}>
                <path
                  d={arc.d}
                  fill="none"
                  stroke={
                    arc.highlight
                      ? 'rgba(116, 245, 224, 0.62)'
                      : 'rgba(72, 198, 255, 0.36)'
                  }
                  strokeWidth={arc.highlight ? '1.3' : '0.95'}
                  strokeDasharray="3 4"
                  className="animate-arc-flow"
                />
                <circle
                  r={arc.highlight ? '2.6' : '2'}
                  fill={arc.highlight ? '#fff099' : '#8efbff'}
                  style={{
                    filter: arc.highlight
                      ? 'drop-shadow(0 0 6px #f7d147)'
                      : 'drop-shadow(0 0 6px #00e5ff)',
                  }}
                >
                  <animateMotion
                    dur={arc.dur}
                    begin={arc.begin}
                    repeatCount="indefinite"
                    path={arc.d}
                  />
                </circle>
              </g>
            ))}
          </g>

          {/* Ethereal Tapered Vertical Plasma Light Pillars & Concentric Target Rings */}
          <g>
            {SYRIA_GOVERNORATES.map((gov, idx) => {
              const aq = aqByGov[gov.id];
              if (!aq) return null;
              const aqi = aq.usAqi;
              const level = getAlertLevel(aqi);
              const style = STATUS_STYLE[level];
              const isFocal = visualFocalId === gov.id;
              const isExplicit =
                hoveredGovId === gov.id || selectedGovId === gov.id;
              const dimmed = statusFilter !== 'all' && statusFilter !== level;

              const liftY = isFocal ? (isExplicit ? -7 : -4) : 0;
              const sx = gov.stationX;
              const sy = gov.stationY + liftY;
              const beamH = Math.round(62 + Math.min(82, aqi * 1.05));

              return (
                <g
                  key={`pillar-${gov.id}`}
                  onClick={() =>
                    onSelectGovernorate(selectedGovId === gov.id ? null : gov.id)
                  }
                  onMouseEnter={() => onHoverGovernorate(gov.id)}
                  onMouseLeave={() => onHoverGovernorate(null)}
                  className="cursor-pointer"
                  style={{
                    opacity: dimmed ? 0.18 : 1,
                    transition: 'opacity 200ms ease',
                  }}
                >
                  {/* Concentric glowing holographic radar base rings */}
                  <ellipse
                    cx={sx}
                    cy={sy}
                    rx={isFocal ? 16 : 12.5}
                    ry={isFocal ? 8 : 6.2}
                    fill="none"
                    stroke={style.mid}
                    strokeWidth="0.95"
                    strokeDasharray="3 2.5"
                    opacity="0.72"
                  />
                  <ellipse
                    cx={sx}
                    cy={sy}
                    rx={isFocal ? 9.5 : 7.5}
                    ry={isFocal ? 4.8 : 3.8}
                    fill={style.mid}
                    fillOpacity="0.22"
                    stroke={style.core}
                    strokeWidth="0.95"
                  />

                  {/* Wide tapered ethereal light cone */}
                  <polygon
                    points={`${sx - 7},${sy} ${sx + 7},${sy} ${sx + 2.2},${sy - beamH} ${sx - 2.2},${sy - beamH}`}
                    fill={`url(#aura-${gov.id})`}
                    className="animate-beacon-soft"
                    style={{ animationDelay: `${(idx % 5) * 0.45}s` }}
                  />

                  {/* Razor-bright inner plasma shaft */}
                  <polygon
                    points={`${sx - 2.1},${sy} ${sx + 2.1},${sy} ${sx + 0.7},${sy - beamH * 0.94} ${sx - 0.7},${sy - beamH * 0.94}`}
                    fill={`url(#core-${gov.id})`}
                  />

                  {/* White-hot anchor core at base */}
                  <ellipse
                    cx={sx}
                    cy={sy}
                    rx={isFocal ? 3.8 : 2.9}
                    ry={isFocal ? 2.1 : 1.7}
                    fill="#ffffff"
                    style={{ filter: `drop-shadow(0 0 6px ${style.glow})` }}
                  />
                </g>
              );
            })}
          </g>

          {/* Clean Arabic Governorate Labels */}
          <g pointerEvents="none">
            {SYRIA_GOVERNORATES.map((gov) => {
              const govAq = aqByGov[gov.id];
              const level = govAq ? getAlertLevel(govAq.usAqi) : null;
              const isFocal = visualFocalId === gov.id;
              const isExplicit =
                hoveredGovId === gov.id || selectedGovId === gov.id;
              const dimmed =
                statusFilter !== 'all' &&
                level !== null &&
                statusFilter !== level;

              return (
                <text
                  key={`name-${gov.id}`}
                  x={gov.labelX}
                  y={gov.labelY + (isFocal ? (isExplicit ? -7 : -4) : 0)}
                  textAnchor="middle"
                  className="font-display"
                  style={{
                    fontSize: isExplicit ? '13.5px' : '11.5px',
                    fontWeight: isExplicit ? 800 : 600,
                    fill: isExplicit ? '#ffffff' : '#cce8ff',
                    opacity: dimmed ? 0.3 : 0.95,
                    paintOrder: 'stroke',
                    stroke: 'rgba(3, 14, 41, 0.92)',
                    strokeWidth: '3.2px',
                    strokeLinejoin: 'round',
                  }}
                >
                  {gov.nameAr}
                </text>
              );
            })}
          </g>
        </svg>

        {/* Bottom-Right Vertical 3-Beacon Legend */}
        <div
          className="mt-1 sm:mt-0 sm:absolute sm:bottom-2 sm:right-2 flex sm:flex-col flex-row items-center sm:items-start justify-center gap-3 sm:gap-2"
          role="group"
          aria-label="تصفية المحطات حسب الحالة"
        >
          {(['normal', 'warning', 'critical'] as AlertLevel[]).map((level) => {
            const st = STATUS_STYLE[level];
            const active = statusFilter === level;
            const disabled = counts[level] === 0 && !active;
            return (
              <button
                key={level}
                type="button"
                disabled={disabled}
                onClick={() => onChangeStatusFilter(active ? 'all' : level)}
                className={`flex items-center gap-2 px-1.5 py-0.5 text-[11.5px] transition-colors whitespace-nowrap ${
                  disabled
                    ? 'opacity-45 cursor-default text-[#7ea7d4]'
                    : active
                      ? 'text-white font-bold underline underline-offset-4 cursor-pointer'
                      : 'text-[#a5ccf0] hover:text-white cursor-pointer'
                }`}
              >
                <span
                  className="relative flex flex-col items-center justify-end w-4 h-5 shrink-0"
                  aria-hidden="true"
                >
                  <span
                    className="w-[2px] h-3.5 rounded-full"
                    style={{
                      background: `linear-gradient(to top, ${st.core}, ${st.mid}, transparent)`,
                      boxShadow: `0 0 6px ${st.glow}`,
                    }}
                  />
                  <span
                    className="w-3.5 h-1.5 rounded-full border -mt-0.5"
                    style={{
                      borderColor: st.mid,
                      backgroundColor: `${st.mid}33`,
                      boxShadow: `0 0 6px ${st.glow}`,
                    }}
                  />
                </span>
                <span>{getAlertLabelAr(level)}</span>
                <span className="font-tabular text-[10px] text-[#6d98c4]">
                  ({counts[level]})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Selected Governorate Details Card (below map so tapping never shifts the map!) */}
      {selectedGovId && govMap[selectedGovId] && aqByGov[selectedGovId] && (
        <div
          className="sm:hidden w-full mt-2.5 bg-[#051a44]/90 border border-cyan-400/35 px-3 py-2"
          role="region"
          aria-label={`تفاصيل ${govMap[selectedGovId].nameAr}`}
        >
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-cyan-400/18">
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-bold text-white">
                {govMap[selectedGovId].nameAr}
              </span>
              <span className="text-[10.5px] text-cyan-300">
                {getAlertLabelAr(getAlertLevel(aqByGov[selectedGovId].usAqi))}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => onCompareGovernorate(selectedGovId)}
                className="text-[11px] text-[#f7e560] underline underline-offset-2 cursor-pointer"
              >
                مقارنة
              </button>
              <button
                type="button"
                onClick={() => onSelectGovernorate(null)}
                className="text-[11px] text-cyan-300 underline underline-offset-2 cursor-pointer"
              >
                الكل
              </button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 pt-1.5 text-center">
            <div>
              <div className="text-[9.5px] text-[#7ca8d4]">AQI</div>
              <div className="font-tabular text-xs font-bold text-[#48f7ba]">
                {aqByGov[selectedGovId].usAqi}
              </div>
            </div>
            <div>
              <div className="text-[9.5px] text-[#7ca8d4]">PM2.5</div>
              <div className="font-tabular text-xs font-bold text-[#5ccdff]">
                {aqByGov[selectedGovId].pm25}
              </div>
            </div>
            <div>
              <div className="text-[9.5px] text-[#7ca8d4]">SO₂</div>
              <div className="font-tabular text-xs font-bold text-[#f7df59]">
                {aqByGov[selectedGovId].so2}
              </div>
            </div>
            <div>
              <div className="text-[9.5px] text-[#7ca8d4]">الحرارة</div>
              <div className="font-tabular text-xs font-bold text-white" dir="ltr">
                {aqByGov[selectedGovId].temperatureC !== null
                  ? `${aqByGov[selectedGovId].temperatureC}°C`
                  : '-'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slim Mobile-Only Touch Quick-Picker for all 14 Syrian governorates */}
      <div className="w-full mt-3 lg:hidden">
        <div
          className="flex items-center gap-1.5 overflow-x-auto pb-1 syria-scroll"
          role="listbox"
          aria-label="اختيار المحافظة"
        >
          <button
            type="button"
            onClick={() => onSelectGovernorate(null)}
            className={`px-2.5 py-1 text-[11.5px] whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
              selectedGovId === null
                ? 'bg-cyan-400/20 border-cyan-300/70 text-white font-semibold'
                : 'bg-[#071e4c]/70 border-cyan-500/20 text-[#9dc4eb]'
            }`}
          >
            كل سوريا
          </button>
          {SYRIA_GOVERNORATES.map((gov) => {
            const active = selectedGovId === gov.id;
            const aqi = aqByGov[gov.id]?.usAqi;
            return (
              <button
                key={gov.id}
                type="button"
                onClick={() => onSelectGovernorate(active ? null : gov.id)}
                className={`px-2.5 py-1 text-[11.5px] whitespace-nowrap shrink-0 border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  active
                    ? 'bg-cyan-400/20 border-cyan-300/70 text-white font-semibold'
                    : 'bg-[#071e4c]/70 border-cyan-500/20 text-[#9dc4eb]'
                }`}
              >
                <span>{gov.nameAr}</span>
                {aqi !== undefined && (
                  <span className="font-tabular text-[10px] text-cyan-300">
                    {aqi}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
