import { useEffect, useMemo, useRef, useState } from 'react'
import type { TimeMapEntry } from 'verovio'
import {
  VerovioSheetView,
  type VerovioSheetViewHandle,
} from './verovio/VerovioSheetView'
import {
  VerovioMidiPlayer,
  type VerovioMidiPlayerHandle,
} from './verovio/VerovioMidiPlayer'
import { useVerovio } from './verovio/VerovioProvider'

export interface ScorePlayerProps {
  /** Return to the score picker. */
  onBack: () => void
}

/** Consumes the single shared toolkit: sheet display, playback and seeking all
 *  read the same xml:id space, so highlighting and note-clicks line up. */
export function ScorePlayer({ onBack }: ScorePlayerProps) {
  const {
    isReady,
    pageCount,
    renderToMIDI,
    getTimemap,
    getTimeForElement,
    getPageWithElement,
  } = useVerovio()
  const [page, setPage] = useState(1)
  const playerRef = useRef<VerovioMidiPlayerHandle>(null)
  const sheetRef = useRef<VerovioSheetViewHandle>(null)

  // Pre-computed note on/off schedule, advanced by a pointer as time flows.
  const timemapRef = useRef<TimeMapEntry[]>([])
  const pointerRef = useRef(0)
  const activeRef = useRef<Set<string>>(new Set())
  const lastMsRef = useRef(-1)

  // Pre-compute the timemap once the score is ready (and on score change).
  useEffect(() => {
    timemapRef.current = isReady ? (getTimemap() ?? []) : []
    pointerRef.current = 0
    activeRef.current = new Set()
    lastMsRef.current = -1
  }, [isReady, getTimemap])

  // Playback position (ms) → advance the on/off pointer and update the highlight
  // imperatively (no re-render). Driven by the player's smooth clock.
  const handleTimeUpdate = (ms: number) => {
    const tm = timemapRef.current
    if (tm.length === 0) return

    // Seek backwards / restart: rebuild the active set from the start.
    if (ms < lastMsRef.current) {
      pointerRef.current = 0
      activeRef.current.clear()
    }
    lastMsRef.current = ms

    const active = activeRef.current
    let changed = false
    let newlyOn: string | undefined
    while (pointerRef.current < tm.length && tm[pointerRef.current].tstamp <= ms) {
      const entry = tm[pointerRef.current]
      entry.off?.forEach((id) => {
        if (active.delete(id)) changed = true
      })
      entry.on?.forEach((id) => {
        active.add(id)
        changed = true
        newlyOn = id
      })
      pointerRef.current++
    }

    if (changed) sheetRef.current?.setHighlight([...active])

    // Follow the page only when a note newly sounds (cheap, transition-only).
    if (newlyOn) {
      const pg = getPageWithElement(newlyOn)
      if (pg != null && pg > 0 && pg !== page) setPage(pg)
    }
  }

  // Generate the MIDI once the score is loaded (renderToMIDI's identity changes then).
  const midiBase64 = useMemo(
    () => (isReady ? (renderToMIDI() ?? undefined) : undefined),
    [isReady, renderToMIDI],
  )

  return (
    <main className="player-demo">
      <section className="sheet-pane">
        <VerovioSheetView
          ref={sheetRef}
          page={page}
          onNoteClick={(id) => {
            const ms = getTimeForElement(id)
            if (ms != null && ms >= 0) playerRef.current?.seek(ms / 1000)
          }}
        />

        {pageCount > 0 && (
          <nav className="page-nav">
            {page > 1 && (
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Prev
              </button>
            )}
            <span className="page-nav-label">
              Page {page} / {pageCount}
            </span>
            {page < pageCount && (
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                Next →
              </button>
            )}
          </nav>
        )}
      </section>

      <section className="play-pane">
        <button type="button" className="back-button" onClick={onBack}>
          ← Back
        </button>
        <h1>Sheet Music Playback</h1>

        <VerovioMidiPlayer
          ref={playerRef}
          midiBase64={midiBase64}
          showPianoRoll
          onTimeUpdate={handleTimeUpdate}
        />
      </section>
    </main>
  )
}
