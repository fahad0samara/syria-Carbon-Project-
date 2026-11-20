import { ExternalLink } from 'lucide-react';

interface DataReferenceItem {
  id: string;
  nameAr: string;
  provider: string;
  scopeAr: string;
  detailAr: string;
  url: string;
}

const DATA_REFERENCES: DataReferenceItem[] = [
  {
    id: 'open-meteo-aq',
    nameAr: 'جودة الهواء والملوثات',
    provider: 'Open-Meteo · Copernicus CAMS',
    scopeAr: 'قراءات فورية وساعية (24 ساعة) للمحافظات الـ 14',
    detailAr: 'US AQI، EU AQI، PM2.5، PM10، O₃، NO₂، SO₂، CO، الغبار',
    url: 'https://open-meteo.com/en/docs/air-quality-api',
  },
  {
    id: 'open-meteo-weather',
    nameAr: 'الطقس والتوقعات اليومية',
    provider: 'Open-Meteo Forecast · WMO',
    scopeAr: 'الحالة الحالية وتوقعات 5 أيام للمحافظات الـ 14',
    detailAr: 'الحرارة العظمى والصغرى، الرطوبة، الرياح، احتمال الهطول',
    url: 'https://open-meteo.com/en/docs',
  },
  {
    id: 'world-bank',
    nameAr: 'المؤشرات البيئية التاريخية',
    provider: 'World Bank Open Data API v2',
    scopeAr: 'أحدث 5 سنوات سنوية مكتملة لسوريا (SYR)',
    detailAr: 'EN.GHG.CO2.MT.CE.AR5 · EN.ATM.PM25.MC.M3 · EN.GHG.CO2.PC.CE.AR5',
    url: 'https://data.worldbank.org/country/syrian-arab-republic',
  },
  {
    id: 'climate-trace',
    nameAr: 'انبعاثات الكربون والأنشطة الصناعية',
    provider: 'Climate TRACE API v6',
    scopeAr: 'سجلات المنشآت والقطاعات الصناعية في سوريا عبر السنوات',
    detailAr: 'الطاقة، النفط والغاز، الإسمنت والصناعات الثقيلة، الوقود الصناعي (GADM SYR.1-SYR.14)',
    url: 'https://climatetrace.org/data',
  },
];

const STANDARD_LINKS = [
  {
    label: 'معيار US EPA AQI',
    url: 'https://www.airnow.gov/aqi/aqi-basics/',
  },
  {
    label: 'إرشادات منظمة الصحة العالمية WHO AQG',
    url: 'https://www.who.int/publications/i/item/9789240034228',
  },
  {
    label: 'الحدود الإدارية GADM Syria',
    url: 'https://gadm.org/maps/SYR.html',
  },
];

export function DataReferencesFooter() {
  return (
    <footer
      aria-label="مصادر ومراجع البيانات"
      className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-7 pb-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="hud-title-bar">
          <span className="bracket-tl" aria-hidden="true" />
          <span className="bracket-br" aria-hidden="true" />
          <h2 className="font-display text-[13.5px] sm:text-[14.5px] font-semibold tracking-wide text-[#c8e4ff] leading-tight whitespace-nowrap">
            مصادر ومراجع البيانات
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#7ea7d4]">
          {STANDARD_LINKS.map((ref) => (
            <a
              key={ref.url}
              href={ref.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-[#75d8ff] transition-colors whitespace-nowrap"
            >
              <span>{ref.label}</span>
              <ExternalLink className="w-3 h-3 shrink-0 opacity-75" />
            </a>
          ))}
        </div>
      </div>

      <div className="hud-table-surface grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {DATA_REFERENCES.map((item, idx) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`group p-3 sm:p-3.5 flex flex-col justify-between gap-1.5 hover:bg-cyan-400/5 transition-colors border-cyan-400/15 ${
              idx < DATA_REFERENCES.length - 1 ? 'border-b' : ''
            } ${idx < 2 ? 'sm:border-b' : 'sm:border-b-0'} ${
              idx % 2 === 1 ? 'sm:border-r' : ''
            } lg:border-b-0 ${idx > 0 ? 'lg:border-r' : ''}`}
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="font-display text-[12.5px] font-semibold text-[#e3f2ff] group-hover:text-white leading-snug">
                  {item.nameAr}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-[#6698cc] group-hover:text-[#75d8ff] shrink-0 mt-0.5 transition-colors" />
              </div>
              <div
                className="text-[10.5px] font-medium text-[#75d8ff] mt-0.5 truncate text-right"
                dir="ltr"
              >
                {item.provider}
              </div>
            </div>

            <div className="space-y-0.5 pt-1 border-t border-cyan-400/10">
              <p className="text-[11px] text-[#a7cdf2] leading-snug">
                {item.scopeAr}
              </p>
              <p className="text-[10px] text-[#7ca4cf] leading-relaxed break-words">
                {item.detailAr}
              </p>
            </div>
          </a>
        ))}
      </div>
    </footer>
  );
}
