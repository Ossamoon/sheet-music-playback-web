import { useRef, useState, type DragEvent } from 'react'
import bachUrl from './assets/bahha-6tsuno-xiaopureryudo-bwv-933-938.mxl?url'
import brucknerUrl from './assets/burukkuna-aekuare-di1fan-wab-114.mxl?url'

/** A chosen score: either a URL to fetch, or already-read data. */
export type ScoreSource = { src: string } | { data: string | ArrayBuffer }

export interface ScorePickerProps {
  onSelect: (source: ScoreSource) => void
}

const SAMPLES: { title: string; url: string }[] = [
  { title: 'Bach - 6 Little Preludes', url: bachUrl },
  { title: 'Bruckner - Aequale No.1', url: brucknerUrl },
]

/** Read a dropped/selected file: .mxl/.zip as binary (compressed MusicXML),
 *  anything else (.musicxml/.xml/.mei) as text. */
async function readFile(file: File): Promise<ScoreSource> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.mxl') || name.endsWith('.zip')) {
    return { data: await file.arrayBuffer() }
  }
  return { data: await file.text() }
}

/** First screen: drop / pick a file on the left, choose a bundled sample on the right. */
export function ScorePicker({ onSelect }: ScorePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const pickFile = async (file: File | undefined) => {
    if (file) onSelect(await readFile(file))
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragOver(false)
    pickFile(event.dataTransfer.files[0])
  }

  return (
    <main className="picker">
      <a
        className="github-link"
        href="https://github.com/Ossamoon/sheet-music-playback-web"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View source on GitHub"
      >
        <img src="/github.png" alt="" width={28} height={28} />
      </a>
      <section
        className={dragOver ? 'drop-zone drag-over' : 'drop-zone'}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <p className="drop-hint">
          Drop a MusicXML / MEI file
          <br />
          here
        </p>
        <button type="button" onClick={() => inputRef.current?.click()}>
          Choose File
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".mxl,.xml,.musicxml,.mei"
          hidden
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
      </section>

      <section className="samples">
        <h2>Samples</h2>
        <ul>
          {SAMPLES.map((sample) => (
            <li key={sample.url}>
              <button type="button" onClick={() => onSelect({ src: sample.url })}>
                {sample.title}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
