import { useState } from 'react'
import { VerovioProvider } from './verovio/VerovioProvider'
import { ScorePicker, type ScoreSource } from './ScorePicker'
import { ScorePlayer } from './ScorePlayer'

const OPTIONS = { scale: 40, breaks: 'auto' } as const

function App() {
  const [source, setSource] = useState<ScoreSource | null>(null)
  const src = source && 'src' in source ? source.src : undefined
  const data = source && 'data' in source ? source.data : undefined

  // The provider stays mounted across the picker → player transition so the WASM
  // module preloads while choosing, and switching scores reuses the toolkit.
  return (
    <VerovioProvider src={src} data={data} options={OPTIONS}>
      {source ? (
        <ScorePlayer onBack={() => setSource(null)} />
      ) : (
        <ScorePicker onSelect={setSource} />
      )}
    </VerovioProvider>
  )
}

export default App
