import { useCallback, useEffect, useRef, useState } from 'react';
import { resizeToGrid, buildPuzzle } from '../pipeline';
import type { BuildPuzzleResult, GeneratorSettings, BackgroundMode, PixelGrid } from '../pipeline';
import { saveCustomPuzzle } from '../../puzzles/registry';
import type { ValidatedPuzzle } from '../../types';

// ── Types ───────────────────────────────────────────────────────────

/** Editable form settings for the generator. */
export interface GeneratorFormSettings {
  name: string;
  kind: 'bw' | 'color';
  targetRows: number;
  targetCols: number;
  bwThreshold: number;
  maxColors: number;
  backgroundMode: BackgroundMode;
}

/** Source image data loaded by the user. */
interface SourceImage {
  readonly imageData: ImageData;
  readonly previewUrl: string;
  readonly fileName: string;
}

/** Status of the generator — flat model, not strict step union. */
export type GeneratorStatus =
  | 'idle'
  | 'loading-image'
  | 'ready'
  | 'generating'
  | 'saving'
  | 'error';

/** Error info with recovery guidance. */
export interface GeneratorError {
  readonly message: string;
  readonly recoveryHint?: string;
}

/** Full state exposed by the hook. */
export interface GeneratorHookState {
  readonly status: GeneratorStatus;
  readonly sourceImage: SourceImage | null;
  readonly settings: GeneratorFormSettings;
  readonly result: BuildPuzzleResult | null;
  /** Settings that produced the current result (null if no result). */
  readonly generatedFromSettings: GeneratorSettings | null;
  /** Whether current draft settings differ from those that produced the result. */
  readonly settingsChanged: boolean;
  readonly error: GeneratorError | null;
}

/** Actions exposed by the hook. */
export interface GeneratorHookActions {
  updateSettings: (partial: Partial<GeneratorFormSettings>) => void;
  loadImage: (file: File) => Promise<boolean>;
  generate: () => Promise<BuildPuzzleResult | null>;
  saveToLibrary: () => Promise<ValidatedPuzzle | null>;
  reset: () => void;
}

// ── Defaults ────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: GeneratorFormSettings = {
  name: '',
  kind: 'bw',
  targetRows: 10,
  targetCols: 10,
  bwThreshold: 128,
  maxColors: 4,
  backgroundMode: { kind: 'auto' },
};

// ── Image decode helper ─────────────────────────────────────────────

async function decodeImageFile(file: File): Promise<{ imageData: ImageData; previewUrl: string }> {
  const bitmap = await createImageBitmap(file);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas 2D context');
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  const previewUrl = URL.createObjectURL(file);
  return { imageData, previewUrl };
}

// ── Hook ────────────────────────────────────────────────────────────

/**
 * Hook that orchestrates the puzzle generator pipeline.
 * Manages image loading, settings, generation, and export.
 */
export function usePuzzleGenerator(): GeneratorHookState & GeneratorHookActions {
  const [status, setStatus] = useState<GeneratorStatus>('idle');
  const [sourceImage, setSourceImage] = useState<SourceImage | null>(null);
  const [settings, setSettings] = useState<GeneratorFormSettings>(DEFAULT_SETTINGS);
  const [result, setResult] = useState<BuildPuzzleResult | null>(null);
  const [generatedFromSettings, setGeneratedFromSettings] = useState<GeneratorSettings | null>(null);
  const [error, setError] = useState<GeneratorError | null>(null);

  // Request token for stale-request protection
  const requestIdRef = useRef(0);

  // Revoke previous object URL on image change or unmount
  const prevPreviewUrlRef = useRef<string | null>(null);
  useEffect(() => {
    return () => {
      if (prevPreviewUrlRef.current) {
        URL.revokeObjectURL(prevPreviewUrlRef.current);
      }
    };
  }, []);

  const updateSettings = useCallback((partial: Partial<GeneratorFormSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const loadImage = useCallback(async (file: File): Promise<boolean> => {
    const reqId = ++requestIdRef.current;
    setStatus('loading-image');
    setError(null);

    try {
      const { imageData, previewUrl } = await decodeImageFile(file);

      // Stale request check
      if (reqId !== requestIdRef.current) {
        URL.revokeObjectURL(previewUrl);
        return false;
      }

      // Revoke old preview URL
      if (prevPreviewUrlRef.current) {
        URL.revokeObjectURL(prevPreviewUrlRef.current);
      }
      prevPreviewUrlRef.current = previewUrl;

      const fileName = file.name.replace(/\.[^.]+$/, '');
      setSourceImage({ imageData, previewUrl, fileName });
      setSettings((prev) => ({ ...prev, name: fileName }));
      setResult(null);
      setGeneratedFromSettings(null);
      setStatus('ready');
      return true;
    } catch (err) {
      if (reqId !== requestIdRef.current) return false;
      setError({
        message: 'Failed to load image. Please try a different file.',
        recoveryHint: 'Supported formats: PNG, JPEG, GIF, WebP',
      });
      setStatus('error');
      return false;
    }
  }, []);

  const generate = useCallback(async (): Promise<BuildPuzzleResult | null> => {
    if (!sourceImage) return null;

    const reqId = ++requestIdRef.current;
    setStatus('generating');
    setError(null);

    // Build pipeline settings from form
    const pipelineSettings: GeneratorSettings = {
      name: settings.name || 'Untitled Puzzle',
      kind: settings.kind,
      targetRows: settings.targetRows,
      targetCols: settings.targetCols,
      bwThreshold: settings.bwThreshold,
      maxColors: settings.maxColors,
      backgroundMode: settings.backgroundMode,
    };

    try {
      // Resize image to grid
      const pixelGrid: PixelGrid = resizeToGrid(
        {
          width: sourceImage.imageData.width,
          height: sourceImage.imageData.height,
          data: sourceImage.imageData.data,
        },
        pipelineSettings.targetCols,
        pipelineSettings.targetRows,
      );

      // Build puzzle
      const buildResult = buildPuzzle(pixelGrid, pipelineSettings);

      if (reqId !== requestIdRef.current) return null;

      setResult(buildResult);
      setGeneratedFromSettings(pipelineSettings);

      if (!buildResult.ok) {
        // Map validation errors to recovery hints
        const firstError = buildResult.errors[0]?.message ?? 'Unknown error';
        let hint = 'Try adjusting the settings and regenerating.';
        if (firstError.includes('background')) {
          hint = 'Try changing the background mode or switching to B&W mode.';
        } else if (firstError.includes('palette') || firstError.includes('color')) {
          hint = 'Try reducing the number of colors or switching to B&W mode.';
        }
        setError({ message: firstError, recoveryHint: hint });
        setStatus('ready');
        return buildResult;
      } else {
        setStatus('ready');
        return buildResult;
      }
    } catch (err) {
      if (reqId !== requestIdRef.current) return null;
      setError({
        message: 'Generation failed unexpectedly.',
        recoveryHint: 'Try different settings or a different image.',
      });
      setStatus('ready');
      return null;
    }
  }, [sourceImage, settings]);

  const saveToLibrary = useCallback(async (): Promise<ValidatedPuzzle | null> => {
    if (!result || !result.ok) return null;

    setStatus('saving');
    setError(null);

    try {
      const entry = saveCustomPuzzle(result.puzzle);
      if (!entry) {
        setError({ message: 'Failed to save puzzle to library.' });
        setStatus('ready');
        return null;
      }
      setStatus('ready');
      return result.puzzle;
    } catch {
      setError({ message: 'Failed to save puzzle to library.' });
      setStatus('ready');
      return null;
    }
  }, [result]);

  const reset = useCallback(() => {
    requestIdRef.current++;
    if (prevPreviewUrlRef.current) {
      URL.revokeObjectURL(prevPreviewUrlRef.current);
      prevPreviewUrlRef.current = null;
    }
    setStatus('idle');
    setSourceImage(null);
    setSettings(DEFAULT_SETTINGS);
    setResult(null);
    setGeneratedFromSettings(null);
    setError(null);
  }, []);

  // Compute whether draft settings differ from generated settings
  const settingsChanged =
    generatedFromSettings !== null &&
    (settings.kind !== generatedFromSettings.kind ||
      settings.targetRows !== generatedFromSettings.targetRows ||
      settings.targetCols !== generatedFromSettings.targetCols ||
      settings.bwThreshold !== (generatedFromSettings.bwThreshold ?? 128) ||
      settings.maxColors !== (generatedFromSettings.maxColors ?? 4) ||
      settings.name !== generatedFromSettings.name ||
      settings.backgroundMode.kind !== (generatedFromSettings.backgroundMode?.kind ?? 'auto'));

  return {
    status,
    sourceImage,
    settings,
    result,
    generatedFromSettings,
    settingsChanged,
    error,
    updateSettings,
    loadImage,
    generate,
    saveToLibrary,
    reset,
  };
}
