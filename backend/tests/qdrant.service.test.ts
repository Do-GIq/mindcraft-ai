import { afterEach, describe, expect, it, vi } from 'vitest'

describe('Qdrant retrieval isolation', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('sends an exact project filter and preserves provider scores', async () => {
    vi.stubEnv('QDRANT_URL', 'https://qdrant.test')
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        result: { config: { params: { vectors: { size: 1024, distance: 'Cosine' } } } },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        result: { points: [{ score: 0.91, payload: { projectId: 3, chunkId: 19 } }] },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    const { queryKnowledgePoints } = await import('../src/modules/knowledge/qdrant.service.js')
    const points = await queryKnowledgePoints(3, [0.1, 0.2], 5)

    const queryCall = fetchMock.mock.calls[1]
    const options = queryCall?.[1] as RequestInit | undefined
    expect(JSON.parse(String(options?.body))).toEqual({
      query: [0.1, 0.2],
      filter: { must: [{ key: 'projectId', match: { value: 3 } }] },
      limit: 5,
      with_payload: true,
    })
    expect(points).toEqual([{ score: 0.91, payload: { projectId: 3, chunkId: 19 } }])
  })
})
