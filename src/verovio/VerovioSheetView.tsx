import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type PointerEvent,
} from "react";
import { useVerovio } from "./VerovioProvider";

export interface VerovioSheetViewHandle {
  /** Highlight the given note xml:ids (imperative — does not re-render). */
  setHighlight: (ids: string[]) => void;
}

export interface VerovioSheetViewProps {
  /** 1-based page to display (default 1). */
  page?: number;
  className?: string;
  /** Fired with a note's xml:id when the user presses it (e.g. to seek). */
  onNoteClick?: (xmlId: string) => void;
}

/**
 * Renders the shared Verovio score (from {@link useVerovio}) to SVG.
 *
 * The SVG is owned imperatively: React only manages an empty container `<div>`,
 * and the engraved markup is injected via `innerHTML` whenever the page/score
 * changes. Highlighting is likewise applied imperatively through the
 * {@link VerovioSheetViewHandle} ref, so playback-rate highlight updates never
 * re-render this component or rebuild the SVG nodes — which keeps the nodes
 * stable so pointer interactions land reliably during playback.
 */
export const VerovioSheetView = forwardRef<
  VerovioSheetViewHandle,
  VerovioSheetViewProps
>(function VerovioSheetView({ page = 1, className, onNoteClick }, ref) {
  const { renderToSVG, isReady, isLoading, error } = useVerovio();
  const containerRef = useRef<HTMLDivElement>(null);
  const lastHighlightRef = useRef<string[]>([]);

  // renderToSVG's identity changes when the score finishes loading, so this
  // recomputes once the SVG is available and again on page changes.
  const svg = useMemo(
    () => (isReady ? renderToSVG(page) : ""),
    [renderToSVG, page, isReady],
  );

  const applyHighlight = (ids: string[]) => {
    const root = containerRef.current;
    if (!root) return;
    for (const el of root.querySelectorAll(".playing")) {
      el.classList.remove("playing");
    }
    for (const id of ids) {
      root.querySelector(`#${CSS.escape(id)}`)?.classList.add("playing");
    }
  };

  useImperativeHandle(ref, () => ({
    setHighlight: (ids: string[]) => {
      lastHighlightRef.current = ids;
      applyHighlight(ids);
    },
  }));

  // Inject the SVG imperatively only when it actually changes, then re-apply
  // the current highlight (the freshly injected nodes start without classes).
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    root.innerHTML = svg;
    applyHighlight(lastHighlightRef.current);
  }, [svg]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!onNoteClick) return;
    const note = (event.target as Element).closest<SVGGElement>("g.note");
    if (note?.id) onNoteClick(note.id);
  };

  return (
    <div className={className}>
      {error && (
        <p className="verovio-error">Failed to load score: {error.message}</p>
      )}
      {isLoading && !svg && <p className="verovio-loading">Loading…</p>}
      <div
        ref={containerRef}
        className="verovio-svg"
        onPointerDown={handlePointerDown}
      />
    </div>
  );
});
