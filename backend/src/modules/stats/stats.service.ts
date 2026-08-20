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

type DailyAiRow = {
  date: string | Date
  count: bigint | number
  successCount: bigint | number
  failedCount: bigint | number
  generatedCharacterCount: bigint | number | null
}

type DailyVersionRow = { date: string | Date; count: bigint | number }

function dateKey(value: string | Date) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value)
}

function getUtcRange(days: number) {
  const now = new Date()
  const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return {
    start: new Date(todayStart - (days - 1) * 86_400_000),
    end: new Date(todayStart + 86_400_000),
  }
}

async function getAiSummary(userId: number, start: Date, end: Date) {
  const where = { userId, createdAt: { gte: start, lt: end } }
  const [aggregate, statusGroups] = await Promise.all([
    prisma.aiGeneration.aggregate({
      where,
      _count: { _all: true },
      _sum: { outputChars: true },
      _avg: { durationMs: true, firstTokenMs: true },
    }),
    prisma.aiGeneration.groupBy({ by: ['status'], where, _count: { _all: true } }),
  ])
  const statusCounts = new Map(statusGroups.map((group) => [group.status, group._count._all]))
  const generationCount = aggregate._count._all
  const successCount = statusCounts.get('SUCCESS') ?? 0
  const failedCount = statusCounts.get('FAILED') ?? 0

  return {
    generationCount,
    successCount,
    failedCount,
    successRate: generationCount === 0
      ? 0
      : Number(((successCount / generationCount) * 100).toFixed(1)),
    averageDurationMs: Math.round(aggregate._avg.durationMs ?? 0),
    averageFirstTokenMs: Math.round(aggregate._avg.firstTokenMs ?? 0),
    generatedCharacterCount: aggregate._sum.outputChars ?? 0,
  }
}

async function getAiUsageTrend(userId: number, start: Date, end: Date, days: number) {
  const rows = await prisma.$queryRaw<DailyAiRow[]>`
    SELECT
      DATE_FORMAT(createdAt, '%Y-%m-%d') AS date,
      COUNT(*) AS count,
      SUM(status = 'SUCCESS') AS successCount,
      SUM(status = 'FAILED') AS failedCount,
      COALESCE(SUM(outputChars), 0) AS generatedCharacterCount
    FROM AiGeneration
    WHERE userId = ${userId} AND createdAt >= ${start} AND createdAt < ${end}
    GROUP BY DATE_FORMAT(createdAt, '%Y-%m-%d')
    ORDER BY date ASC
  `
  const values = new Map(rows.map((row) => [dateKey(row.date), {
    count: Number(row.count),
    successCount: Number(row.successCount),
    failedCount: Number(row.failedCount),
    generatedCharacterCount: Number(row.generatedCharacterCount ?? 0),
  }]))

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start.getTime() + index * 86_400_000).toISOString().slice(0, 10)
    return {
      date,
      ...(values.get(date) ?? {
        count: 0,
        successCount: 0,
        failedCount: 0,
        generatedCharacterCount: 0,
      }),
    }
  })
}

async function getVersionActivityTrend(userId: number, start: Date, end: Date, days: number) {
  const rows = await prisma.$queryRaw<DailyVersionRow[]>`
    SELECT DATE_FORMAT(v.createdAt, '%Y-%m-%d') AS date, COUNT(*) AS count
    FROM DocumentVersion v
    INNER JOIN Document d ON d.id = v.documentId
    INNER JOIN Project p ON p.id = d.projectId
    WHERE p.userId = ${userId} AND v.createdAt >= ${start} AND v.createdAt < ${end}
    GROUP BY DATE_FORMAT(v.createdAt, '%Y-%m-%d')
    ORDER BY date ASC
  `
  const values = new Map(rows.map((row) => [dateKey(row.date), Number(row.count)]))
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start.getTime() + index * 86_400_000).toISOString().slice(0, 10)
    return { date, count: values.get(date) ?? 0 }
  })
}

export async function getOverviewStats(userId: number) {
  const thirtyDayRange = getUtcRange(30)
  const sevenDayRange = getUtcRange(7)
  const [projects, aiSummary, aiUsageTrend] = await Promise.all([
    getUserStatsBase(userId),
    getAiSummary(userId, thirtyDayRange.start, thirtyDayRange.end),
    getAiUsageTrend(userId, sevenDayRange.start, sevenDayRange.end, 7),
  ])
  const summary = calculateSummary(projects)
  const projectTitles = new Map(projects.map((project) => [project.id, project.title]))
  const documents = projects
    .flatMap((project) => project.documents)
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())

  return {
    summary: { ...summary, aiGenerationCount30d: aiSummary.generationCount },
    aiUsageTrend,
    recentProjects: projects.slice(0, 5).map((project) => ({
      id: project.id,
      title: project.title,
      updatedAt: project.updatedAt,
      documentCount: project.documents.length,
      characterCount: project.documents.reduce(
        (total, document) => total + countVisibleCharacters(document.content),
        0,
      ),
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

export async function getDashboardStats(userId: number, range: StatsRange) {
  const days = RANGE_DAYS[range]
  const { start, end } = getUtcRange(days)
  const [projects, versionCount, activityTrend, aiSummary, aiUsageTrend] = await Promise.all([
    getUserStatsBase(userId),
    prisma.documentVersion.count({ where: { document: { project: { userId } } } }),
    getVersionActivityTrend(userId, start, end, days),
    getAiSummary(userId, start, end),
    getAiUsageTrend(userId, start, end, days),
  ])
  const summary = calculateSummary(projects)
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
    aiSummary,
    aiUsageTrend,
    activityTrend,
    projectBreakdown,
    topDocuments,
  }
}
