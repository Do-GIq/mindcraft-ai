import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

export type TrendDataPoint = {
  date: string
  count: number
  successCount?: number
  failedCount?: number
  generatedCharacterCount?: number
}

type Props = {
  data: TrendDataPoint[]
  seriesName: string
  color?: string
  compact?: boolean
}

export default function TrendChart({ data, seriesName, color = '#4b7ddd', compact = false }: Props) {
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartRef.current) return
    const chart = echarts.init(chartRef.current)
    chart.setOption({
      animationDuration: 300,
      color: [color],
      grid: compact
        ? { left: 32, right: 12, top: 16, bottom: 26 }
        : { left: 42, right: 20, top: 30, bottom: 34 },
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const first = Array.isArray(params)
            ? (params[0] as { dataIndex?: number } | undefined)
            : undefined
          const point = first?.dataIndex === undefined ? undefined : data[first.dataIndex]
          if (!point) return ''
          const details = [
            `${point.date}<br/>${seriesName}：${point.count} 次`,
            point.successCount === undefined ? '' : `<br/>成功：${point.successCount} 次`,
            point.failedCount === undefined ? '' : `<br/>失败：${point.failedCount} 次`,
            point.generatedCharacterCount === undefined
              ? ''
              : `<br/>生成字符：${point.generatedCharacterCount.toLocaleString('zh-CN')}`,
          ]
          return details.join('')
        },
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: data.map(({ date }) => date.slice(5).replace('-', '/')),
        axisLine: { lineStyle: { color: '#dfe4ec' } },
        axisLabel: { color: '#7b8494', hideOverlap: true, fontSize: compact ? 10 : 12 },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: '#7b8494', fontSize: compact ? 10 : 12 },
        splitLine: { lineStyle: { color: '#edf0f4' } },
      },
      series: [{
        name: seriesName,
        type: 'line',
        smooth: true,
        symbolSize: compact ? 5 : 7,
        data: data.map(({ count }) => count),
        areaStyle: { opacity: .1 },
        lineStyle: { width: 2 },
      }],
    })
    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(chartRef.current)
    return () => { observer.disconnect(); chart.dispose() }
  }, [color, compact, data, seriesName])

  return <div className={compact ? 'trend-chart is-compact' : 'trend-chart'} ref={chartRef} />
}
