import { useCallback, useEffect, useRef, useState } from 'react'

export type DocumentSnapshot = {
  title: string
  content: string
}

export type DocumentSaveState = 'saved' | 'unsaved' | 'saving' | 'error'

type UseDocumentAutosaveOptions<T> = {
  save: (snapshot: DocumentSnapshot) => Promise<T>
  onSaved: (result: T) => void
  delay?: number
}

function snapshotsEqual(left: DocumentSnapshot | null, right: DocumentSnapshot | null) {
  return left?.title === right?.title && left?.content === right?.content
}

export function useDocumentAutosave<T>({ save, onSaved, delay = 1600 }: UseDocumentAutosaveOptions<T>) {
  const [status, setStatus] = useState<DocumentSaveState>('saved')
  const latestRef = useRef<DocumentSnapshot | null>(null)
  const lastSavedRef = useRef<DocumentSnapshot | null>(null)
  const initializedRef = useRef(false)
  const savingRef = useRef(false)
  const queuedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const saveRef = useRef(save)
  const onSavedRef = useRef(onSaved)

  useEffect(() => {
    saveRef.current = save
    onSavedRef.current = onSaved
  }, [onSaved, save])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Recursive serialization needs a stable function so queued edits can continue after a request.
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const runSave = useCallback(async () => {
    clearTimer()
    const snapshot = latestRef.current

    if (!snapshot || snapshotsEqual(snapshot, lastSavedRef.current)) {
      if (mountedRef.current) setStatus('saved')
      return
    }

    if (savingRef.current) {
      queuedRef.current = true
      return
    }

    savingRef.current = true
    queuedRef.current = false
    if (mountedRef.current) setStatus('saving')

    try {
      const result = await saveRef.current(snapshot)
      lastSavedRef.current = snapshot
      onSavedRef.current(result)

      if (snapshotsEqual(latestRef.current, snapshot)) {
        if (mountedRef.current) setStatus('saved')
      } else {
        queuedRef.current = true
        if (mountedRef.current) setStatus('unsaved')
      }
    } catch {
      if (mountedRef.current) setStatus('error')
    } finally {
      savingRef.current = false
      const shouldSaveLatest = queuedRef.current
        && !snapshotsEqual(latestRef.current, lastSavedRef.current)
      queuedRef.current = false
      if (shouldSaveLatest) void runSave()
    }
  }, [clearTimer])

  const initialize = useCallback((snapshot: DocumentSnapshot) => {
    clearTimer()
    latestRef.current = snapshot
    lastSavedRef.current = snapshot
    initializedRef.current = true
    queuedRef.current = false
    setStatus('saved')
  }, [clearTimer])

  const markChanged = useCallback((snapshot: DocumentSnapshot) => {
    latestRef.current = snapshot
    if (!initializedRef.current || snapshotsEqual(snapshot, lastSavedRef.current)) return

    setStatus('unsaved')
    clearTimer()
    if (savingRef.current) {
      queuedRef.current = true
      return
    }
    timerRef.current = setTimeout(() => void runSave(), delay)
  }, [clearTimer, delay, runSave])

  const saveNow = useCallback((snapshot: DocumentSnapshot) => {
    latestRef.current = snapshot
    clearTimer()
    void runSave()
  }, [clearTimer, runSave])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearTimer()
      if (initializedRef.current && !snapshotsEqual(latestRef.current, lastSavedRef.current)) {
        if (savingRef.current) queuedRef.current = true
        else void runSave()
      }
    }
  }, [clearTimer, runSave])

  return { status, initialize, markChanged, saveNow }
}
