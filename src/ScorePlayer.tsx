import { useMemo, useRef, useState } from 'react'
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
  const { isReady, pageCount, renderToMIDI, getElementsAtTime, getTimeForElement } =
    useVerovio()
  const [page, setPage] = useState(1)
  const playerRef = useRef<VerovioMidiPlayerHandle>(null)
  const sheetRef = useRef<VerovioSheetViewHandle>(null)

  // Playback position (ms) → highlight the sounding notes (imperative, no
  // re-render) and follow the page.
  const handleTimeUpdate = (ms: number) => {
    const at = getElementsAtTime(ms)
    if (!at) return
    sheetRef.current?.setHighlight(at.notes)
    if (at.page > 0 && at.page !== page) setPage(at.page)
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
