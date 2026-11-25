import type { EChartsCoreOption } from 'echarts/core'

export interface ChartTokens {
  text: string
  muted: string
  faint: string
  line: string
  surface: string
  tooltip: string
  accent: string
  font: string
}

/** Reads the live theme tokens so charts follow light/dark like the rest of the UI. */
export function readChartTokens(): ChartTokens {
  const css = getComputedStyle(document.documentElement)
  const v = (name: string): string => css.getPropertyValue(name).trim()
  return {
    text: v('--text'),
    muted: v('--muted'),
    faint: v('--faint'),
    line: v('--line'),
    surface: v('--surface'),
    tooltip: v('--surface-2'),
    accent: v('--iris'),
    font: "'Schibsted Grotesk Variable', ui-sans-serif, system-ui, sans-serif"
  }
}

function tooltip(t: ChartTokens) {
  return {
    trigger: 'axis' as const,
    backgroundColor: t.tooltip,
    borderColor: t.line,
    borderWidth: 1,
    padding: [8, 12],
    textStyle: { color: t.text, fontFamily: t.font, fontSize: 13 },
    extraCssText: 'border-radius: 10px; box-shadow: 0 8px 24px rgb(0 0 0 / 0.25);'
  }
}

interface BarOptions {
  categories: string[]
  values: number[]
  /** Tooltip line for one bar. */
  format: (value: number, index: number) => string
  /** Axis tick label. */
  axisFormat?: (value: number) => string
  /** Optional dashed reference line, e.g. the daily goal. */
  reference?: { value: number; label: string }
  /** Fewer labels on long ranges. */
  labelInterval?: number
  /** Values are minutes: ticks snap to 15/30/60-minute multiples. */
  minutes?: boolean
}

/** A tick step that gives at most four intervals and lands on clock-friendly minutes. */
function minuteStep(max: number): number {
  const steps = [5, 10, 15, 30, 60, 120, 180, 240, 360, 480, 720]
  return steps.find((s) => max / s <= 4) ?? 1440
}

/**
 * Single-series bar chart: thin rounded bars on the baseline, one hue,
 * recessive grid, per-bar tooltip. No legend (the title names the series).
 */
export function barOption(t: ChartTokens, o: BarOptions): EChartsCoreOption {
  const n = o.categories.length
  return {
    animationDuration: 300,
    textStyle: { fontFamily: t.font },
    grid: { left: 8, right: 8, top: o.reference ? 22 : 12, bottom: 4, containLabel: true },
    tooltip: {
      ...tooltip(t),
      axisPointer: { type: 'shadow', shadowStyle: { color: t.line, opacity: 0.25 } },
      formatter: (params: { dataIndex: number; name: string; value: number }[]) => {
        const p = params[0]
        return `<div style="color:${t.muted};margin-bottom:2px">${p.name}</div>${o.format(p.value, p.dataIndex)}`
      }
    },
    xAxis: {
      type: 'category',
      data: o.categories,
      axisLine: { lineStyle: { color: t.line } },
      axisTick: { show: false },
      axisLabel: { color: t.faint, fontSize: 11, interval: o.labelInterval ?? 'auto', hideOverlap: true }
    },
    yAxis: {
      type: 'value',
      splitNumber: 3,
      splitLine: { lineStyle: { color: t.line, opacity: 0.6 } },
      axisLabel: { color: t.faint, fontSize: 11, formatter: o.minutes ? minuteTick : o.axisFormat },
      minInterval: 1,
      ...(o.minutes
        ? (() => {
            const max = Math.max(o.reference?.value ?? 0, ...o.values, 1)
            const step = minuteStep(max)
            return { interval: step, max: Math.ceil(max / step) * step }
          })()
        : {})
    },
    series: [
      {
        type: 'bar',
        data: o.values,
        barMaxWidth: n > 40 ? 8 : n > 14 ? 14 : 28,
        barCategoryGap: '35%',
        itemStyle: { color: t.accent, borderRadius: [4, 4, 0, 0] },
        emphasis: { itemStyle: { color: t.accent, opacity: 0.85 } },
        markLine: o.reference
          ? {
              silent: true,
              symbol: 'none',
              lineStyle: { color: t.muted, type: 'dashed', width: 1 },
              label: { formatter: o.reference.label, color: t.muted, position: 'insideEndTop', fontSize: 11 },
              data: [{ yAxis: o.reference.value }]
            }
          : undefined
      }
    ]
  }
}

interface LineOptions {
  categories: string[]
  values: number[]
  min: number
  max: number
  format: (value: number, index: number) => string
}

/** Single-series line with ≥8px markers and an axis crosshair tooltip. */
export function lineOption(t: ChartTokens, o: LineOptions): EChartsCoreOption {
  return {
    animationDuration: 300,
    textStyle: { fontFamily: t.font },
    grid: { left: 8, right: 12, top: 12, bottom: 4, containLabel: true },
    tooltip: {
      ...tooltip(t),
      axisPointer: { type: 'line', lineStyle: { color: t.muted, type: 'dashed' } },
      formatter: (params: { dataIndex: number; name: string; value: number }[]) => {
        const p = params[0]
        return `<div style="color:${t.muted};margin-bottom:2px">${p.name}</div>${o.format(p.value, p.dataIndex)}`
      }
    },
    xAxis: {
      type: 'category',
      data: o.categories,
      boundaryGap: false,
      axisLine: { lineStyle: { color: t.line } },
      axisTick: { show: false },
      axisLabel: { color: t.faint, fontSize: 11, hideOverlap: true }
    },
    yAxis: {
      type: 'value',
      min: o.min,
      max: o.max,
      interval: 1,
      splitLine: { lineStyle: { color: t.line, opacity: 0.6 } },
      axisLabel: { color: t.faint, fontSize: 11 }
    },
    series: [
      {
        type: 'line',
        data: o.values,
        lineStyle: { color: t.accent, width: 2 },
        itemStyle: { color: t.accent, borderColor: t.surface, borderWidth: 2 },
        symbol: 'circle',
        symbolSize: 9,
        showSymbol: true
      }
    ]
  }
}

/** One row of a directly labelled horizontal bar list. */
export interface BarItem {
  key: string
  label: string
  /** 0–1 bar length. */
  fraction: number
  value: string
  detail?: string
  color?: string
}

/** Compact minute ticks: 30m, 1 h, 1.5 h, 2 h. */
export function minuteTick(v: number): string {
  if (v < 60) return `${v}m`
  const h = v / 60
  return `${Number.isInteger(h) ? h : h.toFixed(1)} h`
}
