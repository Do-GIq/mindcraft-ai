import type { ProfilerOnRenderCallback } from 'react'

type StreamBenchmarkSnapshot = {
  receivedChunks: number
  stateUpdates: number
  resultRenders: number
  commits: number
  outputChars: number
  streamingUiDurationMs: number | null
  totalCommitDurationMs: number
  documentPageRenders: number
  documentAiPanelRenders: number
}

type StreamBenchmarkState = StreamBenchmarkSnapshot & {
  firstDeltaAt: number | null
}

declare global {
  interface Window {
    __mindcraftStreamBenchmark?: {
      getSnapshot: () => StreamBenchmarkSnapshot
    }
  }
}

const enabled = import.meta.env.DEV
  && new URLSearchParams(window.location.search).get('streamBenchmark') === '1'

let state: StreamBenchmarkState = createState()

function createState(): StreamBenchmarkState {
  return {
    receivedChunks: 0,
    stateUpdates: 0,
    resultRenders: 0,
    commits: 0,
    outputChars: 0,
    streamingUiDurationMs: null,
    totalCommitDurationMs: 0,
    documentPageRenders: 0,
    documentAiPanelRenders: 0,
    firstDeltaAt: null,
  }
}

function getSnapshot(): StreamBenchmarkSnapshot {
  return {
    receivedChunks: state.receivedChunks,
    stateUpdates: state.stateUpdates,
    resultRenders: state.resultRenders,
    commits: state.commits,
    outputChars: state.outputChars,
    streamingUiDurationMs: state.streamingUiDurationMs,
    totalCommitDurationMs: state.totalCommitDurationMs,
    documentPageRenders: state.documentPageRenders,
    documentAiPanelRenders: state.documentAiPanelRenders,
  }
}

if (enabled) {
  window.__mindcraftStreamBenchmark = { getSnapshot }
}

export function resetStreamBenchmark() {
  if (!enabled) return
  state = createState()
}

export function recordStreamDelta(text: string) {
  if (!enabled) return
  state.receivedChunks += 1
  state.outputChars += Array.from(text).length
  state.firstDeltaAt ??= performance.now()
}

export function recordStreamStateUpdate() {
  if (enabled) state.stateUpdates += 1
}

export function recordResultRender() {
  if (enabled) state.resultRenders += 1
}

export function recordDocumentPageRender() {
  if (enabled) state.documentPageRenders += 1
}

export function recordDocumentAiPanelRender() {
  if (enabled) state.documentAiPanelRenders += 1
}

export function recordFinalUiCommit() {
  if (!enabled || state.firstDeltaAt === null) return
  state.streamingUiDurationMs = performance.now() - state.firstDeltaAt
}

export const recordResultCommit: ProfilerOnRenderCallback = (
  _id,
  _phase,
  actualDuration,
) => {
  if (!enabled) return
  state.commits += 1
  state.totalCommitDurationMs += actualDuration
}
