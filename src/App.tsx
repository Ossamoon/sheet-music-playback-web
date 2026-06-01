import { useMemo, useRef, useState } from 'react'
import {
  VerovioSheetView,
  type VerovioSheetViewHandle,
} from './verovio/VerovioSheetView'
import {
  VerovioMidiPlayer,
  type VerovioMidiPlayerHandle,
} from './verovio/VerovioMidiPlayer'
import { VerovioProvider, useVerovio } from './verovio/VerovioProvider'
import scoreUrl from './assets/bahha-6tsuno-xiaopureryudo-bwv-933-938.mxl?url'

const OPTIONS = { scale: 40, breaks: 'auto' } as const

function App() {
  return (
    <VerovioProvider src={scoreUrl} options={OPTIONS}>
      <ScorePlayer />
    </VerovioProvider>
  )
}

/** Consumes the single shared toolkit: sheet display, playback and seeking all
 *  read the same xml:id space, so highlighting and note-clicks line up. */
function ScorePlayer() {
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
                ← 前のページ
              </button>
            )}
            <span className="page-nav-label">
              ページ {page} / {pageCount}
            </span>
            {page < pageCount && (
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                次のページ →
              </button>
            )}
          </nav>
        )}
      </section>

      <section className="play-pane">
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

export default App
