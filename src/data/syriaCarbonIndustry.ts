import { SYRIA_GOVERNORATES } from './syriaGeo';

export type IndustrialSectorKey =
  | 'power'
  | 'oil_gas'
  | 'heavy_industry'
  | 'industrial_fuel';

export interface IndustrialSectorMeta {
  key: IndustrialSectorKey;
  labelAr: string;
  shortAr: string;
  color: string;
}

export const INDUSTRIAL_SECTORS: IndustrialSectorMeta[] = [
  {
    key: 'oil_gas',
    labelAr: 'النفط والغاز',
    shortAr: 'النفط والغاز',
    color: '#f5a535',
  },
  {
    key: 'power',
    labelAr: 'توليد الكهرباء',
    shortAr: 'الكهرباء',
    color: '#38bdf8',
  },
  {
    key: 'heavy_industry',
    labelAr: 'الإسمنت والزجاج والصناعات الثقيلة',
    shortAr: 'الإسمنت والصناعة',
    color: '#3ef2b2',
  },
  {
    key: 'industrial_fuel',
    labelAr: 'الوقود الصناعي والتجاري',
    shortAr: 'وقود صناعي',
    color: '#a78bfa',
  },
];

export const SECTOR_META_MAP: Record<IndustrialSectorKey, IndustrialSectorMeta> =
  Object.fromEntries(INDUSTRIAL_SECTORS.map((s) => [s.key, s])) as Record<
    IndustrialSectorKey,
    IndustrialSectorMeta
  >;

export interface IndustrialFacilityRecord {
  id: number;
  nameAr: string;
  sector: IndustrialSectorKey;
  subsectorRaw: string;
  governorateId: string | null;
  co2eTons: number;
  activityValue: number | null;
  activityUnits: string | null;
  year: number;
  lat: number;
  lon: number;
  isMajorPlant: boolean;
  isNationalAggregate: boolean;
}

export interface GovernorateYearCarbon {
  year: number;
  governorateId: string;
  governorateNameAr: string;
  totalCo2eTons: number;
  activityCount: number;
  majorPlantCount: number;
  dominantSector: IndustrialSectorKey;
  bySector: Record<IndustrialSectorKey, number>;
  facilities: IndustrialFacilityRecord[];
}

export interface NationalYearCarbon {
  year: number;
  totalCo2eTons: number;
  activityCount: number;
  majorPlantCount: number;
  bySector: Record<IndustrialSectorKey, number>;
  nationalAggregateFacilities: IndustrialFacilityRecord[];
}

export interface SyriaCarbonIndustryDataset {
  years: number[];
  byYear: Record<number, GovernorateYearCarbon[]>;
  nationalByYear: NationalYearCarbon[];
  sourceName: string;
}

// Official GADM ADM1 codes used by Climate TRACE for Syria's 14 governorates
const GADM_TO_GOV_ID: Record<string, string> = {
  'SYR.1': 'al-hasakah',
  'SYR.2': 'aleppo',
  'SYR.3': 'raqqa',
  'SYR.4': 'as-suwayda',
  'SYR.5': 'damascus',
  'SYR.6': 'daraa',
  'SYR.7': 'deir-ez-zor',
  'SYR.8': 'hama',
  'SYR.9': 'homs',
  'SYR.10': 'idlib',
  'SYR.11': 'latakia',
  'SYR.12': 'quneitra',
  'SYR.13': 'rif-dimashq',
  'SYR.14': 'tartus',
};

const SUBSECTOR_TO_KEY: Record<string, IndustrialSectorKey> = {
  'electricity-generation': 'power',
  'oil-and-gas-production': 'oil_gas',
  'oil-and-gas-transport': 'oil_gas',
  'oil-and-gas-refining': 'oil_gas',
  cement: 'heavy_industry',
  'iron-and-steel': 'heavy_industry',
  glass: 'heavy_industry',
  chemicals: 'heavy_industry',
  petrochemicals: 'heavy_industry',
  'industrial-wastewater-treatment-and-discharge': 'heavy_industry',
  'non-residential-onsite-fuel-usage': 'industrial_fuel',
};

const FACILITY_NAME_AR: Record<string, string> = {
  'Banias Thermal power plant': 'محطة بانياس الحرارية',
  'Jandar Gas power plant': 'محطة جندر الغازية',
  'Teshreen power station': 'محطة تشرين الحرارية',
  'Deir Ali power station': 'محطة دير علي الحرارية',
  'Mehardeh power plant': 'محطة محردة الحرارية',
  'Al-Zara power plant': 'محطة الزارة الحرارية',
  'Aleppo power plant': 'محطة حلب الحرارية',
  'Nasrieh Gas power plant': 'محطة الناصرية الغازية',
  'Homs Refinery Cogen Power Plant Syria': 'محطة طاقة مصفاة حمص',
  'Swedieh ( Suwaidiyah) OCGT Power Plant Syria': 'محطة السويدية الغازية',
  'Al Tayem OCGT Power Plant Syria': 'محطة التيم الغازية',
  'Zayzoun CCGT power plant': 'محطة زيزون الحرارية',
  'Latakia power station': 'محطة اللاذقية الحرارية',
  'Al Badia Cement Abu Ash Shamat Cement Plant': 'معمل إسمنت البادية (أبو الشامات)',
  'General Company for the Manufacture and Marketing of Cement and Building Materials Kafr Buhum Cement Plant':
    'معمل إسمنت كفر بهم',
  'General Company for the Manufacture and Marketing of Cement and Building Materials Adra Cement Plant':
    'معمل إسمنت عدرا',
  'Arab Company for Cement And Building Materials Ar Ramouseh Cement Plant':
    'معمل إسمنت الراموسة',
  'Rastan Cement and Building Materials Ar Rastan Cement Plant':
    'معمل إسمنت الرستن',
  'Kaveh Industry Group': 'معمل كاوه للزجاج',
  'Medsteel Adra steel plant': 'معمل ميدستيل للحديد (عدرا)',
  'Hmisho Steel Hassia plant': 'معمل حديد حسياء',
  'Hadeed Metal Manufacturing Co Damascus steel plant': 'معمل حديد دمشق (عدرا)',
};

const GOV_NAME_MAP: Record<string, string> = Object.fromEntries(
  SYRIA_GOVERNORATES.map((g) => [g.id, g.nameAr])
);

function translateFacilityNameAr(
  rawName: string,
  subsector: string,
  govNameAr: string | null
): string {
  if (rawName === 'Syria_OtherBasins_OtherResources') {
    return subsector === 'oil-and-gas-transport'
      ? 'شبكة نقل النفط والغاز (مجمع سوريا)'
      : 'إنتاج النفط والغاز (مجمع الأحواض السورية)';
  }
  if (FACILITY_NAME_AR[rawName]) {
    return FACILITY_NAME_AR[rawName];
  }
  if (subsector === 'industrial-wastewater-treatment-and-discharge') {
    return govNameAr ? `معالجة مياه صناعية (${govNameAr})` : 'معالجة مياه صناعية';
  }
  if (subsector === 'non-residential-onsite-fuel-usage') {
    return govNameAr
      ? `وقود المنشآت غير السكنية (${govNameAr})`
      : 'وقود المنشآت غير السكنية';
  }
  return rawName || (govNameAr ? `منشأة صناعية (${govNameAr})` : 'منشأة صناعية');
}

interface RawClimateTraceAsset {
  Id: number;
  Name?: string;
  NativeId?: string;
  Sector?: string;
  Centroid?: {
    Geometry?: [number, number];
  };
  EmissionsSummary?: Array<{
    Gas?: string;
    EmissionsQuantity?: number | null;
    Activity?: number | null;
    ActivityUnits?: string | null;
  }>;
}

interface DistrictAnchor {
  govId: string;
  lon: number;
  lat: number;
}

function resolveGovernorateId(
  nativeId: string | undefined,
  lon: number,
  lat: number,
  anchors: DistrictAnchor[]
): string | null {
  if (nativeId && nativeId.startsWith('SYR.')) {
    const prefix = nativeId.split('.').slice(0, 2).join('.');
    if (GADM_TO_GOV_ID[prefix]) {
      return GADM_TO_GOV_ID[prefix];
    }
  }

  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    return null;
  }

  if (anchors.length > 0) {
    let bestGov = anchors[0].govId;
    let bestDist = Infinity;
    for (const a of anchors) {
      const dLon = (a.lon - lon) * Math.cos((lat * Math.PI) / 180);
      const dLat = a.lat - lat;
      const distSq = dLon * dLon + dLat * dLat;
      if (distSq < bestDist) {
        bestDist = distSq;
        bestGov = a.govId;
      }
    }
    return bestGov;
  }

  let bestGov = SYRIA_GOVERNORATES[0].id;
  let bestDist = Infinity;
  for (const g of SYRIA_GOVERNORATES) {
    const dLon = g.lon - lon;
    const dLat = g.lat - lat;
    const distSq = dLon * dLon + dLat * dLat;
    if (distSq < bestDist) {
      bestDist = distSq;
      bestGov = g.id;
    }
  }
  return bestGov;
}

export function formatCo2eArabic(tons: number): string {
  if (!Number.isFinite(tons) || tons <= 0) return '0 طن';
  if (tons >= 1_000_000) {
    return `${(tons / 1_000_000).toFixed(2)} مليون طن`;
  }
  if (tons >= 1_000) {
    return `${(tons / 1_000).toFixed(tons >= 100_000 ? 0 : 1)} ألف طن`;
  }
  return `${Math.round(tons)} طن`;
}

export function formatCo2eCompact(tons: number): string {
  if (!Number.isFinite(tons) || tons <= 0) return '0';
  if (tons >= 1_000_000) {
    const m = tons / 1_000_000;
    return `${m >= 10 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (tons >= 1_000) {
    return `${Math.round(tons / 1_000)}k`;
  }
  return `${Math.round(tons)}`;
}

// Fetch 100% live multi-year industrial emissions and registered facility records for Syria from Climate TRACE API v6
// - Strictly excludes zero-emission / unmeasured records (co2eTons <= 0)
// - Separates country-wide oil/gas basin aggregates (Syria_OtherBasins_OtherResources) from single-governorate totals
export async function fetchLiveSyriaCarbonIndustry(): Promise<SyriaCarbonIndustryDataset> {
  const candidateYears = [2021, 2022, 2023, 2024];
  const sectorsParam =
    'power,manufacturing,fossil-fuel-operations,mineral-extraction,buildings,waste';

  const responses = await Promise.all(
    candidateYears.map(async (year) => {
      const url = `https://api.climatetrace.org/v6/assets?countries=SYR&sectors=${sectorsParam}&limit=500&year=${year}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Climate TRACE HTTP ${res.status} (${year})`);
      }
      const json = (await res.json()) as { assets?: RawClimateTraceAsset[] };
      return { year, assets: Array.isArray(json.assets) ? json.assets : [] };
    })
  );

  // Build authoritative 60-district anchor lookup from GADM-coded Syrian district assets
  const anchors: DistrictAnchor[] = [];
  const seenAnchorIds = new Set<string>();
  for (const { assets } of responses) {
    for (const a of assets) {
      if (
        a.NativeId &&
        a.NativeId.startsWith('SYR.') &&
        a.Centroid?.Geometry &&
        a.Centroid.Geometry.length >= 2 &&
        !seenAnchorIds.has(a.NativeId)
      ) {
        const prefix = a.NativeId.split('.').slice(0, 2).join('.');
        const govId = GADM_TO_GOV_ID[prefix];
        if (govId) {
          seenAnchorIds.add(a.NativeId);
          anchors.push({
            govId,
            lon: Number(a.Centroid.Geometry[0]),
            lat: Number(a.Centroid.Geometry[1]),
          });
        }
      }
    }
  }

  const byYear: Record<number, GovernorateYearCarbon[]> = {};
  const nationalByYear: NationalYearCarbon[] = [];
  const populatedYears: number[] = [];

  for (const { year, assets } of responses) {
    if (assets.length === 0) continue;
    populatedYears.push(year);

    const govBuckets = new Map<
      string,
      {
        totalCo2eTons: number;
        activityCount: number;
        majorPlantCount: number;
        bySector: Record<IndustrialSectorKey, number>;
        facilities: IndustrialFacilityRecord[];
      }
    >();

    for (const gov of SYRIA_GOVERNORATES) {
      govBuckets.set(gov.id, {
        totalCo2eTons: 0,
        activityCount: 0,
        majorPlantCount: 0,
        bySector: {
          oil_gas: 0,
          power: 0,
          heavy_industry: 0,
          industrial_fuel: 0,
        },
        facilities: [],
      });
    }

    const nationalAggregateFacilities: IndustrialFacilityRecord[] = [];
    const nationalAggregateBySector: Record<IndustrialSectorKey, number> = {
      oil_gas: 0,
      power: 0,
      heavy_industry: 0,
      industrial_fuel: 0,
    };

    for (const raw of assets) {
      const subsector = String(raw.Sector || '');
      const sectorKey = SUBSECTOR_TO_KEY[subsector];
      if (!sectorKey) continue;

      const summary =
        raw.EmissionsSummary?.find((s) => s.Gas === 'co2e_100yr') ||
        raw.EmissionsSummary?.[0];
      const co2eTons = Number(summary?.EmissionsQuantity);
      // Skip unmeasured or zero-emission phantom entries
      if (!Number.isFinite(co2eTons) || co2eTons <= 0) continue;

      const coords = raw.Centroid?.Geometry;
      const lon = coords && coords.length >= 2 ? Number(coords[0]) : NaN;
      const lat = coords && coords.length >= 2 ? Number(coords[1]) : NaN;

      const rawName = String(raw.Name || '');
      const isNationalAggregate =
        rawName === 'Syria_OtherBasins_OtherResources' ||
        rawName.startsWith('Syria_');

      const activityValue =
        summary?.Activity !== null && summary?.Activity !== undefined
          ? Number(summary.Activity)
          : null;
      const activityUnits =
        summary?.ActivityUnits && summary.ActivityUnits !== 'license restricted'
          ? String(summary.ActivityUnits)
          : null;

      const isMajorPlant = subsector !== 'non-residential-onsite-fuel-usage';

      if (isNationalAggregate) {
        const aggRecord: IndustrialFacilityRecord = {
          id: Number(raw.Id),
          nameAr: translateFacilityNameAr(rawName, subsector, null),
          sector: sectorKey,
          subsectorRaw: subsector,
          governorateId: null,
          co2eTons,
          activityValue,
          activityUnits,
          year,
          lat: Number.isFinite(lat) ? lat : 0,
          lon: Number.isFinite(lon) ? lon : 0,
          isMajorPlant: true,
          isNationalAggregate: true,
        };
        nationalAggregateFacilities.push(aggRecord);
        nationalAggregateBySector[sectorKey] += co2eTons;
        continue;
      }

      const govId = resolveGovernorateId(raw.NativeId, lon, lat, anchors);
      if (!govId) continue;
      const bucket = govBuckets.get(govId);
      if (!bucket) continue;

      const govNameAr = GOV_NAME_MAP[govId] || govId;

      const record: IndustrialFacilityRecord = {
        id: Number(raw.Id),
        nameAr: translateFacilityNameAr(rawName, subsector, govNameAr),
        sector: sectorKey,
        subsectorRaw: subsector,
        governorateId: govId,
        co2eTons,
        activityValue,
        activityUnits,
        year,
        lat,
        lon,
        isMajorPlant,
        isNationalAggregate: false,
      };

      bucket.totalCo2eTons += co2eTons;
      bucket.activityCount += 1;
      if (isMajorPlant) bucket.majorPlantCount += 1;
      bucket.bySector[sectorKey] += co2eTons;
      bucket.facilities.push(record);
    }

    const govRows: GovernorateYearCarbon[] = SYRIA_GOVERNORATES.map((gov) => {
      const b = govBuckets.get(gov.id)!;
      b.facilities.sort((a, c) => c.co2eTons - a.co2eTons);

      let dominantSector: IndustrialSectorKey = 'industrial_fuel';
      let maxSectorVal = -1;
      (Object.keys(b.bySector) as IndustrialSectorKey[]).forEach((k) => {
        if (b.bySector[k] > maxSectorVal) {
          maxSectorVal = b.bySector[k];
          dominantSector = k;
        }
      });

      return {
        year,
        governorateId: gov.id,
        governorateNameAr: gov.nameAr,
        totalCo2eTons: b.totalCo2eTons,
        activityCount: b.activityCount,
        majorPlantCount: b.majorPlantCount,
        dominantSector,
        bySector: b.bySector,
        facilities: b.facilities,
      };
    });

    byYear[year] = govRows;

    const natBySector: Record<IndustrialSectorKey, number> = {
      oil_gas: nationalAggregateBySector.oil_gas,
      power: nationalAggregateBySector.power,
      heavy_industry: nationalAggregateBySector.heavy_industry,
      industrial_fuel: nationalAggregateBySector.industrial_fuel,
    };
    let natTotal =
      nationalAggregateBySector.oil_gas +
      nationalAggregateBySector.power +
      nationalAggregateBySector.heavy_industry +
      nationalAggregateBySector.industrial_fuel;
    let natActivities = nationalAggregateFacilities.length;
    let natPlants = nationalAggregateFacilities.length;

    for (const row of govRows) {
      natTotal += row.totalCo2eTons;
      natActivities += row.activityCount;
      natPlants += row.majorPlantCount;
      natBySector.oil_gas += row.bySector.oil_gas;
      natBySector.power += row.bySector.power;
      natBySector.heavy_industry += row.bySector.heavy_industry;
      natBySector.industrial_fuel += row.bySector.industrial_fuel;
    }

    nationalAggregateFacilities.sort((a, b) => b.co2eTons - a.co2eTons);

    nationalByYear.push({
      year,
      totalCo2eTons: natTotal,
      activityCount: natActivities,
      majorPlantCount: natPlants,
      bySector: natBySector,
      nationalAggregateFacilities,
    });
  }

  return {
    years: populatedYears,
    byYear,
    nationalByYear,
    sourceName: 'Climate TRACE',
  };
}
