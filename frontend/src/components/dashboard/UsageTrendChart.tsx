import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { usageTrend } from '../../data/dashboard'

function UsageTrendChart() {
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartRef.current) return

    const chart = echarts.init(chartRef.current)
    chart.setOption({
      color: ['#2f67d8', '#28a7a4'],
      tooltip: { trigger: 'axis' },
      legend: { left: 4, top: 0, icon: 'roundRect', itemWidth: 14, itemHeight: 4, textStyle: { color: '#667085' } },
      grid: { left: 8, right: 24, top: 42, bottom: 8, containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: usageTrend.dates, axisLine: { lineStyle: { color: '#dfe3ea' } }, axisTick: { show: false }, axisLabel: { color: '#667085' } },
      yAxis: { type: 'value', min: 0, max: 80, splitLine: { lineStyle: { color: '#eef1f5' } }, axisLabel: { color: '#667085' } },
      series: [
        { name: 'AI 生成次数', type: 'line', smooth: true, data: usageTrend.generations, symbolSize: 7, lineStyle: { width: 2 }, areaStyle: { color: 'rgba(47, 103, 216, 0.06)' } },
        { name: '生成字数（千）', type: 'line', smooth: true, data: usageTrend.words, symbolSize: 7, lineStyle: { width: 2 }, areaStyle: { color: 'rgba(40, 167, 164, 0.05)' } },
      ],
    })

    const resizeObserver = new ResizeObserver(() => chart.resize())
    resizeObserver.observe(chartRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.dispose()
    }
  }, [])

  return (
    <section className="dashboard-card chart-card">
      <div className="card-heading"><h2>AI 使用趋势</h2><span className="range-label">近7天</span></div>
      <div className="usage-chart" ref={chartRef} />
    </section>
  )
}

export default UsageTrendChart
