import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Pause, Play, RotateCcw } from 'lucide-react';
import {
  formatCo2eArabic,
  formatCo2eCompact,
  INDUSTRIAL_SECTORS,
  SECTOR_META_MAP,
  type GovernorateYearCarbon,
  type IndustrialFacilityRecord,
  type IndustrialSectorKey,
  type SyriaCarbonIndustryDataset,
} from '../data/syriaCarbonIndustry';

interface CarbonIndustryD3PanelProps {
  dataset: SyriaCarbonIndustryDataset | null;
  isLoading: boolean;
  error: string | null;
  selectedGovId: string | null;
  onSelectGovernorate: (govId: string | null) => void;
  onRetry: () => void;
}

type ChartViewMode = 'correlation' | 'timeline';
type YScaleMode = 'symlog' | 'linear';

interface BubbleDatum {
  governorateId: string;
  governorateNameAr: string;
  activityCount: number;
  majorPlantCount: number;
  co2eTons: number;
  dominantSector: IndustrialSectorKey;
  yoyPct: number | null;
  facilities: IndustrialFacilityRecord[];
}

export function CarbonIndustryD3Panel({
  dataset,
  isLoading,
  error,
  selectedGovId,
  onSelectGovernorate,
  onRetry,
}: CarbonIndustryD3PanelProps) {
  const [viewMode, setViewMode] = useState<ChartViewMode>('correlation');
  const [scaleMode, setScaleMode] = useState<YScaleMode>('symlog');
  const [sectorFilter, setSectorFilter] = useState<IndustrialSectorKey | 'all'>(
    'all'
  );
  const [activeYear, setActiveYear] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hoveredGovId, setHoveredGovId] = useState<string | null>(null);
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const [chartWidth, setChartWidth] = useState<number>(680);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const prevDataKeyRef = useRef<string>('');

  const years = useMemo(() => dataset?.years ?? [], [dataset]);
  const effectiveYear = useMemo(() => {
    if (years.length === 0) return 0;
    return years.includes(activeYear) ? activeYear : years[years.length - 1];
  }, [years, activeYear]);

  // Keep activeYear synced with the latest available year from live Climate TRACE data
  useEffect(() => {
    if (years.length > 0 && !years.includes(activeYear)) {
      setActiveYear(years[years.length - 1]);
    }
  }, [years, activeYear]);

  // Playback interval across years for the D3 correlation chart
  useEffect(() => {
    if (!isPlaying || viewMode !== 'correlation' || years.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveYear((prev) => {
        const idx = years.indexOf(prev);
        return years[(idx + 1) % years.length];
      });
    }, 1500);
    return () => window.clearInterval(timer);
  }, [isPlaying, viewMode, years]);

  // Observe container width for crisp responsive D3 layout
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateWidth = () => {
      const next = Math.max(300, Math.floor(el.getBoundingClientRect().width));
      setChartWidth(next);
    };
    updateWidth();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Compute filtered bubble points for any given year
  const getYearBubbles = useMemo(() => {
    return (year: number): BubbleDatum[] => {
      if (!dataset) return [];
      const rows = dataset.byYear[year] || [];
      const prevYear = year - 1;
      const prevRows = dataset.byYear[prevYear] || [];
      const prevMap = new Map(prevRows.map((r) => [r.governorateId, r]));

      return rows
        .map((row) => {
          const filteredFacilities =
            sectorFilter === 'all'
              ? row.facilities
              : row.facilities.filter((f) => f.sector === sectorFilter);

          const co2eTons =
            sectorFilter === 'all'
              ? row.totalCo2eTons
              : row.bySector[sectorFilter];

          const prevRow = prevMap.get(row.governorateId);
          const prevCo2 = prevRow
            ? sectorFilter === 'all'
              ? prevRow.totalCo2eTons
              : prevRow.bySector[sectorFilter]
            : null;

          const yoyPct =
            prevCo2 && prevCo2 > 0
              ? Math.round(((co2eTons - prevCo2) / prevCo2) * 1000) / 10
              : null;

          const activityCount = filteredFacilities.length;
          const majorPlantCount = filteredFacilities.filter(
            (f) => f.isMajorPlant
          ).length;

          return {
            governorateId: row.governorateId,
            governorateNameAr: row.governorateNameAr,
            activityCount,
            majorPlantCount,
            co2eTons,
            dominantSector:
              sectorFilter === 'all' ? row.dominantSector : sectorFilter,
            yoyPct,
            facilities: filteredFacilities,
          };
        })
        .filter((d) => d.activityCount > 0 || d.co2eTons > 0);
    };
  }, [dataset, sectorFilter]);

  const activeBubbles = useMemo(
    () => (effectiveYear > 0 ? getYearBubbles(effectiveYear) : []),
    [getYearBubbles, effectiveYear]
  );

  // Global maxes across ALL years so axes remain stable during D3 year animations
  const globalExtents = useMemo(() => {
    let maxActivities = 0;
    let maxCo2 = 0;
    for (const y of years) {
      const pts = getYearBubbles(y);
      for (const p of pts) {
        if (p.activityCount > maxActivities) maxActivities = p.activityCount;
        if (p.co2eTons > maxCo2) maxCo2 = p.co2eTons;
      }
    }
    return {
      maxActivities: Math.max(1, maxActivities) + 1,
      maxCo2: Math.max(1, maxCo2) * 1.15,
    };
  }, [years, getYearBubbles]);

  // Multi-year stacked area data (scoped to selectedGovId or national total)
  const timelineSeries = useMemo(() => {
    if (!dataset) return [];
    return years.map((year) => {
      if (selectedGovId) {
        const row = (dataset.byYear[year] || []).find(
          (r) => r.governorateId === selectedGovId
        );
        return {
          year,
          oil_gas: row?.bySector.oil_gas ?? 0,
          power: row?.bySector.power ?? 0,
          heavy_industry: row?.bySector.heavy_industry ?? 0,
          industrial_fuel: row?.bySector.industrial_fuel ?? 0,
          total: row?.totalCo2eTons ?? 0,
          activityCount: row?.activityCount ?? 0,
        };
      }
      const nat = dataset.nationalByYear.find((n) => n.year === year);
      return {
        year,
        oil_gas: nat?.bySector.oil_gas ?? 0,
        power: nat?.bySector.power ?? 0,
        heavy_industry: nat?.bySector.heavy_industry ?? 0,
        industrial_fuel: nat?.bySector.industrial_fuel ?? 0,
        total: nat?.totalCo2eTons ?? 0,
        activityCount: nat?.activityCount ?? 0,
      };
    });
  }, [dataset, years, selectedGovId]);

  const focusedGovId = hoveredGovId || selectedGovId;

  const focusedBubble = useMemo(() => {
    if (!focusedGovId) return null;
    return activeBubbles.find((b) => b.governorateId === focusedGovId) || null;
  }, [focusedGovId, activeBubbles]);

  // Facilities list for the right-hand detail breakdown
  const detailPanelData = useMemo(() => {
    if (!dataset || effectiveYear === 0) {
      return {
        title: 'الأنشطة المسجلة',
        totalCo2: 0,
        count: 0,
        items: [] as Array<IndustrialFacilityRecord & { govNameAr: string }>,
      };
    }
    const yearRows: GovernorateYearCarbon[] = dataset.byYear[effectiveYear] || [];

    if (focusedGovId) {
      const row = yearRows.find((r) => r.governorateId === focusedGovId);
      if (row) {
        const list = (
          sectorFilter === 'all'
            ? row.facilities
            : row.facilities.filter((f) => f.sector === sectorFilter)
        ).map((f) => ({ ...f, govNameAr: row.governorateNameAr }));

        const total = list.reduce((s, f) => s + f.co2eTons, 0);
        return {
          title: `أنشطة ${row.governorateNameAr} (${effectiveYear})`,
          totalCo2: total,
          count: list.length,
          items: list.slice(0, 7),
        };
      }
    }

    // National top recorded industrial facilities for effectiveYear (includes national-level basin aggregates)
    const allFacilities: Array<IndustrialFacilityRecord & { govNameAr: string }> = [];
    for (const row of yearRows) {
      for (const f of row.facilities) {
        if (sectorFilter !== 'all' && f.sector !== sectorFilter) continue;
        allFacilities.push({ ...f, govNameAr: row.governorateNameAr });
      }
    }
    const natYear = dataset.nationalByYear.find((n) => n.year === effectiveYear);
    if (natYear) {
      for (const agg of natYear.nationalAggregateFacilities) {
        if (sectorFilter !== 'all' && agg.sector !== sectorFilter) continue;
        allFacilities.push({ ...agg, govNameAr: 'إجمالي سوريا' });
      }
    }
    allFacilities.sort((a, b) => b.co2eTons - a.co2eTons);
    const total = allFacilities.reduce((s, f) => s + f.co2eTons, 0);
    return {
      title: `أبرز المنشآت المسجلة (${effectiveYear})`,
      totalCo2: total,
      count: allFacilities.length,
      items: allFacilities.slice(0, 7),
    };
  }, [dataset, effectiveYear, focusedGovId, sectorFilter]);

  // Render D3 visualization (Correlation Bubble + Trajectory Plot OR Stacked Multi-Year Area Chart)
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || !dataset || years.length === 0) return;

    const svg = d3.select(svgEl);
    const width = chartWidth;
    const height = width < 480 ? 270 : 308;
    const margin = {
      top: 22,
      right: 22,
      bottom: 42,
      left: width < 480 ? 48 : 58,
    };
    const innerW = Math.max(180, width - margin.left - margin.right);
    const innerH = Math.max(140, height - margin.top - margin.bottom);

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('height', height);

    if (viewMode === 'correlation') {
      // Rebuild static scaffold only when viewMode or dimensions change
      let root = svg.select<SVGGElement>('g.d3-corr-root');
      const isNewScaffold =
        root.empty() || root.attr('data-w') !== String(width);

      if (isNewScaffold) {
        svg.selectAll('*').remove();

        const defs = svg.append('defs');
        const glow = defs
          .append('filter')
          .attr('id', 'd3BubbleGlow')
          .attr('x', '-40%')
          .attr('y', '-40%')
          .attr('width', '180%')
          .attr('height', '180%');
        glow
          .append('feGaussianBlur')
          .attr('stdDeviation', '3')
          .attr('result', 'blur');
        const merge = glow.append('feMerge');
        merge.append('feMergeNode').attr('in', 'blur');
        merge.append('feMergeNode').attr('in', 'SourceGraphic');

        root = svg
          .append('g')
          .attr('class', 'd3-corr-root')
          .attr('data-w', String(width))
          .attr('transform', `translate(${margin.left},${margin.top})`);

        root.append('g').attr('class', 'd3-grid-y');
        root.append('g').attr('class', 'd3-grid-x');
        root.append('g').attr('class', 'd3-axis-x');
        root.append('g').attr('class', 'd3-axis-y');
        root.append('path').attr('class', 'd3-trend-guide');
        root.append('g').attr('class', 'd3-trajectory-layer');
        root.append('g').attr('class', 'd3-bubbles-layer');

        // Axis labels
        root
          .append('text')
          .attr('class', 'd3-x-label')
          .attr('x', innerW / 2)
          .attr('y', innerH + 34)
          .attr('text-anchor', 'middle')
          .attr('fill', '#7ea7d4')
          .style('font-size', '11px')
          .text('عدد الأنشطة والمنشآت الصناعية المسجلة');

        root
          .append('text')
          .attr('class', 'd3-y-label')
          .attr('x', 0)
          .attr('y', -8)
          .attr('text-anchor', 'start')
          .attr('fill', '#7ea7d4')
          .style('font-size', '10px')
          .text('انبعاثات CO₂e (طن/سنة)');
      }

      const xScale = d3
        .scaleLinear()
        .domain([0, globalExtents.maxActivities])
        .range([0, innerW])
        .nice();

      const yScale =
        scaleMode === 'symlog'
          ? d3
              .scaleSymlog()
              .constant(80_000)
              .domain([0, globalExtents.maxCo2])
              .range([innerH, 0])
          : d3
              .scaleLinear()
              .domain([0, globalExtents.maxCo2])
              .range([innerH, 0])
              .nice();

      const rScale = d3
        .scaleSqrt()
        .domain([0, globalExtents.maxCo2])
        .range([7, width < 480 ? 22 : 28]);

      const dataKey = `${effectiveYear}|${scaleMode}|${sectorFilter}|${width}`;
      const isDataTransition = prevDataKeyRef.current !== dataKey;
      prevDataKeyRef.current = dataKey;

      const t = d3
        .transition()
        .duration(isDataTransition ? 450 : 140)
        .ease(d3.easeCubicOut);

      // Clean Y tick values for symlog vs linear derived from live maxCo2
      const symlogCandidates = [
        0, 50_000, 250_000, 1_000_000, 4_000_000, 15_000_000,
      ].filter((v) => v <= globalExtents.maxCo2 * 1.05);
      const yTickValues =
        scaleMode === 'symlog'
          ? symlogCandidates.length >= 2
            ? symlogCandidates
            : yScale.ticks(4)
          : yScale.ticks(5);

      const xAxis = d3
        .axisBottom(xScale)
        .ticks(Math.min(8, globalExtents.maxActivities))
        .tickFormat((d) => String(Math.round(Number(d))))
        .tickSize(0)
        .tickPadding(8);

      const yAxis = d3
        .axisLeft(yScale)
        .tickValues(yTickValues)
        .tickFormat((d) => formatCo2eCompact(Number(d)))
        .tickSize(0)
        .tickPadding(8);

      root
        .select<SVGGElement>('g.d3-axis-x')
        .attr('transform', `translate(0,${innerH})`)
        .transition(t)
        .call(xAxis)
        .call((g) => g.select('.domain').attr('stroke', 'rgba(90, 174, 255, 0.35)'))
        .call((g) =>
          g
            .selectAll('text')
            .attr('fill', '#8db8e6')
            .style('font-size', '10px')
            .style('font-variant-numeric', 'tabular-nums')
        );

      root
        .select<SVGGElement>('g.d3-axis-y')
        .transition(t)
        .call(yAxis)
        .call((g) => g.select('.domain').attr('stroke', 'rgba(90, 174, 255, 0.28)'))
        .call((g) =>
          g
            .selectAll('text')
            .attr('fill', '#8db8e6')
            .style('font-size', '10px')
            .style('font-variant-numeric', 'tabular-nums')
        );

      // Horizontal & vertical subtle grid lines
      root
        .select<SVGGElement>('g.d3-grid-y')
        .selectAll<SVGLineElement, number>('line')
        .data(yTickValues, (d) => String(d))
        .join(
          (enter) =>
            enter
              .append('line')
              .attr('x1', 0)
              .attr('x2', innerW)
              .attr('y1', (d) => yScale(d))
              .attr('y2', (d) => yScale(d))
              .attr('stroke', 'rgba(56, 152, 255, 0.11)')
              .attr('stroke-dasharray', '2 4'),
          (update) =>
            update
              .transition(t)
              .attr('x2', innerW)
              .attr('y1', (d) => yScale(d))
              .attr('y2', (d) => yScale(d))
        );

      const xTicks = xScale.ticks(Math.min(7, globalExtents.maxActivities));
      root
        .select<SVGGElement>('g.d3-grid-x')
        .selectAll<SVGLineElement, number>('line')
        .data(xTicks, (d) => String(d))
        .join(
          (enter) =>
            enter
              .append('line')
              .attr('y1', 0)
              .attr('y2', innerH)
              .attr('x1', (d) => xScale(d))
              .attr('x2', (d) => xScale(d))
              .attr('stroke', 'rgba(56, 152, 255, 0.08)'),
          (update) =>
            update
              .transition(t)
              .attr('y2', innerH)
              .attr('x1', (d) => xScale(d))
              .attr('x2', (d) => xScale(d))
        );

      // Compute simple least-squares trend line in plotted screen coordinates
      if (activeBubbles.length >= 2) {
        const pts = activeBubbles.map((d) => ({
          x: xScale(d.activityCount),
          y: yScale(d.co2eTons),
        }));
        const meanX = d3.mean(pts, (p) => p.x) ?? 0;
        const meanY = d3.mean(pts, (p) => p.y) ?? 0;
        let num = 0;
        let den = 0;
        for (const p of pts) {
          num += (p.x - meanX) * (p.y - meanY);
          den += (p.x - meanX) * (p.x - meanX);
        }
        const slope = den > 0 ? num / den : 0;
        const intercept = meanY - slope * meanX;
        const minX = d3.min(pts, (p) => p.x) ?? 0;
        const maxX = d3.max(pts, (p) => p.x) ?? innerW;
        const clampY = (val: number) => Math.max(4, Math.min(innerH - 4, val));
        const guideLine = `M${minX.toFixed(1)},${clampY(slope * minX + intercept).toFixed(1)}L${maxX.toFixed(1)},${clampY(slope * maxX + intercept).toFixed(1)}`;

        root
          .select<SVGPathElement>('path.d3-trend-guide')
          .transition(t)
          .attr('d', guideLine)
          .attr('fill', 'none')
          .attr('stroke', 'rgba(117, 216, 255, 0.34)')
          .attr('stroke-width', 1.2)
          .attr('stroke-dasharray', '4 4');
      } else {
        root.select('path.d3-trend-guide').attr('d', null);
      }

      // Draw multi-year trajectory trail for the focused governorate (hovered or selected)
      const trajLayer = root.select<SVGGElement>('g.d3-trajectory-layer');
      trajLayer.selectAll('*').remove();

      if (focusedGovId) {
        const trailPoints = years
          .map((yr) => {
            const match = getYearBubbles(yr).find(
              (b) => b.governorateId === focusedGovId
            );
            return match
              ? {
                  year: yr,
                  x: xScale(match.activityCount),
                  y: yScale(match.co2eTons),
                  sector: match.dominantSector,
                }
              : null;
          })
          .filter(
            (
              p
            ): p is {
              year: number;
              x: number;
              y: number;
              sector: IndustrialSectorKey;
            } => p !== null
          );

        if (trailPoints.length >= 2) {
          const lineGen = d3
            .line<{ x: number; y: number }>()
            .x((d) => d.x)
            .y((d) => d.y);
          const color =
            SECTOR_META_MAP[trailPoints[trailPoints.length - 1].sector].color;

          trajLayer
            .append('path')
            .datum(trailPoints)
            .attr('d', lineGen)
            .attr('fill', 'none')
            .attr('stroke', color)
            .attr('stroke-width', 1.8)
            .attr('stroke-dasharray', '3 3')
            .attr('opacity', 0.85);

          trajLayer
            .selectAll('circle.trail-dot')
            .data(trailPoints)
            .join('circle')
            .attr('class', 'trail-dot')
            .attr('cx', (d) => d.x)
            .attr('cy', (d) => d.y)
            .attr('r', (d) => (d.year === effectiveYear ? 4 : 2.8))
            .attr('fill', '#041437')
            .attr('stroke', color)
            .attr('stroke-width', 1.5);

          trajLayer
            .selectAll('text.trail-year')
            .data(trailPoints.filter((d) => d.year !== effectiveYear))
            .join('text')
            .attr('class', 'trail-year')
            .attr('x', (d) => d.x + 6)
            .attr('y', (d) => d.y - 4)
            .attr('fill', '#cbe9ff')
            .style('font-size', '9px')
            .style('font-variant-numeric', 'tabular-nums')
            .text((d) => String(d.year));
        }
      }

      // Render interactive governorate bubbles with smooth D3 data-join transitions
      const bubblesLayer = root.select<SVGGElement>('g.d3-bubbles-layer');

      const groups = bubblesLayer
        .selectAll<SVGGElement, BubbleDatum>('g.gov-bubble')
        .data(activeBubbles, (d) => d.governorateId);

      const entered = groups
        .enter()
        .append('g')
        .attr('class', 'gov-bubble')
        .style('cursor', 'pointer')
        .attr(
          'transform',
          (d) =>
            `translate(${xScale(d.activityCount)},${yScale(d.co2eTons)})`
        );

      entered
        .append('circle')
        .attr('class', 'bubble-ring')
        .attr('r', 0)
        .attr('fill', 'none');

      entered
        .append('circle')
        .attr('class', 'bubble-core')
        .attr('r', 0);

      entered
        .append('text')
        .attr('class', 'bubble-label')
        .attr('text-anchor', 'middle')
        .style('pointer-events', 'none')
        .style('font-family', 'Cairo, sans-serif');

      const merged = entered.merge(groups);

      merged
        .on('mouseenter', (_ev, d) => setHoveredGovId(d.governorateId))
        .on('mouseleave', () => setHoveredGovId(null))
        .on('click', (_ev, d) => {
          onSelectGovernorate(
            selectedGovId === d.governorateId ? null : d.governorateId
          );
        });

      merged
        .transition(t)
        .attr(
          'transform',
          (d) =>
            `translate(${xScale(d.activityCount)},${yScale(d.co2eTons)})`
        )
        .style('opacity', (d) => {
          if (!focusedGovId) return 1;
          return d.governorateId === focusedGovId ? 1 : 0.34;
        });

      merged
        .select<SVGCircleElement>('circle.bubble-core')
        .transition(t)
        .attr('r', (d) => rScale(d.co2eTons))
        .attr('fill', (d) => SECTOR_META_MAP[d.dominantSector].color)
        .attr('fill-opacity', (d) =>
          d.governorateId === focusedGovId ? 0.52 : 0.28
        )
        .attr('stroke', (d) =>
          d.governorateId === selectedGovId
            ? '#ffffff'
            : SECTOR_META_MAP[d.dominantSector].color
        )
        .attr('stroke-width', (d) =>
          d.governorateId === focusedGovId ? 2.2 : 1.4
        )
        .attr('filter', (d) =>
          d.governorateId === focusedGovId ? 'url(#d3BubbleGlow)' : null
        );

      merged
        .select<SVGCircleElement>('circle.bubble-ring')
        .transition(t)
        .attr('r', (d) =>
          d.governorateId === focusedGovId ? rScale(d.co2eTons) + 5 : 0
        )
        .attr('stroke', (d) => SECTOR_META_MAP[d.dominantSector].color)
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3 3')
        .attr('opacity', (d) => (d.governorateId === focusedGovId ? 0.85 : 0));

      // Keep labels legible for major emitters and the focused governorate
      const sortedTopIds = new Set(
        [...activeBubbles]
          .sort((a, b) => b.co2eTons - a.co2eTons)
          .slice(0, width < 480 ? 5 : 8)
          .map((b) => b.governorateId)
      );

      merged
        .select<SVGTextElement>('text.bubble-label')
        .text((d) => d.governorateNameAr)
        .transition(t)
        .attr('y', (d) => -(rScale(d.co2eTons) + 5))
        .attr('fill', (d) =>
          d.governorateId === focusedGovId ? '#ffffff' : '#cbe9ff'
        )
        .style('font-size', (d) =>
          d.governorateId === focusedGovId ? '11px' : '9.5px'
        )
        .style('font-weight', (d) =>
          d.governorateId === focusedGovId ? '700' : '600'
        )
        .style('opacity', (d) =>
          d.governorateId === focusedGovId || sortedTopIds.has(d.governorateId)
            ? 1
            : 0
        );

      groups.exit().transition(t).style('opacity', 0).remove();
    } else {
      // VIEW 2: D3 Stacked Area Chart showing multi-year emissions by industrial activity sector
      svg.selectAll('*').remove();

      const defs = svg.append('defs');
      INDUSTRIAL_SECTORS.forEach((s) => {
        const grad = defs
          .append('linearGradient')
          .attr('id', `d3AreaGrad-${s.key}`)
          .attr('x1', '0')
          .attr('y1', '0')
          .attr('x2', '0')
          .attr('y2', '1');
        grad.append('stop').attr('offset', '0%').attr('stop-color', s.color).attr('stop-opacity', 0.55);
        grad.append('stop').attr('offset', '100%').attr('stop-color', s.color).attr('stop-opacity', 0.08);
      });

      const root = svg
        .append('g')
        .attr('class', 'd3-timeline-root')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const activeKeys: IndustrialSectorKey[] =
        sectorFilter === 'all'
          ? ['industrial_fuel', 'heavy_industry', 'power', 'oil_gas']
          : [sectorFilter];

      const stackGen = d3
        .stack<(typeof timelineSeries)[number], IndustrialSectorKey>()
        .keys(activeKeys);

      const stackedLayers = stackGen(timelineSeries);
      const maxStacked =
        d3.max(stackedLayers, (layer) => d3.max(layer, (d) => d[1])) ?? 1;

      const xDomain: [number, number] =
        years.length > 1
          ? [years[0], years[years.length - 1]]
          : [years[0] - 1, years[0] + 1];

      const xScale = d3
        .scaleLinear()
        .domain(xDomain)
        .range([0, innerW]);

      const yScale = d3
        .scaleLinear()
        .domain([0, Math.max(1, maxStacked * 1.15)])
        .range([innerH, 0])
        .nice();

      // Grid lines
      const yTicks = yScale.ticks(5);
      root
        .append('g')
        .selectAll('line')
        .data(yTicks)
        .join('line')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', (d) => yScale(d))
        .attr('y2', (d) => yScale(d))
        .attr('stroke', 'rgba(56, 152, 255, 0.12)')
        .attr('stroke-dasharray', '2 4');

      // Axes
      root
        .append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(
          d3
            .axisBottom(xScale)
            .tickValues(years)
            .tickFormat((d) => String(d))
            .tickSize(0)
            .tickPadding(10)
        )
        .call((g) => g.select('.domain').attr('stroke', 'rgba(90, 174, 255, 0.35)'))
        .call((g) =>
          g
            .selectAll('text')
            .attr('fill', '#9ec4ea')
            .style('font-size', '10.5px')
            .style('font-variant-numeric', 'tabular-nums')
        );

      root
        .append('g')
        .call(
          d3
            .axisLeft(yScale)
            .ticks(5)
            .tickFormat((d) => formatCo2eCompact(Number(d)))
            .tickSize(0)
            .tickPadding(8)
        )
        .call((g) => g.select('.domain').attr('stroke', 'rgba(90, 174, 255, 0.28)'))
        .call((g) =>
          g
            .selectAll('text')
            .attr('fill', '#8db8e6')
            .style('font-size', '10px')
            .style('font-variant-numeric', 'tabular-nums')
        );

      root
        .append('text')
        .attr('x', 0)
        .attr('y', -8)
        .attr('text-anchor', 'start')
        .attr('fill', '#7ea7d4')
        .style('font-size', '10px')
        .text('انبعاثات CO₂e حسب النشاط الصناعي (طن/سنة)');

      const areaGen = d3
        .area<d3.SeriesPoint<(typeof timelineSeries)[number]>>()
        .x((d) => xScale(d.data.year))
        .y0((d) => yScale(d[0]))
        .y1((d) => yScale(d[1]))
        .curve(d3.curveMonotoneX);

      const lineGen = d3
        .line<d3.SeriesPoint<(typeof timelineSeries)[number]>>()
        .x((d) => xScale(d.data.year))
        .y((d) => yScale(d[1]))
        .curve(d3.curveMonotoneX);

      root
        .selectAll('path.d3-stack-area')
        .data(stackedLayers)
        .join('path')
        .attr('class', 'd3-stack-area')
        .attr('d', areaGen)
        .attr('fill', (d) => `url(#d3AreaGrad-${d.key})`);

      root
        .selectAll('path.d3-stack-stroke')
        .data(stackedLayers)
        .join('path')
        .attr('class', 'd3-stack-stroke')
        .attr('d', lineGen)
        .attr('fill', 'none')
        .attr('stroke', (d) => SECTOR_META_MAP[d.key].color)
        .attr('stroke-width', 1.8);

      // Vertical hover guide line & year selection overlay
      const guideYear = hoveredYear ?? effectiveYear;
      const gx = xScale(guideYear);
      root
        .append('line')
        .attr('x1', gx)
        .attr('x2', gx)
        .attr('y1', 0)
        .attr('y2', innerH)
        .attr('stroke', 'rgba(117, 216, 255, 0.55)')
        .attr('stroke-dasharray', '3 3');

      stackedLayers.forEach((layer) => {
        const pt = layer.find((p) => p.data.year === guideYear);
        if (!pt || pt[1] - pt[0] <= 0) return;
        root
          .append('circle')
          .attr('cx', gx)
          .attr('cy', yScale(pt[1]))
          .attr('r', 3.6)
          .attr('fill', SECTOR_META_MAP[layer.key].color)
          .attr('stroke', '#041437')
          .attr('stroke-width', 1.2);
      });

      // Interactive hit zones for each year column
      const colW = innerW / Math.max(1, years.length - 1);
      root
        .selectAll('rect.year-hit')
        .data(years)
        .join('rect')
        .attr('class', 'year-hit')
        .attr('x', (y) => Math.max(0, xScale(y) - colW / 2))
        .attr('y', 0)
        .attr('width', colW)
        .attr('height', innerH)
        .attr('fill', 'transparent')
        .style('cursor', 'pointer')
        .on('mouseenter', (_ev, y) => setHoveredYear(y))
        .on('mouseleave', () => setHoveredYear(null))
        .on('click', (_ev, y) => setActiveYear(y));
    }
  }, [
    dataset,
    viewMode,
    scaleMode,
    sectorFilter,
    effectiveYear,
    chartWidth,
    activeBubbles,
    globalExtents,
    focusedGovId,
    selectedGovId,
    onSelectGovernorate,
    years,
    getYearBubbles,
    timelineSeries,
    hoveredYear,
  ]);

  const activeTimelinePoint = useMemo(() => {
    const yr = hoveredYear ?? effectiveYear;
    return timelineSeries.find((d) => d.year === yr) || null;
  }, [timelineSeries, hoveredYear, effectiveYear]);

  const selectedGovName = useMemo(() => {
    if (!selectedGovId || !dataset || effectiveYear === 0) return null;
    return (
      dataset.byYear[effectiveYear]?.find(
        (r) => r.governorateId === selectedGovId
      )?.governorateNameAr ?? null
    );
  }, [selectedGovId, dataset, effectiveYear]);

  const yearsRangeLabel =
    years.length >= 2
      ? `${years[0]}-${years[years.length - 1]}`
      : years.length === 1
      ? String(years[0])
      : '';

  return (
    <section
      aria-label="انبعاثات الكربون والأنشطة الصناعية"
      className="w-full relative"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-2.5">
        <div className="hud-title-bar">
          <span className="bracket-tl" aria-hidden="true" />
          <span className="bracket-br" aria-hidden="true" />
          <h2 className="font-display text-[13.5px] sm:text-[14.5px] font-semibold tracking-wide text-[#c8e4ff] leading-tight whitespace-nowrap">
            الكربون والأنشطة الصناعية
          </h2>
        </div>

        {/* Interactive Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {selectedGovName ? (
            <button
              type="button"
              onClick={() => onSelectGovernorate(null)}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-[#75d8ff] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3 h-3" />
              <span>كل المحافظات</span>
            </button>
          ) : dataset ? (
            <span className="hidden sm:inline text-[10.5px] text-[#78a4d4] whitespace-nowrap">
              {dataset.sourceName}
              {yearsRangeLabel ? ` · ${yearsRangeLabel}` : ''}
            </span>
          ) : null}

          {/* Chart View Mode */}
          <div
            className="inline-flex items-center bg-[#061c47]/80 border border-cyan-400/25 p-0.5 text-[11px]"
            role="tablist"
            aria-label="نمط الرسم البياني"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'correlation'}
              onClick={() => setViewMode('correlation')}
              className={`px-2.5 py-1 transition-colors whitespace-nowrap cursor-pointer ${
                viewMode === 'correlation'
                  ? 'bg-[#0f3d8a] text-white font-semibold'
                  : 'text-[#8db8e6] hover:text-white'
              }`}
            >
              توزيع المحافظات
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'timeline'}
              onClick={() => {
                setIsPlaying(false);
                setViewMode('timeline');
              }}
              className={`px-2.5 py-1 transition-colors whitespace-nowrap cursor-pointer ${
                viewMode === 'timeline'
                  ? 'bg-[#0f3d8a] text-white font-semibold'
                  : 'text-[#8db8e6] hover:text-white'
              }`}
            >
              تطور القطاعات
            </button>
          </div>

          {viewMode === 'correlation' && (
            <div className="inline-flex items-center bg-[#061c47]/80 border border-cyan-400/25 p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setScaleMode('symlog')}
                className={`px-2 py-1 transition-colors whitespace-nowrap cursor-pointer ${
                  scaleMode === 'symlog'
                    ? 'bg-[#0f3d8a] text-white font-semibold'
                    : 'text-[#8db8e6] hover:text-white'
                }`}
              >
                مقياس نسبي
              </button>
              <button
                type="button"
                onClick={() => setScaleMode('linear')}
                className={`px-2 py-1 transition-colors whitespace-nowrap cursor-pointer ${
                  scaleMode === 'linear'
                    ? 'bg-[#0f3d8a] text-white font-semibold'
                    : 'text-[#8db8e6] hover:text-white'
                }`}
              >
                مقياس خطي
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main HUD Container: Single-Elevation Surface */}
      <div className="hud-table-surface p-3 sm:p-4">
        {/* Sector Filter Row + Year Playback Scrubber */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-3 mb-3 border-b border-cyan-400/15">
          {/* Sector Filter Buttons */}
          <div
            className="flex flex-wrap items-center gap-1.5 text-[11px]"
            role="group"
            aria-label="تصفية حسب النشاط الصناعي"
          >
            <button
              type="button"
              onClick={() => setSectorFilter('all')}
              className={`px-2.5 py-1 border transition-colors whitespace-nowrap cursor-pointer ${
                sectorFilter === 'all'
                  ? 'bg-[#0e3982] border-cyan-300/60 text-white font-semibold'
                  : 'bg-[#05183f]/65 border-cyan-400/20 text-[#96bee8] hover:text-white'
              }`}
            >
              جميع الأنشطة
            </button>
            {INDUSTRIAL_SECTORS.map((sec) => {
              const active = sectorFilter === sec.key;
              return (
                <button
                  key={sec.key}
                  type="button"
                  onClick={() =>
                    setSectorFilter(active ? 'all' : sec.key)
                  }
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 border transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-[#0e3982] border-cyan-300/60 text-white font-semibold'
                      : 'bg-[#05183f]/65 border-cyan-400/20 text-[#96bee8] hover:text-white'
                  }`}
                >
                  <span
                    className="w-2 h-2 shrink-0"
                    style={{ backgroundColor: sec.color }}
                    aria-hidden="true"
                  />
                  <span>{sec.shortAr}</span>
                </button>
              );
            })}
          </div>

          {/* Year Scrubber + Play/Pause */}
          <div className="flex items-center gap-1.5 self-start md:self-auto">
            {viewMode === 'correlation' && (
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                aria-label={isPlaying ? 'إيقاف العرض الزمني' : 'تشغيل العرض الزمني'}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#cbe9ff] bg-[#08255a]/90 hover:bg-[#0e3b88] border border-cyan-400/35 transition-colors cursor-pointer whitespace-nowrap"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3 h-3 text-[#38bdf8]" />
                    <span>إيقاف</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 text-[#3ef2b2]" />
                    <span>تشغيل</span>
                  </>
                )}
              </button>
            )}

            <div className="inline-flex items-center bg-[#05173d]/85 border border-cyan-400/25 p-0.5">
              {years.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setActiveYear(yr);
                  }}
                  className={`font-tabular px-2 py-0.5 text-[11px] transition-colors cursor-pointer ${
                    effectiveYear === yr
                      ? 'bg-[#104294] text-[#75d8ff] font-bold'
                      : 'text-[#86b1de] hover:text-white'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart + Recorded Activities Inspector Grid */}
        {isLoading && !dataset ? (
          <div className="h-[308px] flex items-center justify-center text-xs text-[#78a4d4] animate-pulse">
            جارٍ تحميل بيانات الانبعاثات والأنشطة الصناعية...
          </div>
        ) : error && !dataset ? (
          <div className="h-[220px] flex flex-col items-center justify-center gap-2.5 text-xs text-rose-200">
            <span>{error}</span>
            <button
              type="button"
              onClick={onRetry}
              className="px-3 py-1 bg-[#0b2f70] border border-cyan-400/35 text-white hover:bg-[#104294] transition-colors cursor-pointer"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* D3 Interactive SVG Canvas */}
            <div className="lg:col-span-8 relative min-w-0">
              {/* Compact contextual readout bar (no floating overlap over chart data) */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5 min-h-[24px] text-[11px] text-[#a9cff2]">
                {viewMode === 'correlation' ? (
                  focusedBubble ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display font-bold text-white">
                          {focusedBubble.governorateNameAr} ({effectiveYear})
                        </span>
                        <span className="text-[#5e8bbd]" aria-hidden="true">·</span>
                        <span>
                          الانبعاثات{' '}
                          <strong className="font-tabular text-[#75d8ff]">
                            {formatCo2eArabic(focusedBubble.co2eTons)}
                          </strong>
                        </span>
                        <span className="text-[#5e8bbd]" aria-hidden="true">·</span>
                        <span>
                          الأنشطة المسجلة{' '}
                          <strong className="font-tabular text-[#3ef2b2]">
                            {focusedBubble.activityCount}
                          </strong>
                          {focusedBubble.majorPlantCount > 0 && (
                            <span className="text-[#8cb7e3]">
                              {' '}
                              (منها {focusedBubble.majorPlantCount} منشأة كبرى)
                            </span>
                          )}
                        </span>
                      </div>
                      {focusedBubble.yoyPct !== null && (
                        <span
                          className={`font-tabular font-semibold ${
                            focusedBubble.yoyPct > 0
                              ? 'text-amber-300'
                              : focusedBubble.yoyPct < 0
                              ? 'text-emerald-300'
                              : 'text-[#8db8e6]'
                          }`}
                          dir="ltr"
                        >
                          {focusedBubble.yoyPct > 0 ? '+' : ''}
                          {focusedBubble.yoyPct}% YoY
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span>
                        انقر على أي محافظة لتثبيتها ومزامنتها مع الخريطة، أو مرّر المؤشر لعرض مسارها عبر السنوات
                      </span>
                      {effectiveYear > 0 && (
                        <span className="font-tabular text-[#75d8ff]">
                          عام {effectiveYear}
                        </span>
                      )}
                    </>
                  )
                ) : activeTimelinePoint ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display font-bold text-white">
                        {selectedGovName || 'إجمالي سوريا'} ({activeTimelinePoint.year})
                      </span>
                      <span className="text-[#5e8bbd]" aria-hidden="true">·</span>
                      <span>
                        الإجمالي{' '}
                        <strong className="font-tabular text-[#75d8ff]">
                          {formatCo2eArabic(activeTimelinePoint.total)}
                        </strong>
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[10.5px]">
                      {INDUSTRIAL_SECTORS.map((s) => {
                        const val = activeTimelinePoint[s.key];
                        if (val <= 0) return null;
                        return (
                          <span key={s.key} className="inline-flex items-center gap-1">
                            <span
                              className="w-1.5 h-1.5"
                              style={{ backgroundColor: s.color }}
                              aria-hidden="true"
                            />
                            <span className="text-[#8db8e6]">{s.shortAr}</span>
                            <span className="font-tabular text-white">
                              {formatCo2eCompact(val)}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </>
                ) : null}
              </div>

              <div ref={containerRef} className="w-full relative">
                <svg
                  ref={svgRef}
                  direction="ltr"
                  className="w-full block overflow-visible"
                  role="img"
                  aria-label="رسم بياني تفاعلي بمكتبة D3 يوضح العلاقة بين انبعاثات الكربون والأنشطة الصناعية المسجلة في المحافظات السورية عبر السنوات"
                />
                {viewMode === 'correlation' && activeBubbles.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-4 text-center bg-[#041437]/88 border border-cyan-400/20">
                    <p className="text-xs text-[#cbe9ff] max-w-md leading-relaxed">
                      {sectorFilter === 'oil_gas'
                        ? 'تُنشَر بيانات النفط والغاز لسوريا في قاعدة Climate TRACE كمجمّع أحواض على المستوى الوطني وليس موزّعة على المحافظات.'
                        : 'لا توجد أنشطة مسجلة على مستوى المحافظات لهذا القطاع في العام المحدد.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPlaying(false);
                        setViewMode('timeline');
                      }}
                      className="px-3 py-1 text-[11px] font-semibold bg-[#0f3d8a] hover:bg-[#1450b2] border border-cyan-300/40 text-white transition-colors cursor-pointer"
                    >
                      عرض تطور القطاع على المستوى الوطني
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Recorded Industrial Activities Breakdown Column */}
            <div className="lg:col-span-4 lg:border-r lg:border-cyan-400/15 lg:pr-4 flex flex-col">
              <div className="flex items-baseline justify-between gap-2 pb-2 mb-2 border-b border-cyan-400/15">
                <h3 className="font-display text-[13px] font-semibold text-[#d9efff] truncate">
                  {detailPanelData.title}
                </h3>
                <span className="font-tabular text-[11px] text-[#75d8ff] whitespace-nowrap shrink-0">
                  {formatCo2eArabic(detailPanelData.totalCo2)}
                </span>
              </div>

              {detailPanelData.items.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#7ea7d4]">
                  لا توجد أنشطة مسجلة لهذا القطاع في النطاق المحدد
                </div>
              ) : (
                <ul className="divide-y divide-cyan-400/10">
                  {detailPanelData.items.map((item) => {
                    const secMeta = SECTOR_META_MAP[item.sector];
                    const sharePct =
                      detailPanelData.totalCo2 > 0
                        ? Math.min(
                            100,
                            Math.round((item.co2eTons / detailPanelData.totalCo2) * 100)
                          )
                        : 0;

                    const rowInner = (
                      <>
                        <div className="flex items-start justify-between gap-2 text-[11.5px]">
                          <div className="min-w-0">
                            <div className="text-[#e3f2ff] group-hover:text-white font-medium truncate">
                              {item.nameAr}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-[#83aedb] mt-0.5">
                              <span>{secMeta.shortAr}</span>
                              {!focusedGovId && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span>{item.govNameAr}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <span className="font-tabular text-[11px] font-semibold text-[#cbe9ff] whitespace-nowrap shrink-0">
                            {formatCo2eArabic(item.co2eTons)}
                          </span>
                        </div>

                        <div className="mt-1.5 h-1 w-full bg-[#072052] overflow-hidden">
                          <div
                            className="h-full transition-all duration-300"
                            style={{
                              width: `${Math.max(item.co2eTons > 0 ? 3 : 0, sharePct)}%`,
                              backgroundColor: secMeta.color,
                            }}
                          />
                        </div>
                      </>
                    );

                    return (
                      <li
                        key={`${item.id}-${item.subsectorRaw}`}
                        className="py-1.5 first:pt-0.5 last:pb-0"
                      >
                        {item.governorateId ? (
                          <button
                            type="button"
                            onClick={() =>
                              onSelectGovernorate(
                                selectedGovId === item.governorateId
                                  ? null
                                  : item.governorateId
                              )
                            }
                            onMouseEnter={() => setHoveredGovId(item.governorateId)}
                            onMouseLeave={() => setHoveredGovId(null)}
                            className="w-full text-right group cursor-pointer py-0.5 hover:bg-cyan-400/5 transition-colors"
                          >
                            {rowInner}
                          </button>
                        ) : (
                          <div className="w-full text-right py-0.5">
                            {rowInner}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-3 pt-2 border-t border-cyan-400/12 flex items-center justify-between text-[10.5px] text-[#7ea7d4]">
                <span>إجمالي السجلات في النطاق</span>
                <span className="font-tabular text-[#cbe9ff] font-semibold">
                  {detailPanelData.count} نشاط مسجل
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
