import { SYRIA_GOVERNORATES } from './syriaGeo';

export interface HourlyPoint {
  time: string;
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  dust: number;
}

export interface DailyWeatherDay {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipProb: number;
  windMaxKmh: number;
}

export interface GovernorateAirQuality {
  usAqi: number;
  euAqi: number;
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
  so2: number;
  co: number;
  dust: number;
  temperatureC: number | null;
  windKmh: number | null;
  humidityPct: number | null;
  weatherCode: number | null;
  updatedAt: string;
  hourly: HourlyPoint[];
  dailyWeather: DailyWeatherDay[];
}

export type WeatherIconKind =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'storm';

// Standard WMO weather interpretation codes in natural Arabic
export function describeWmoCodeAr(code: number): {
  label: string;
  icon: WeatherIconKind;
} {
  if (code === 0) return { label: 'صحو', icon: 'clear' };
  if (code === 1 || code === 2)
    return { label: 'غائم جزئياً', icon: 'partly-cloudy' };
  if (code === 3) return { label: 'غائم', icon: 'cloudy' };
  if (code === 45 || code === 48) return { label: 'ضباب', icon: 'fog' };
  if (code >= 51 && code <= 57) return { label: 'رذاذ', icon: 'drizzle' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82))
    return { label: 'مطر', icon: 'rain' };
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86))
    return { label: 'ثلج', icon: 'snow' };
  if (code >= 95) return { label: 'عاصفة رعدية', icon: 'storm' };
  return { label: 'غائم جزئياً', icon: 'partly-cloudy' };
}

export interface WorldBankYearMetric {
  year: string;
  co2MillionTons: number;
  pm25AnnualMean: number;
  co2PerCapitaTons: number;
}

export type AlertLevel = 'normal' | 'warning' | 'critical';

// Official US EPA AQI breakpoints: 0–50 Good, 51–100 Moderate, 101+ Unhealthy
export function getAlertLevel(usAqi: number): AlertLevel {
  if (usAqi >= 101) return 'critical';
  if (usAqi >= 51) return 'warning';
  return 'normal';
}

export function getAlertLabelAr(level: AlertLevel): string {
  if (level === 'critical') return 'مرتفع';
  if (level === 'warning') return 'متوسط';
  return 'جيد';
}

export function getAqiBadgeAr(usAqi: number): {
  label: string;
  level: AlertLevel;
} {
  if (usAqi >= 101) return { label: 'مرتفع', level: 'critical' };
  if (usAqi >= 51) return { label: 'متوسط', level: 'warning' };
  return { label: 'جيد', level: 'normal' };
}

// Geographic corridor links between neighboring Syrian governorates (highlight is computed dynamically from live AQI)
export const SYRIA_NETWORK_ARCS: Array<{
  from: string;
  to: string;
}> = [
  { from: 'damascus', to: 'homs' },
  { from: 'homs', to: 'aleppo' },
  { from: 'homs', to: 'tartus' },
  { from: 'homs', to: 'deir-ez-zor' },
  { from: 'aleppo', to: 'latakia' },
  { from: 'aleppo', to: 'raqqa' },
  { from: 'raqqa', to: 'al-hasakah' },
  { from: 'deir-ez-zor', to: 'al-hasakah' },
  { from: 'damascus', to: 'daraa' },
  { from: 'damascus', to: 'as-suwayda' },
  { from: 'hama', to: 'idlib' },
];

function parseFiniteNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Fetch 100% live real-time air quality + meteorological telemetry for all 14 Syrian governorates
// Sources: Open-Meteo Air Quality API (Copernicus CAMS) & Open-Meteo Weather API
export async function fetchLiveSyriaAirQuality(): Promise<{
  data: Record<string, GovernorateAirQuality>;
  measuredAt: string;
}> {
  const ordered = SYRIA_GOVERNORATES;
  const lats = ordered.map((g) => g.lat).join(',');
  const lons = ordered.map((g) => g.lon).join(',');

  const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lons}&current=european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust&hourly=pm2_5,pm10,nitrogen_dioxide,ozone,dust&past_days=1&forecast_days=1&timezone=Asia%2FDamascus`;
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&forecast_days=5&timezone=Asia%2FDamascus`;

  const [aqRes, weatherRes] = await Promise.all([
    fetch(aqUrl),
    fetch(weatherUrl).catch(() => null),
  ]);

  if (!aqRes.ok) {
    throw new Error(`Open-Meteo Air Quality HTTP ${aqRes.status}`);
  }

  const aqJson = await aqRes.json();
  const weatherJson =
    weatherRes && weatherRes.ok ? await weatherRes.json() : null;

  const aqList = Array.isArray(aqJson) ? aqJson : [aqJson];
  const weatherList = weatherJson
    ? Array.isArray(weatherJson)
      ? weatherJson
      : [weatherJson]
    : [];

  const result: Record<string, GovernorateAirQuality> = {};
  let latestTime = '';

  ordered.forEach((gov, idx) => {
    const entry = aqList[idx];
    if (!entry || !entry.current) return;

    const usAqiRaw = parseFiniteNum(entry.current.us_aqi);
    if (usAqiRaw === null) return;

    const wRaw = weatherList[idx];
    const wEntry = wRaw?.current;
    const wDaily = wRaw?.daily;
    const dailyWeather: DailyWeatherDay[] = [];

    if (wDaily && Array.isArray(wDaily.time)) {
      for (let i = 0; i < wDaily.time.length; i++) {
        const wCode = parseFiniteNum(wDaily.weather_code?.[i]);
        const tMax = parseFiniteNum(wDaily.temperature_2m_max?.[i]);
        const tMin = parseFiniteNum(wDaily.temperature_2m_min?.[i]);
        if (wCode === null || tMax === null || tMin === null) continue;
        const pProb = parseFiniteNum(wDaily.precipitation_probability_max?.[i]);
        const wMax = parseFiniteNum(wDaily.wind_speed_10m_max?.[i]);
        dailyWeather.push({
          date: String(wDaily.time[i]),
          weatherCode: Math.round(wCode),
          tempMax: Math.round(tMax * 10) / 10,
          tempMin: Math.round(tMin * 10) / 10,
          precipProb: pProb !== null ? Math.round(pProb) : 0,
          windMaxKmh: wMax !== null ? Math.round(wMax) : 0,
        });
      }
    }

    const hrs = entry.hourly;
    const series: HourlyPoint[] = [];

    if (hrs && Array.isArray(hrs.time) && hrs.time.length > 0) {
      const currentIso = String(entry.current.time || '');
      let endIdx = hrs.time.length - 1;
      for (let k = hrs.time.length - 1; k >= 0; k--) {
        if (String(hrs.time[k]) <= currentIso) {
          endIdx = k;
          break;
        }
      }
      const startIdx = Math.max(0, endIdx - 22);
      for (let i = startIdx; i <= endIdx && series.length < 12; i += 2) {
        const pm25 = parseFiniteNum(hrs.pm2_5?.[i]);
        const pm10 = parseFiniteNum(hrs.pm10?.[i]);
        const no2 = parseFiniteNum(hrs.nitrogen_dioxide?.[i]);
        const o3 = parseFiniteNum(hrs.ozone?.[i]);
        const dust = parseFiniteNum(hrs.dust?.[i]);
        if (
          pm25 === null ||
          pm10 === null ||
          no2 === null ||
          o3 === null ||
          dust === null
        ) {
          continue;
        }
        series.push({
          time: String(hrs.time[i]).slice(11, 16),
          pm25: Math.round(pm25 * 10) / 10,
          pm10: Math.round(pm10 * 10) / 10,
          no2: Math.round(no2 * 10) / 10,
          o3: Math.round(o3 * 10) / 10,
          dust: Math.round(dust * 10) / 10,
        });
      }
    }

    const updatedAt = String(entry.current.time || '');
    if (updatedAt > latestTime) latestTime = updatedAt;

    const euAqiRaw = parseFiniteNum(entry.current.european_aqi);
    const pm25Raw = parseFiniteNum(entry.current.pm2_5);
    const pm10Raw = parseFiniteNum(entry.current.pm10);
    const o3Raw = parseFiniteNum(entry.current.ozone);
    const no2Raw = parseFiniteNum(entry.current.nitrogen_dioxide);
    const so2Raw = parseFiniteNum(entry.current.sulphur_dioxide);
    const coRaw = parseFiniteNum(entry.current.carbon_monoxide);
    const dustRaw = parseFiniteNum(entry.current.dust);

    const tempRaw = parseFiniteNum(wEntry?.temperature_2m);
    const windRaw = parseFiniteNum(wEntry?.wind_speed_10m);
    const humRaw = parseFiniteNum(wEntry?.relative_humidity_2m);
    const codeRaw = parseFiniteNum(wEntry?.weather_code);

    result[gov.id] = {
      usAqi: Math.round(usAqiRaw),
      euAqi: euAqiRaw !== null ? Math.round(euAqiRaw) : 0,
      pm25: pm25Raw !== null ? Math.round(pm25Raw * 10) / 10 : 0,
      pm10: pm10Raw !== null ? Math.round(pm10Raw * 10) / 10 : 0,
      o3: o3Raw !== null ? Math.round(o3Raw * 10) / 10 : 0,
      no2: no2Raw !== null ? Math.round(no2Raw * 10) / 10 : 0,
      so2: so2Raw !== null ? Math.round(so2Raw * 10) / 10 : 0,
      co: coRaw !== null ? Math.round(coRaw) : 0,
      dust: dustRaw !== null ? Math.round(dustRaw * 10) / 10 : 0,
      temperatureC: tempRaw !== null ? Math.round(tempRaw * 10) / 10 : null,
      windKmh: windRaw !== null ? Math.round(windRaw * 10) / 10 : null,
      humidityPct: humRaw !== null ? Math.round(humRaw) : null,
      weatherCode: codeRaw !== null ? Math.round(codeRaw) : null,
      updatedAt,
      hourly: series,
      dailyWeather,
    };
  });

  return {
    data: result,
    measuredAt: latestTime,
  };
}

// Fetch 100% live official annual Syria environmental indicators directly from World Bank Open Data API
// Indicators:
// - EN.GHG.CO2.MT.CE.AR5: Total CO2 emissions (Mt CO2e)
// - EN.ATM.PM25.MC.M3: PM2.5 mean annual exposure (µg/m³)
// - EN.GHG.CO2.PC.CE.AR5: CO2 emissions per capita (t CO2e/capita)
export async function fetchLiveWorldBankSyriaHistory(): Promise<
  WorldBankYearMetric[]
> {
  const base = 'https://api.worldbank.org/v2/country/SYR/indicator';
  const [co2Res, pmRes, pcRes] = await Promise.all([
    fetch(`${base}/EN.GHG.CO2.MT.CE.AR5?format=json&per_page=10&mrv=7`),
    fetch(`${base}/EN.ATM.PM25.MC.M3?format=json&per_page=10&mrv=7`),
    fetch(`${base}/EN.GHG.CO2.PC.CE.AR5?format=json&per_page=10&mrv=7`),
  ]);

  if (!co2Res.ok || !pmRes.ok || !pcRes.ok) {
    throw new Error('World Bank Open Data API request failed');
  }

  const [co2Json, pmJson, pcJson] = await Promise.all([
    co2Res.json(),
    pmRes.json(),
    pcRes.json(),
  ]);

  const toMap = (json: unknown): Record<string, number> => {
    const rows = Array.isArray(json) && Array.isArray(json[1]) ? json[1] : [];
    const map: Record<string, number> = {};
    for (const row of rows) {
      if (row && row.date && row.value !== null && row.value !== undefined) {
        map[String(row.date)] = Math.round(Number(row.value) * 100) / 100;
      }
    }
    return map;
  };

  const co2Map = toMap(co2Json);
  const pmMap = toMap(pmJson);
  const pcMap = toMap(pcJson);

  // Intersect years where all 3 official World Bank indicators are published (latest 5 complete years)
  const commonYears = Object.keys(co2Map)
    .filter((y) => pmMap[y] !== undefined && pcMap[y] !== undefined)
    .sort((a, b) => Number(a) - Number(b))
    .slice(-5);

  return commonYears.map((year) => ({
    year,
    co2MillionTons: co2Map[year],
    pm25AnnualMean: pmMap[year],
    co2PerCapitaTons: pcMap[year],
  }));
}
