<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, MarkLineComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsCoreOption } from 'echarts/core'
import { isDark } from '@/composables/useTheme'
import { readChartTokens, type ChartTokens } from '@/utils/charts'

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, MarkLineComponent, CanvasRenderer])

/**
 * Thin ECharts wrapper. `build` receives the current theme tokens, so charts
 * are written against roles (text, grid, accent) and re-render on theme change.
 */
const props = withDefaults(
  defineProps<{ build: (t: ChartTokens) => EChartsCoreOption; label: string; height?: number }>(),
  { height: 220 }
)

const el = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
let observer: ResizeObserver | null = null

function render(): void {
  if (!chart) return
  chart.setOption(props.build(readChartTokens()), true)
}

onMounted(() => {
  if (!el.value) return
  chart = echarts.init(el.value, null, { renderer: 'canvas' })
  render()
  observer = new ResizeObserver(() => chart?.resize())
  observer.observe(el.value)
})

// Theme tokens are read from CSS after the class flips, hence the frame delay.
watch([() => props.build, isDark], () => requestAnimationFrame(render))

onBeforeUnmount(() => {
  observer?.disconnect()
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div ref="el" role="img" :aria-label="label" :style="{ height: `${height}px` }" class="w-full" />
</template>
