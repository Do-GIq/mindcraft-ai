import { prisma } from '../../db/prisma.js'

export type StatsRange = '7d' | '30d' | '90d'

const RANGE_DAYS: Record<StatsRange, number> = { '7d': 7, '30d': 30, '90d': 90 }
const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
const namedEntities: Record<string, string> = {
  amp: '&', apos: "'", gt: '>', lt: '<', nbsp: ' ', quot: '"',
}

function decodeHtmlEntities(value: string) {
  return value.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);/gi, (entity, key: string) => {
    if (key.startsWith('#')) {
      const isHex = key[1]?.toLowerCase() === 'x'
      const codePoint = Number.parseInt(key.slice(isHex ? 2 : 1), isHex ? 16 : 10)
      try {
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity
      } catch {
        return entity
      }
    }
    return namedEntities[key.toLowerCase()] ?? entity
  })
}

export function countVisibleCharacters(html: string) {
  if (!html) return 0
  const plainText = decodeHtmlEntities(
    html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]*>/g, ''),
  )
  return Array.from(graphemeSegmenter.segment(plainText)).length
}

async function getUserStatsBase(userId: number) {
  return prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      updatedAt: true,
      documents: {
        orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, content: true, projectId: true, updatedAt: true },
      },
    },
  })
}

function calculateSummary(projects: Awaited<ReturnType<typeof getUserStatsBase>>) {
  const documents = projects.flatMap((project) => project.documents)
  return {
    projectCount: projects.length,
    documentCount: documents.length,
    characterCount: documents.reduce(
      (total, document) => total + countVisibleCharacters(document.content),
      0,
    ),
  }
}

export async function getOverviewStats(userId: number) {
  const projects = await getUserStatsBase(userId)
  const summary = calculateSummary(projects)
  const projectTitles = new Map(projects.map((project) => [project.id, project.title]))
  const documents = projects
    .flatMap((project) => project.documents)
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())

  return {
    summary,
    recentProjects: projects.slice(0, 5).map((project) => ({
      id: project.id,
      title: project.title,
      updatedAt: project.updatedAt,
      documentCount: project.documents.length,
    })),
    recentDocuments: documents.slice(0, 5).map((document) => ({
      id: document.id,
      title: document.title,
      projectId: document.projectId,
      projectTitle: projectTitles.get(document.projectId) ?? '',
      updatedAt: document.updatedAt,
      characterCount: countVisibleCharacters(document.content),
    })),
  }
}

function getUtcRange(days: number) {
  const now = new Date()
  const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return {
    start: new Date(todayStart - (days - 1) * 86_400_000),
    end: new Date(todayStart + 86_400_000),
  }
}

export async function getDashboardStats(userId: number, range: StatsRange) {
  const days = RANGE_DAYS[range]
  const { start, end } = getUtcRange(days)
  const [projects, versionCount, versionActivity, aiGenerations] = await Promise.all([
    getUserStatsBase(userId),
    prisma.documentVersion.count({ where: { document: { project: { userId } } } }),
    prisma.documentVersion.findMany({
      where: { document: { project: { userId } }, createdAt: { gte: start, lt: end } },
      select: { createdAt: true },
    }),
    prisma.aiGeneration.findMany({
      where: { userId, createdAt: { gte: start, lt: end } },
      select: {
        status: true,
        outputChars: true,
        firstTokenMs: true,
        durationMs: true,
        createdAt: true,
      },
    }),
  ])
  const summary = calculateSummary(projects)
  const activityByDate = new Map<string, number>()
  for (const version of versionActivity) {
    const date = version.createdAt.toISOString().slice(0, 10)
    activityByDate.set(date, (activityByDate.get(date) ?? 0) + 1)
  }

  const activityTrend = Array.from({ length: days }, (_, index) => {
    const date = new Date(start.getTime() + index * 86_400_000).toISOString().slice(0, 10)
    return { date, count: activityByDate.get(date) ?? 0 }
  })
  const successCount = aiGenerations.filter(({ status }) => status === 'SUCCESS').length
  const failedCount = aiGenerations.filter(({ status }) => status === 'FAILED').length
  const firstTokenValues = aiGenerations.flatMap(({ firstTokenMs }) =>
    firstTokenMs === null ? [] : [firstTokenMs],
  )
  const average = (values: number[]) => values.length === 0
    ? 0
    : Math.round(values.reduce((total, value) => total + value, 0) / values.length)
  const aiActivityByDate = new Map<string, { count: number; successCount: number; failedCount: number }>()
  for (const generation of aiGenerations) {
    const date = generation.createdAt.toISOString().slice(0, 10)
    const current = aiActivityByDate.get(date) ?? { count: 0, successCount: 0, failedCount: 0 }
    current.count += 1
    if (generation.status === 'SUCCESS') current.successCount += 1
    if (generation.status === 'FAILED') current.failedCount += 1
    aiActivityByDate.set(date, current)
  }
  const aiUsageTrend = Array.from({ length: days }, (_, index) => {
    const date = new Date(start.getTime() + index * 86_400_000).toISOString().slice(0, 10)
    return { date, ...(aiActivityByDate.get(date) ?? { count: 0, successCount: 0, failedCount: 0 }) }
  })
  const projectBreakdown = projects
    .map((project) => ({
      projectId: project.id,
      title: project.title,
      documentCount: project.documents.length,
      characterCount: project.documents.reduce(
        (total, document) => total + countVisibleCharacters(document.content),
        0,
      ),
    }))
    .sort((left, right) => right.characterCount - left.characterCount)
    .slice(0, 8)
  const projectTitles = new Map(projects.map((project) => [project.id, project.title]))
  const topDocuments = projects
    .flatMap((project) => project.documents)
    .map((document) => ({
      id: document.id,
      title: document.title,
      projectId: document.projectId,
      projectTitle: projectTitles.get(document.projectId) ?? '',
      characterCount: countVisibleCharacters(document.content),
      updatedAt: document.updatedAt,
    }))
    .sort((left, right) => right.characterCount - left.characterCount)
    .slice(0, 8)

  return {
    summary: { ...summary, versionCount },
    aiSummary: {
      generationCount: aiGenerations.length,
      successCount,
      failedCount,
      successRate: aiGenerations.length === 0
        ? 0
        : Number(((successCount / aiGenerations.length) * 100).toFixed(1)),
      averageDurationMs: average(aiGenerations.map(({ durationMs }) => durationMs)),
      averageFirstTokenMs: average(firstTokenValues),
      generatedCharacterCount: aiGenerations.reduce(
        (total, generation) => total + generation.outputChars,
        0,
      ),
    },
    aiUsageTrend,
    activityTrend,
    projectBreakdown,
    topDocuments,
  }
}
