import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, RefreshCw } from 'lucide-react';
import { AqiGaugePanel } from './components/AqiGaugePanel';
import { CarbonIndustryD3Panel } from './components/CarbonIndustryD3Panel';
import { CompareGovernoratesModal } from './components/CompareGovernoratesModal';
import { DailyWeatherPanel } from './components/DailyWeatherPanel';
import { DataReferencesFooter } from './components/DataReferencesFooter';
import { GovernorateRankingPanel } from './components/GovernorateRankingPanel';
import { HistoricalTrendsPanel } from './components/HistoricalTrendsPanel';
import { HourlyWavesPanel } from './components/HourlyWavesPanel';
import { PollutantBarsPanel } from './components/PollutantBarsPanel';
import { RegionalRadarPanel } from './components/RegionalRadarPanel';
import { SyriaMap3D } from './components/SyriaMap3D';
import { SYRIA_GOVERNORATES } from './data/syriaGeo';
import {
  fetchLiveSyriaCarbonIndustry,
  type SyriaCarbonIndustryDataset,
} from './data/syriaCarbonIndustry';
import {
  fetchLiveSyriaAirQuality,
  fetchLiveWorldBankSyriaHistory,
  type AlertLevel,
  type DailyWeatherDay,
  type GovernorateAirQuality,
  type HourlyPoint,
  type WorldBankYearMetric,
} from './data/syriaRealData';

const ARABIC_DAYS = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

function getDamascusDateParts(now: Date) {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Damascus',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    });
    const parts = Object.fromEntries(
      fmt.formatToParts(now).map((p) => [p.type, p.value])
    );
    const weekdayMap: Record<string, string> = {
      Sun: 'الأحد',
      Mon: 'الاثنين',
      Tue: 'الثلاثاء',
      Wed: 'الأربعاء',
      Thu: 'الخميس',
      Fri: 'الجمعة',
      Sat: 'السبت',
    };
    return {
      year: parts.year || String(now.getFullYear()),
      month: parts.month || String(now.getMonth() + 1).padStart(2, '0'),
      day: parts.day || String(now.getDate()).padStart(2, '0'),
      dayAr: weekdayMap[parts.weekday] || ARABIC_DAYS[now.getDay()],
    };
  } catch {
    return {
      year: String(now.getFullYear()),
      month: String(now.getMonth() + 1).padStart(2, '0'),
      day: String(now.getDate()).padStart(2, '0'),
      dayAr: ARABIC_DAYS[now.getDay()],
    };
  }
}

export default function App() {
  const [aqByGov, setAqByGov] = useState<Record<string, GovernorateAirQuality>>(
    {}
  );
  const [historyMetrics, setHistoryMetrics] = useState<WorldBankYearMetric[]>(
    []
  );
  const [carbonIndustryData, setCarbonIndustryData] =
    useState<SyriaCarbonIndustryDataset | null>(null);
  const [measuredAt, setMeasuredAt] = useState<string>('');
  const [selectedGovId, setSelectedGovId] = useState<string | null>(null);
  const [hoveredGovId, setHoveredGovId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AlertLevel | 'all'>('all');
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [comparePair, setComparePair] = useState<[string, string]>([
    SYRIA_GOVERNORATES[0].id,
    SYRIA_GOVERNORATES[1].id,
  ]);
  const [isLoadingAq, setIsLoadingAq] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingCarbon, setIsLoadingCarbon] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [carbonError, setCarbonError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  const openCompareWith = useCallback(
    (govId?: string) => {
      const sortedLive = Object.entries(aqByGov).sort(
        ([, a], [, b]) => b.usAqi - a.usAqi
      );
      const highestId = sortedLive[0]?.[0] ?? SYRIA_GOVERNORATES[0].id;
      const lowestId =
        sortedLive[sortedLive.length - 1]?.[0] ?? SYRIA_GOVERNORATES[1].id;

      const primary = govId || selectedGovId || highestId;
      let secondary =
        primary === highestId
          ? lowestId
          : highestId;
      if (secondary === primary) {
        secondary =
          SYRIA_GOVERNORATES.find((g) => g.id !== primary)?.id ??
          SYRIA_GOVERNORATES[1].id;
      }

      setComparePair([primary, secondary]);
      setIsCompareOpen(true);
    },
    [aqByGov, selectedGovId]
  );

  const loadHistoryData = useCallback(async () => {
    setIsLoadingHistory(true);
    setHistoryError(null);
    try {
      const data = await fetchLiveWorldBankSyriaHistory();
      setHistoryMetrics(data);
    } catch {
      setHistoryError('تعذر تحميل المؤشرات التاريخية من البنك الدولي.');
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const loadCarbonIndustryData = useCallback(async () => {
    setIsLoadingCarbon(true);
    setCarbonError(null);
    try {
      const data = await fetchLiveSyriaCarbonIndustry();
      setCarbonIndustryData(data);
    } catch {
      setCarbonError('تعذر تحميل بيانات الانبعاثات والأنشطة الصناعية.');
    } finally {
      setIsLoadingCarbon(false);
    }
  }, []);

  const loadAllLiveData = useCallback(async () => {
    setIsLoadingAq(true);
    setIsLoadingHistory(true);
    setIsLoadingCarbon(true);
    setLoadError(null);
    setHistoryError(null);
    setCarbonError(null);

    const [aqOutcome, wbOutcome, carbonOutcome] = await Promise.allSettled([
      fetchLiveSyriaAirQuality(),
      fetchLiveWorldBankSyriaHistory(),
      fetchLiveSyriaCarbonIndustry(),
    ]);

    if (aqOutcome.status === 'fulfilled') {
      setAqByGov(aqOutcome.value.data);
      setMeasuredAt(aqOutcome.value.measuredAt);
      setNow(new Date());
    } else {
      setLoadError('تعذر تحميل البيانات.');
    }
    setIsLoadingAq(false);

    if (wbOutcome.status === 'fulfilled') {
      setHistoryMetrics(wbOutcome.value);
    } else {
      setHistoryError('تعذر تحميل المؤشرات التاريخية من البنك الدولي.');
    }
    setIsLoadingHistory(false);

    if (carbonOutcome.status === 'fulfilled') {
      setCarbonIndustryData(carbonOutcome.value);
    } else {
      setCarbonError('تعذر تحميل بيانات الانبعاثات والأنشطة الصناعية.');
    }
    setIsLoadingCarbon(false);
  }, []);

  useEffect(() => {
    void loadAllLiveData();
  }, [loadAllLiveData]);

  const dateParts = useMemo(() => getDamascusDateParts(now), [now]);
  const measuredTimeLabel = measuredAt ? measuredAt.slice(11, 16) : '';

  const activeScope = useMemo(() => {
    if (selectedGovId && aqByGov[selectedGovId]) {
      const gov = SYRIA_GOVERNORATES.find((g) => g.id === selectedGovId);
      const d = aqByGov[selectedGovId];
      return {
        label: gov ? gov.nameAr : 'سوريا',
        isFiltered: true,
        metrics: {
          usAqi: d.usAqi,
          pm25: d.pm25,
          pm10: d.pm10,
          o3: d.o3,
        },
        hourly: d.hourly,
        dailyWeather: d.dailyWeather,
      };
    }

    const entries = Object.values(aqByGov);
    if (entries.length === 0) {
      return {
        label: 'سوريا',
        isFiltered: false,
        metrics: null,
        hourly: [] as HourlyPoint[],
        dailyWeather: [] as DailyWeatherDay[],
      };
    }

    const count = entries.length;
    const avg = (fn: (x: GovernorateAirQuality) => number) =>
      Math.round((entries.reduce((acc, e) => acc + fn(e), 0) / count) * 10) / 10;

    const baseHourly = entries.reduce<HourlyPoint[]>(
      (best, cur) => (cur.hourly.length > best.length ? cur.hourly : best),
      []
    );
    const hourlyMaps = entries.map(
      (e) => new Map(e.hourly.map((pt) => [pt.time, pt]))
    );
    const nationalHourly: HourlyPoint[] = baseHourly
      .map((pt) => {
        const matched = hourlyMaps
          .map((m) => m.get(pt.time))
          .filter((p): p is HourlyPoint => Boolean(p));
        if (matched.length === 0) return null;
        const mCount = matched.length;
        const avgField = (fn: (p: HourlyPoint) => number) =>
          Math.round((matched.reduce((s, p) => s + fn(p), 0) / mCount) * 10) /
          10;
        return {
          time: pt.time,
          pm25: avgField((p) => p.pm25),
          pm10: avgField((p) => p.pm10),
          no2: avgField((p) => p.no2),
          o3: avgField((p) => p.o3),
          dust: avgField((p) => p.dust),
        };
      })
      .filter((p): p is HourlyPoint => p !== null);

    // Compute live national 5-day weather forecast across all 14 Syrian governorates
    const baseDaily = entries.find((e) => e.dailyWeather.length > 0)?.dailyWeather || [];
    const nationalDaily: DailyWeatherDay[] = baseDaily.map((day, i) => {
      const valid = entries
        .map((e) => e.dailyWeather[i])
        .filter((d): d is DailyWeatherDay => Boolean(d));
      const n = Math.max(1, valid.length);
      // Most frequent WMO code across Syrian governorates for this day
      const freq = new Map<number, number>();
      valid.forEach((d) => freq.set(d.weatherCode, (freq.get(d.weatherCode) ?? 0) + 1));
      let dominantCode = day.weatherCode;
      let bestCount = -1;
      freq.forEach((cnt, code) => {
        if (cnt > bestCount) {
          bestCount = cnt;
          dominantCode = code;
        }
      });

      return {
        date: day.date,
        weatherCode: dominantCode,
        tempMax: Math.round((valid.reduce((s, d) => s + d.tempMax, 0) / n) * 10) / 10,
        tempMin: Math.round((valid.reduce((s, d) => s + d.tempMin, 0) / n) * 10) / 10,
        precipProb: Math.round(valid.reduce((s, d) => s + d.precipProb, 0) / n),
        windMaxKmh: Math.round(valid.reduce((s, d) => s + d.windMaxKmh, 0) / n),
      };
    });

    return {
      label: 'سوريا',
      isFiltered: false,
      metrics: {
        usAqi: Math.round(avg((e) => e.usAqi)),
        pm25: avg((e) => e.pm25),
        pm10: avg((e) => e.pm10),
        o3: avg((e) => e.o3),
      },
      hourly: nationalHourly,
      dailyWeather: nationalDaily,
    };
  }, [aqByGov, selectedGovId]);

  const isRefreshing = isLoadingAq || isLoadingHistory || isLoadingCarbon;

  return (
    <div className="syria-command-bg relative min-h-screen w-full text-[#e4f1ff] flex flex-col overflow-x-hidden">
      {/* Subtle dark cartographic regional silhouette behind grid */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1440 820"
        preserveAspectRatio="xMidYMid slice"
        className="pointer-events-none fixed inset-0 w-full h-full opacity-[0.14]"
      >
        <path
          d="M-40,120 Q180,90 340,165 T690,140 T1060,190 T1480,125 L1480,820 L-40,820 Z"
          fill="none"
          stroke="#2f7de1"
          strokeWidth="1.2"
          strokeDasharray="4 6"
        />
        <path
          d="M80,45 L240,115 L310,245 L220,380 L285,540 L170,720 L-40,760 L-40,45 Z"
          fill="#0b3175"
        />
        <path
          d="M1140,60 L1460,40 L1460,760 L1180,710 L1095,520 L1160,360 L1080,210 Z"
          fill="#0b3175"
        />
        <circle
          cx="720"
          cy="430"
          r="330"
          fill="none"
          stroke="rgba(56, 152, 255, 0.25)"
          strokeWidth="1"
          strokeDasharray="2 6"
        />
        <circle
          cx="720"
          cy="430"
          r="460"
          fill="none"
          stroke="rgba(56, 152, 255, 0.16)"
          strokeWidth="1"
        />
      </svg>

      <header className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-7 pt-3.5 pb-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
        <h1
          className="font-display text-xl sm:text-2xl lg:text-[26px] font-bold tracking-wide text-white leading-tight"
          style={{
            textShadow: '0 0 22px rgba(72, 198, 255, 0.35)',
            textWrap: 'balance',
          }}
        >
          جودة الهواء في سوريا
        </h1>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-[13px]">
            <span className="font-display font-semibold text-[#75d8ff] whitespace-nowrap">
              {dateParts.dayAr}
            </span>
            <div
              className="flex items-center gap-1"
              dir="ltr"
              aria-label={`التاريخ: ${dateParts.day}/${dateParts.month}/${dateParts.year}`}
            >
              <span className="hud-date-digit font-tabular px-1.5 py-0.5 font-semibold">
                {dateParts.day}
              </span>
              <span className="text-[#6995c4]">/</span>
              <span className="hud-date-digit font-tabular px-1.5 py-0.5 font-semibold">
                {dateParts.month}
              </span>
              <span className="text-[#6995c4]">/</span>
              <span className="hud-date-digit font-tabular px-1.5 py-0.5 font-semibold">
                {dateParts.year}
              </span>
            </div>
            {measuredTimeLabel && (
              <span className="hidden md:inline font-tabular text-[11.5px] text-[#9ac8f2]" dir="ltr">
                {measuredTimeLabel}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => openCompareWith()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[#cbe9ff] bg-[#08255a]/85 hover:bg-[#0d357c] border border-cyan-400/35 hover:border-cyan-300/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span className="sm:hidden">مقارنة</span>
              <span className="hidden sm:inline">مقارنة محافظتين</span>
            </button>

            <button
              type="button"
              onClick={() => void loadAllLiveData()}
              disabled={isRefreshing}
              aria-label="تحديث"
              title="تحديث"
              className="p-1.5 text-[#75d8ff] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>
      </header>

      {loadError && (
        <div className="relative z-20 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-7 pt-1">
          <div className="flex items-center justify-between gap-3 px-3 py-1.5 bg-rose-500/15 border border-rose-400/35 text-xs text-rose-200">
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => void loadAllLiveData()}
              className="underline underline-offset-4 text-white font-semibold cursor-pointer whitespace-nowrap"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      )}

      {/* Main Responsive Layout */}
      <main className="relative z-10 w-full max-w-[1600px] mx-auto flex-1 px-4 sm:px-6 lg:px-7 py-2.5 lg:py-2 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-4 lg:items-stretch">
        {/* Center Hero 3D Syria Map + Daily Weather Strip */}
        <section
          aria-label="خريطة سوريا وتوقعات الطقس"
          className="order-1 lg:order-2 lg:col-span-6 flex flex-col items-center justify-between gap-4 lg:gap-2 min-h-0"
        >
          <div className="w-full flex-1 min-h-0 flex items-center justify-center">
            <SyriaMap3D
              aqByGov={aqByGov}
              selectedGovId={selectedGovId}
              hoveredGovId={hoveredGovId}
              statusFilter={statusFilter}
              onSelectGovernorate={setSelectedGovId}
              onHoverGovernorate={setHoveredGovId}
              onChangeStatusFilter={setStatusFilter}
              onCompareGovernorate={openCompareWith}
            />
          </div>

          <DailyWeatherPanel
            days={activeScope.dailyWeather}
            isLoading={isLoadingAq}
            scopeLabel={activeScope.label}
          />
        </section>

        {/* Right Column in RTL */}
        <div className="order-2 lg:order-1 lg:col-span-3 flex flex-col justify-between gap-6 lg:gap-2 pb-2">
          <AqiGaugePanel
            scopeLabel={activeScope.label}
            isLoading={isLoadingAq}
            metrics={activeScope.metrics}
            isFiltered={activeScope.isFiltered}
            onResetScope={() => setSelectedGovId(null)}
          />

          <PollutantBarsPanel
            aqByGov={aqByGov}
            isLoading={isLoadingAq}
            selectedGovId={selectedGovId}
            onSelectGovernorate={setSelectedGovId}
          />

          <HourlyWavesPanel
            series={activeScope.hourly}
            isLoading={isLoadingAq}
            scopeLabel={activeScope.label}
          />
        </div>

        {/* Left Column in RTL */}
        <div className="order-3 lg:order-3 lg:col-span-3 flex flex-col justify-between gap-6 lg:gap-2 pb-4 lg:pb-2">
          <GovernorateRankingPanel
            aqByGov={aqByGov}
            isLoading={isLoadingAq}
            selectedGovId={selectedGovId}
            onSelectGovernorate={setSelectedGovId}
          />

          <RegionalRadarPanel
            aqByGov={aqByGov}
            isLoading={isLoadingAq}
            selectedGovId={selectedGovId}
            onSelectGovernorate={setSelectedGovId}
          />

          <HistoricalTrendsPanel
            metrics={historyMetrics}
            isLoading={isLoadingHistory}
            error={historyError}
            onRetry={() => void loadHistoryData()}
          />
        </div>
      </main>

      {/* Interactive D3 Carbon Emissions vs Industrial Activities Across Governorates & Years */}
      <div className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-7 pt-2 pb-4">
        <CarbonIndustryD3Panel
          dataset={carbonIndustryData}
          isLoading={isLoadingCarbon}
          error={carbonError}
          selectedGovId={selectedGovId}
          onSelectGovernorate={setSelectedGovId}
          onRetry={() => void loadCarbonIndustryData()}
        />
      </div>

      <DataReferencesFooter />

      <CompareGovernoratesModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        aqByGov={aqByGov}
        initialGovA={comparePair[0]}
        initialGovB={comparePair[1]}
      />
    </div>
  );
}
