// Ambient type declarations for `html-midi-player` (the package ships no .d.ts:
// its package.json `types` points to a nonexistent dist/esm/index.d.ts).
//
// Covers the two custom elements (`<midi-player>` / `<midi-visualizer>`), the
// side-effect import that registers them, and the JSX intrinsic elements.
// Signatures were verified against node_modules/html-midi-player/dist/esm/index.js.
import type { DetailedHTMLProps, HTMLAttributes } from "react";

/** A single note as exposed by Magenta's NoteSequence (subset we use). */
export interface MidiNote {
  pitch: number;
  startTime: number;
  endTime?: number;
}

/** Magenta NoteSequence (subset we use). */
export interface MidiNoteSequence {
  notes: MidiNote[];
  totalTime?: number;
}

/** `<midi-player>` custom element (PlayerElement). */
export interface MidiPlayerElement extends HTMLElement {
  src: string;
  soundFont: string | null;
  /** Current playback position in seconds (get/set; setting seeks). */
  currentTime: number;
  readonly duration: number;
  /** True while playing, false when stopped. */
  readonly playing: boolean;
  noteSequence: MidiNoteSequence | null;
  start(): void;
  stop(): void;
  reload(): void;
  addVisualizer(visualizer: MidiVisualizerElement): void;
  removeVisualizer(visualizer: MidiVisualizerElement): void;
}

/** `<midi-visualizer>` custom element (VisualizerElement). */
export interface MidiVisualizerElement extends HTMLElement {
  src: string;
  type: "piano-roll" | "waterfall" | "staff";
  noteSequence: MidiNoteSequence | null;
  reload(): void;
  redraw(activeNote?: MidiNote): void;
  clearActiveNotes(): void;
}

declare module "html-midi-player" {
  // Side-effect import only: registers <midi-player> and <midi-visualizer>.
}

type MidiPlayerProps = DetailedHTMLProps<
  HTMLAttributes<MidiPlayerElement>,
  MidiPlayerElement
> & {
  src?: string;
  "sound-font"?: string;
  visualizer?: string;
};

type MidiVisualizerProps = DetailedHTMLProps<
  HTMLAttributes<MidiVisualizerElement>,
  MidiVisualizerElement
> & {
  src?: string;
  type?: "piano-roll" | "waterfall" | "staff";
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "midi-player": MidiPlayerProps;
      "midi-visualizer": MidiVisualizerProps;
    }
  }
}
