# Sheet Music Playback Web

> Built at the **ADC Japan 2026 Hackathon**.

A web app for viewing sheet music and playing it back with synchronized note highlighting.

**[▶ Live demo](https://ossamoon.github.io/sheet-music-playback-web)**

Load a MusicXML or MEI score — drop in your own file (`.mxl`, `.musicxml`, `.xml`, `.mei`) or pick one of the bundled samples — and the app renders it as engraved sheet music. Press play and the corresponding notes light up on the page in time with the MIDI playback, with a piano-roll view alongside. You can also click a note to seek to that position.

## How it works

The app is built around a single shared [Verovio](https://www.verovio.org/) toolkit (running as WebAssembly), so the rendered notation, the MIDI playback, and seeking all share the same element IDs. That common ID space is what keeps note highlighting and note-clicks aligned with the audio. Playback and the piano roll are powered by [html-midi-player](https://github.com/cifkao/html-midi-player).

- **Sheet rendering** — Verovio renders MusicXML/MEI to SVG notation.
- **Playback** — Verovio converts the score to MIDI, played back through html-midi-player.
- **Synchronized highlighting** — a pre-computed timemap drives note highlighting on the page as playback advances.

## Tech stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/)
- [Verovio](https://www.verovio.org/) — music notation engraving
- [html-midi-player](https://github.com/cifkao/html-midi-player) — MIDI playback and piano roll

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check and build for production
npm run preview  # preview the production build
```
