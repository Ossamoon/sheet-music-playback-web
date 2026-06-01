import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { VerovioModule } from "verovio";
import type { VerovioToolkit } from "verovio/esm";
import type { TimeMapEntry, TimeMapOptions, VerovioOptions } from "verovio";

/** Constructor type for the Verovio toolkit (avoids `typeof` on a type-only import). */
type VerovioToolkitCtor = new (module?: VerovioModule) => VerovioToolkit;

export interface VerovioContextValue {
  /** The single shared toolkit holding the loaded score. */
  toolkit: VerovioToolkit | null;
  /** True once a score has been loaded and is renderable. */
  isReady: boolean;
  /** True while the module or score is loading. */
  isLoading: boolean;
  error: Error | null;
  pageCount: number;
  /** Bumped on each successful (re)load so consumers re-render / regenerate. */
  contentToken: number;
  /** Render a 1-based page to SVG (empty string until ready). */
  renderToSVG: (page: number) => string;
  renderToMIDI: () => string | null;
  getElementsAtTime: (ms: number) => { notes: string[]; page: number } | null;
  getTimeForElement: (xmlId: string) => number | null;
  getTimemap: (opts?: TimeMapOptions) => TimeMapEntry[] | null;
}

const VerovioContext = createContext<VerovioContextValue | null>(null);

export interface VerovioProviderProps {
  /** MEI/MusicXML string, or compressed MusicXML (.mxl) as an ArrayBuffer. */
  data?: string | ArrayBuffer;
  /** URL to fetch instead of `data` (.mxl is loaded as a zip, otherwise as text). */
  src?: string;
  options?: VerovioOptions;
  children: ReactNode;
}

function isZipUrl(url: string, contentType: string | null): boolean {
  const lower = url.toLowerCase();
  if (lower.endsWith(".mxl") || lower.endsWith(".zip")) return true;
  return contentType != null && contentType.includes("zip");
}

/**
 * Loads the Verovio WASM module once, owns a single toolkit instance with the
 * current score loaded, and shares it (plus rendering/timing helpers) through
 * context. A single toolkit means a single xml:id space, so the SVG ids match
 * the ids returned by the timing queries — which is what makes playback
 * highlighting and note-click seeking line up.
 *
 * Mount once around any tree that renders/queries the score.
 */
export function VerovioProvider({
  data,
  src,
  options,
  children,
}: VerovioProviderProps) {
  const [toolkit, setToolkit] = useState<VerovioToolkit | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [contentToken, setContentToken] = useState(0);

  // Stable, memoised options so inline option objects don't thrash the load effect.
  const optionsKey = JSON.stringify(options ?? {});
  const stableOptions = useMemo(
    () => JSON.parse(optionsKey) as VerovioOptions,
    [optionsKey],
  );

  // 1) Load the WASM module once and create the single shared toolkit.
  useEffect(() => {
    let cancelled = false;
    let created: VerovioToolkit | null = null;
    (async () => {
      try {
        // Dynamic import keeps the ~6.7 MB WASM out of the initial bundle.
        const [wasm, esm] = await Promise.all([
          import("verovio/wasm"),
          import("verovio/esm"),
        ]);
        const module = await wasm.default();
        if (cancelled) return;
        const Ctor = esm.VerovioToolkit as VerovioToolkitCtor;
        created = new Ctor(module);
        setToolkit(created);
      } catch (e) {
        if (!cancelled) {
          setError(e as Error);
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      created?.destroy();
      setToolkit(null);
      setLoaded(false);
      setPageCount(0);
    };
  }, []);

  // 2) Load the score into the shared toolkit (re-runs on data/src/options change).
  useEffect(() => {
    if (!toolkit) return;
    let cancelled = false;

    const finish = (err: Error | null) => {
      if (cancelled) return;
      setError(err);
      setIsLoading(false);
    };

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (Object.keys(stableOptions).length) toolkit.setOptions(stableOptions);

        let ok: boolean;
        if (typeof data === "string") {
          ok = toolkit.loadData(data);
        } else if (data) {
          ok = toolkit.loadZipDataBuffer(data);
        } else if (src) {
          const res = await fetch(src);
          if (cancelled) return;
          if (isZipUrl(src, res.headers.get("content-type"))) {
            const buf = await res.arrayBuffer();
            if (cancelled) return;
            ok = toolkit.loadZipDataBuffer(buf);
          } else {
            const text = await res.text();
            if (cancelled) return;
            ok = toolkit.loadData(text);
          }
        } else {
          // Nothing to load yet.
          setLoaded(false);
          setPageCount(0);
          finish(null);
          return;
        }

        if (cancelled) return;
        if (!ok) throw new Error("Verovio failed to load the score data");

        setPageCount(toolkit.getPageCount());
        setLoaded(true);
        setContentToken((t) => t + 1);
        finish(null);
      } catch (e) {
        finish(e as Error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [toolkit, data, src, stableOptions]);

  const renderToSVG = useCallback(
    (page: number) => {
      if (!loaded || !toolkit || pageCount === 0) return "";
      const clamped = Math.min(Math.max(page, 1), pageCount);
      return toolkit.renderToSVG(clamped);
    },
    [toolkit, loaded, pageCount],
  );
  const renderToMIDI = useCallback(
    () => (loaded && toolkit ? toolkit.renderToMIDI() : null),
    [toolkit, loaded],
  );
  const getElementsAtTime = useCallback(
    (ms: number) => (loaded && toolkit ? toolkit.getElementsAtTime(ms) : null),
    [toolkit, loaded],
  );
  const getTimeForElement = useCallback(
    (xmlId: string) =>
      loaded && toolkit ? toolkit.getTimeForElement(xmlId) : null,
    [toolkit, loaded],
  );
  const getTimemap = useCallback(
    (opts?: TimeMapOptions) =>
      loaded && toolkit ? toolkit.renderToTimemap(opts) : null,
    [toolkit, loaded],
  );

  const value = useMemo<VerovioContextValue>(
    () => ({
      toolkit,
      isReady: loaded && toolkit != null,
      isLoading,
      error,
      pageCount,
      contentToken,
      renderToSVG,
      renderToMIDI,
      getElementsAtTime,
      getTimeForElement,
      getTimemap,
    }),
    [
      toolkit,
      loaded,
      isLoading,
      error,
      pageCount,
      contentToken,
      renderToSVG,
      renderToMIDI,
      getElementsAtTime,
      getTimeForElement,
      getTimemap,
    ],
  );

  return <VerovioContext value={value}>{children}</VerovioContext>;
}

/** Reads the shared Verovio score context. Throws if used outside the provider. */
// eslint-disable-next-line react-refresh/only-export-components
export function useVerovio(): VerovioContextValue {
  const ctx = useContext(VerovioContext);
  if (!ctx) {
    throw new Error("useVerovio must be used within <VerovioProvider>");
  }
  return ctx;
}
