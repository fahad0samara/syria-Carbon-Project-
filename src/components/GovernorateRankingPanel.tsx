import { PanelHeader } from './PanelHeader';
import { SYRIA_GOVERNORATES } from '../data/syriaGeo';
import {
  getAqiBadgeAr,
  type GovernorateAirQuality,
} from '../data/syriaRealData';

interface GovernorateRankingPanelProps {
  aqByGov: Record<string, GovernorateAirQuality>;
  isLoading: boolean;
  selectedGovId: string | null;
  onSelectGovernorate: (govId: string) => void;
}

export function GovernorateRankingPanel({
  aqByGov,
  isLoading,
  selectedGovId,
  onSelectGovernorate,
}: GovernorateRankingPanelProps) {
  const ranked = [...SYRIA_GOVERNORATES]
    .map((gov) => ({ gov, aq: aqByGov[gov.id] }))
    .filter((item): item is { gov: (typeof SYRIA_GOVERNORATES)[number]; aq: GovernorateAirQuality } => Boolean(item.aq))
    .sort((a, b) => b.aq.usAqi - a.aq.usAqi);

  const splitIdx = Math.ceil(ranked.length / 2);
  const firstCol = ranked.slice(0, splitIdx);
  const secondCol = ranked.slice(splitIdx);

  const renderRow = (
    item: { gov: (typeof SYRIA_GOVERNORATES)[number]; aq: GovernorateAirQuality },
    rank: number
  ) => {
    const badge = getAqiBadgeAr(item.aq.usAqi);
    const isSelected = selectedGovId === item.gov.id;

    const badgeStyle =
      badge.level === 'critical'
        ? 'bg-[#e64666] text-white'
        : badge.level === 'warning'
          ? 'bg-[#e8a725] text-[#041028]'
          : 'bg-[#2a9bf0] text-[#031330]';

    return (
      <button
        key={item.gov.id}
        type="button"
        onClick={() => onSelectGovernorate(item.gov.id)}
        className={`w-full flex items-center justify-between gap-1.5 py-0.5 px-1.5 text-right transition-colors cursor-pointer ${
          isSelected ? 'bg-cyan-400/18' : 'hover:bg-cyan-400/10'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-tabular text-[11px] text-[#7ea7d4] w-4 text-center shrink-0">
            {rank}
          </span>
          <span
            className={`text-[10px] font-bold px-1.5 py-[2px] rounded-[2px] leading-none shrink-0 ${badgeStyle}`}
          >
            {badge.label}
          </span>
          <span
            className={`text-xs truncate ${
              isSelected ? 'text-[#48f7ba] font-bold' : 'text-[#cfe6ff]'
            }`}
          >
            {item.gov.nameAr}
          </span>
        </div>
        <span className="font-tabular text-[10.5px] text-[#74c6ff] shrink-0">
          {item.aq.usAqi}
        </span>
      </button>
    );
  };

  return (
    <section aria-label="ترتيب المحافظات" className="w-full">
      <PanelHeader title="ترتيب المحافظات" />

      <div className="hud-table-surface px-2 py-2 grid grid-cols-2 gap-x-3">
        {isLoading && ranked.length === 0 ? (
          Array.from({ length: 14 }).map((_, idx) => (
            <div key={idx} className="h-5 my-0.5 bg-cyan-500/10 animate-pulse rounded" />
          ))
        ) : ranked.length === 0 ? (
          <div className="col-span-2 py-6 text-center text-xs text-[#78a4d4]">
            لا توجد بيانات متاحة
          </div>
        ) : (
          <>
            <div className="space-y-0.5">
              {firstCol.map((item, i) => renderRow(item, i + 1))}
            </div>
            <div className="space-y-0.5">
              {secondCol.map((item, i) => renderRow(item, i + splitIdx + 1))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
