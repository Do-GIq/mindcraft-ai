import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { modelUsage } from '../../data/dashboard'

function ModelUsageChart() {
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartRef.current) return

    const chart = echarts.init(chartRef.current)
    chart.setOption({
      color: ['#547fe2', '#45b3af', '#9a7de3'],
      tooltip: { trigger: 'item', formatter: '{b}: {c}%' },
      legend: { orient: 'vertical', right: '7%', top: 'center', itemWidth: 10, itemHeight: 10, itemGap: 18, formatter: (name: string) => `${name}     ${modelUsage.find((item) => item.name === name)?.value}%`, textStyle: { color: '#344054', fontSize: 13 } },
      series: [{ type: 'pie', radius: ['52%', '72%'], center: ['32%', '52%'], avoidLabelOverlap: true, label: { show: false }, itemStyle: { borderColor: '#fff', borderWidth: 2 }, data: modelUsage }],
    })

    const resizeObserver = new ResizeObserver(() => chart.resize())
    resizeObserver.observe(chartRef.current)
    return () => {
      resizeObserver.disconnect()
      chart.dispose()
    }
  }, [])

  return (
    <section className="dashboard-card bottom-card">
      <div className="card-heading"><h2>模型使用分布</h2></div>
      <div className="model-chart" ref={chartRef} />
    </section>
  )
}

export default ModelUsageChart
