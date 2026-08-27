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
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        result: { points: [{ score: 0.91, payload: { projectId: 3, chunkId: 19 } }] },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    const { queryKnowledgePoints } = await import('../src/modules/knowledge/qdrant.service.js')
    const vector = Array.from({ length: 1_024 }, (_, index) => index / 1_024)
    const points = await queryKnowledgePoints(3, vector, 5)

    const indexCall = fetchMock.mock.calls[1]
    expect(indexCall?.[0]).toBe('https://qdrant.test/collections/mindcraft_knowledge/index?wait=true')
    expect(JSON.parse(String((indexCall?.[1] as RequestInit | undefined)?.body))).toEqual({
      field_name: 'projectId',
      field_schema: 'integer',
    })

    const queryCall = fetchMock.mock.calls[2]
    const options = queryCall?.[1] as RequestInit | undefined
    expect(JSON.parse(String(options?.body))).toEqual({
      query: vector,
      filter: { must: [{ key: 'projectId', match: { value: 3 } }] },
      limit: 5,
      with_payload: true,
    })
    expect(points).toEqual([{ score: 0.91, payload: { projectId: 3, chunkId: 19 } }])
  })
})
