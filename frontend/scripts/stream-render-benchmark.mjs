import { performance } from 'node:perf_hooks'

const OUTPUT_CHARS = 12_000
const CHUNK_COUNT = 160
const CHUNK_INTERVAL_MS = 2
const FRAME_INTERVAL_MS = 16
const seed = '# 标题 MindCraft AI\n\n**重点内容** 与 English 123。\n\n- 项目一\n- 项目二\n\n```ts\nconst ready = true\n```\n'
const payload = Array.from(seed.repeat(Math.ceil(OUTPUT_CHARS / Array.from(seed).length)))
  .slice(0, OUTPUT_CHARS)
  .join('')

function splitIntoChunks(value, count) {
  const characters = Array.from(value)
  const chunks = []
  for (let index = 0; index < count; index += 1) {
    const start = Math.floor(index * characters.length / count)
    const end = Math.floor((index + 1) * characters.length / count)
    chunks.push(characters.slice(start, end).join(''))
  }
  return chunks
}

function delay(durationMs) {
  return new Promise((resolve) => setTimeout(resolve, durationMs))
}

async function run(mode, chunks) {
  let output = ''
  let pending = ''
  let flushTimer = null
  let stateUpdates = 0
  let firstChunkAt = null

  const flush = () => {
    if (!pending) return
    output += pending
    pending = ''
    stateUpdates += 1
  }

  for (const chunk of chunks) {
    await delay(CHUNK_INTERVAL_MS)
    firstChunkAt ??= performance.now()
    if (mode === 'direct') {
      output += chunk
      stateUpdates += 1
    } else {
      pending += chunk
      if (flushTimer === null) {
        flushTimer = setTimeout(() => {
          flushTimer = null
          flush()
        }, FRAME_INTERVAL_MS)
      }
    }
  }

  if (flushTimer !== null) clearTimeout(flushTimer)
  flush()

  return {
    receivedChunks: chunks.length,
    stateUpdates,
    outputChars: Array.from(output).length,
    streamProcessingDurationMs: Number((performance.now() - firstChunkAt).toFixed(2)),
    outputMatches: output === payload,
  }
}

const chunks = splitIntoChunks(payload, CHUNK_COUNT)
const before = await run('direct', chunks)
const after = await run('buffered', chunks)

console.log(JSON.stringify({
  config: { outputChars: OUTPUT_CHARS, chunkCount: CHUNK_COUNT, chunkIntervalMs: CHUNK_INTERVAL_MS, frameIntervalMs: FRAME_INTERVAL_MS },
  before,
  after,
  stateUpdateReductionPercent: Number(((before.stateUpdates - after.stateUpdates) / before.stateUpdates * 100).toFixed(2)),
}, null, 2))
