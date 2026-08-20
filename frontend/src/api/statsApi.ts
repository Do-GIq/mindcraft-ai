import { authenticatedFetch } from './authenticatedFetch'

export type StatsRange = '7d' | '30d' | '90d'

export type StatsSummary = {
  projectCount: number
  documentCount: number
  characterCount: number
}

export type OverviewStats = {
  summary: StatsSummary & { aiGenerationCount30d: number }
  aiUsageTrend: Array<{
    date: string
    count: number
    successCount: number
    failedCount: number
    generatedCharacterCount: number
  }>
  recentProjects: Array<{
    id: number
    title: string
    updatedAt: string
    documentCount: number
    characterCount: number
  }>
  recentDocuments: Array<{
    id: number
    title: string
    projectId: number
    projectTitle: string
    updatedAt: string
    characterCount: number
  }>
}

export type DashboardStats = {
  summary: StatsSummary & { versionCount: number }
  aiSummary: {
    generationCount: number
    successCount: number
    failedCount: number
    successRate: number
    averageDurationMs: number
    averageFirstTokenMs: number
    generatedCharacterCount: number
  }
  aiUsageTrend: Array<{
    date: string
    count: number
    successCount: number
    failedCount: number
    generatedCharacterCount: number
  }>
  activityTrend: Array<{ date: string; count: number }>
  projectBreakdown: Array<{
    projectId: number
    title: string
    documentCount: number
    characterCount: number
  }>
  topDocuments: Array<{
    id: number
    title: string
    projectId: number
    projectTitle: string
    characterCount: number
    updatedAt: string
  }>
}

export const overviewStatsQueryKey = (userId: number | undefined) =>
  ['stats', 'overview', userId] as const

export const dashboardStatsQueryKey = (userId: number | undefined, range: StatsRange) =>
  ['stats', 'dashboard', userId, range] as const

export async function fetchOverviewStats(): Promise<OverviewStats> {
  const response = await authenticatedFetch('/api/stats/overview')
  if (!response.ok) throw new Error('概览数据加载失败')
  return response.json() as Promise<OverviewStats>
}

export async function fetchDashboardStats(range: StatsRange): Promise<DashboardStats> {
  const response = await authenticatedFetch(`/api/stats/dashboard?range=${range}`)
  if (!response.ok) throw new Error('统计数据加载失败')
  return response.json() as Promise<DashboardStats>
}
