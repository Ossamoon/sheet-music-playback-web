import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type MouseEvent,
} from "react";
import "html-midi-player";
import type {
  MidiPlayerElement,
  MidiVisualizerElement,
} from "./html-midi-player";

export interface VerovioMidiPlayerHandle {
  /** Seek to a position in seconds (also updates the sheet via onTimeUpdate). */
  seek: (seconds: number) => void;
  play: () => void;
  stop: () => void;
}

export interface VerovioMidiPlayerProps {
  /** Base64 MIDI from Verovio's `renderToMIDI()`. */
  midiBase64?: string;
  /** SoundFont URL. Omit to use html-midi-player's default. */
  soundFont?: string;
  /** Show the piano-roll visualizer (default true). */
  showPianoRoll?: boolean;
  /** Playback position in milliseconds; drives sheet highlighting. */
  onTimeUpdate?: (ms: number) => void;
  onStart?: () => void;
  onStop?: () => void;
}

/**
 * Wraps html-midi-player's `<midi-player>` (sound + transport) and a linked
 * `<midi-visualizer type="piano-roll">`. The piano roll follows playback natively
 * (via the player↔visualizer link); the sheet is driven through `onTimeUpdate`,
 * sampled on a requestAnimationFrame loop. Seeking is unified on
 * `player.currentTime` from three sources: the built-in seek bar, the imperative
 * `seek()` handle (used by sheet note-clicks), and clicks on piano-roll notes.
 */
export const VerovioMidiPlayer = forwardRef<
  VerovioMidiPlayerHandle,
  VerovioMidiPlayerProps
>(function VerovioMidiPlayer(
  { midiBase64, soundFont, showPianoRoll = true, onTimeUpdate, onStart, onStop },
  ref,
) {
  const playerRef = useRef<MidiPlayerElement>(null);
  const visualizerRef = useRef<MidiVisualizerElement>(null);
  const rafRef = useRef<number | null>(null);

  // Keep the latest callbacks in refs so listeners need not be re-bound.
  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;
  const onStartRef = useRef(onStart);
  onStartRef.current = onStart;
  const onStopRef = useRef(onStop);
  onStopRef.current = onStop;

  const seekTo = useCallback((seconds: number) => {
    const player = playerRef.current;
    if (!player) return;
    // Repositioning during playback needs a stop→start cycle: setting
    // `currentTime` alone only moves the seek bar and is overwritten by the
    // next note event. start() then resumes from the new offset. When already
    // stopped, stop() is a no-op so this also covers click-to-play.
    player.stop();
    player.currentTime = seconds;
    onTimeUpdateRef.current?.(seconds * 1000);
    player.start();
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      seek: seekTo,
      play: () => playerRef.current?.start(),
      stop: () => playerRef.current?.stop(),
    }),
    [seekTo],
  );

  // Feed the Verovio MIDI to both elements as a data URI.
  useEffect(() => {
    const uri = midiBase64 ? `data:audio/midi;base64,${midiBase64}` : "";
    if (playerRef.current) playerRef.current.src = uri;
    if (visualizerRef.current) visualizerRef.current.src = uri;
  }, [midiBase64]);

  useEffect(() => {
    if (playerRef.current && soundFont !== undefined) {
      playerRef.current.soundFont = soundFont;
    }
  }, [soundFont]);

  // Link player↔visualizer (native follow) and sample currentTime while playing.
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const visualizer = visualizerRef.current;
    if (showPianoRoll && visualizer) player.addVisualizer(visualizer);

    const tick = () => {
      onTimeUpdateRef.current?.(player.currentTime * 1000);
      rafRef.current = requestAnimationFrame(tick);
    };
    const handleStart = () => {
      onStartRef.current?.();
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(tick);
    };
    const handleStop = () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      onTimeUpdateRef.current?.(player.currentTime * 1000);
      onStopRef.current?.();
    };

    player.addEventListener("start", handleStart);
    player.addEventListener("stop", handleStop);
    return () => {
      player.removeEventListener("start", handleStart);
      player.removeEventListener("stop", handleStop);
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (showPianoRoll && visualizer) player.removeVisualizer(visualizer);
    };
  }, [showPianoRoll]);

  // Click a piano-roll note (Magenta renders <rect data-index="i">) to seek.
  const handleVisualizerClick = (event: MouseEvent<MidiVisualizerElement>) => {
    const rect = (event.target as Element).closest<SVGRectElement>(
      "rect[data-index]",
    );
    const sequence = visualizerRef.current?.noteSequence;
    if (!rect || !sequence) return;
    const note = sequence.notes[Number(rect.getAttribute("data-index"))];
    if (note) seekTo(note.startTime);
  };

  return (
    <div className="verovio-midi-player">
      <midi-player ref={playerRef} />
      {showPianoRoll && (
        <midi-visualizer
          ref={visualizerRef}
          type="piano-roll"
          onClick={handleVisualizerClick}
        />
      )}
    </div>
  );
});
