export const stats = [
  { title: '项目总数', value: '12', trend: '+12%', trendLabel: '较上月', icon: 'layers' },
  { title: 'AI 生成次数', value: '326', trend: '+8%', trendLabel: '较上月', icon: 'sparkles' },
  { title: '本月生成字数', value: '86,240', trend: '+15%', trendLabel: '较上月', icon: 'file' },
  { title: '平均响应时间', value: '1.8s', trend: '-10%', trendLabel: '较上月', icon: 'clock' },
] as const

export const recentProjects = [
  { name: '杭州周末旅行攻略', category: '旅游攻略', updatedAt: '今天 10:30', progress: 75, color: 'blue' },
  { name: '毕业季短视频脚本', category: '脚本创作', updatedAt: '昨天 16:45', progress: 60, color: 'green' },
  { name: '小红书护肤文案', category: '社媒文案', updatedAt: '昨天 11:20', progress: 90, color: 'purple' },
  { name: '品牌营销方案', category: '营销方案', updatedAt: '5月20日 14:10', progress: 40, color: 'orange' },
] as const

export const usageTrend = {
  dates: ['5/16', '5/17', '5/18', '5/19', '5/20', '5/21', '5/22'],
  generations: [42, 61, 55, 66, 72, 60, 76],
  words: [18, 32, 27, 36, 45, 35, 62],
}

export const quickActions = [
  { title: '生成标题', description: '吸引眼球的标题', icon: 'type', color: 'blue' },
  { title: '生成大纲', description: '搭建内容结构', icon: 'list', color: 'green' },
  { title: '优化正文', description: '润色提升质量', icon: 'edit', color: 'purple' },
  { title: '提取标签', description: '智能提炼关键词', icon: 'tag', color: 'orange' },
] as const

export const modelUsage = [
  { name: 'GPT', value: 42 },
  { name: 'Qwen', value: 35 },
  { name: 'DeepSeek', value: 23 },
]

export const recentActivities = [
  { text: '已创建项目“杭州周末旅行攻略”', time: '今天 10:30', icon: 'file', color: 'green' },
  { text: 'AI 完成改写“品牌故事文案”', time: '昨天 16:45', icon: 'sparkles', color: 'purple' },
  { text: '自动保存成功', time: '昨天 11:20', icon: 'cloud', color: 'orange' },
] as const
