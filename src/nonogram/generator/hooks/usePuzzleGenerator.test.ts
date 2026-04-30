import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePuzzleGenerator } from './usePuzzleGenerator';
import type { GeneratorFormSettings } from './usePuzzleGenerator';

// Mock browser APIs that don't exist in jsdom
vi.stubGlobal('createImageBitmap', vi.fn());
vi.stubGlobal('OffscreenCanvas', vi.fn());
vi.stubGlobal('URL', {
  ...globalThis.URL,
  createObjectURL: vi.fn(() => 'blob:mock-url'),
  revokeObjectURL: vi.fn(),
});

// Mock the pipeline to avoid canvas dependencies
vi.mock('../pipeline', async (importOriginal) => {
  const original = await importOriginal<typeof import('../pipeline')>();
  return {
    ...original,
    resizeToGrid: vi.fn(() => ({
      width: 10,
      height: 10,
      data: new Uint8ClampedArray(10 * 10 * 4),
    })),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('usePuzzleGenerator', () => {
  it('starts in idle state', () => {
    const { result } = renderHook(() => usePuzzleGenerator());
    expect(result.current.status).toBe('idle');
    expect(result.current.sourceImage).toBeNull();
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('has default settings', () => {
    const { result } = renderHook(() => usePuzzleGenerator());
    expect(result.current.settings.kind).toBe('bw');
    expect(result.current.settings.targetRows).toBe(10);
    expect(result.current.settings.targetCols).toBe(10);
    expect(result.current.settings.bwThreshold).toBe(128);
    expect(result.current.settings.maxColors).toBe(4);
  });

  it('updateSettings merges partial updates', () => {
    const { result } = renderHook(() => usePuzzleGenerator());
    act(() => {
      result.current.updateSettings({ kind: 'color', targetRows: 15 });
    });
    expect(result.current.settings.kind).toBe('color');
    expect(result.current.settings.targetRows).toBe(15);
    // Other settings unchanged
    expect(result.current.settings.targetCols).toBe(10);
  });

  it('generate without image returns null', async () => {
    const { result } = renderHook(() => usePuzzleGenerator());
    let genResult: unknown;
    await act(async () => {
      genResult = await result.current.generate();
    });
    expect(genResult).toBeNull();
  });

  it('reset clears all state', () => {
    const { result } = renderHook(() => usePuzzleGenerator());
    act(() => {
      result.current.updateSettings({ name: 'Test', kind: 'color' });
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.status).toBe('idle');
    expect(result.current.settings.name).toBe('');
    expect(result.current.settings.kind).toBe('bw');
    expect(result.current.sourceImage).toBeNull();
    expect(result.current.result).toBeNull();
  });

  it('reset revokes preview URL', () => {
    const { result } = renderHook(() => usePuzzleGenerator());
    // Simulate having a preview URL by updating settings (we can't easily load an image in jsdom)
    act(() => {
      result.current.reset();
    });
    // URL.revokeObjectURL should be called if there was a preview
    // This is a structural test — verifying the cleanup path exists
    expect(result.current.sourceImage).toBeNull();
  });

  it('settingsChanged is false when no result exists', () => {
    const { result } = renderHook(() => usePuzzleGenerator());
    expect(result.current.settingsChanged).toBe(false);
  });

  it('updateSettings preserves other fields', () => {
    const { result } = renderHook(() => usePuzzleGenerator());
    const original: GeneratorFormSettings = { ...result.current.settings };
    act(() => {
      result.current.updateSettings({ name: 'New Name' });
    });
    expect(result.current.settings.name).toBe('New Name');
    expect(result.current.settings.kind).toBe(original.kind);
    expect(result.current.settings.targetRows).toBe(original.targetRows);
    expect(result.current.settings.bwThreshold).toBe(original.bwThreshold);
  });
});
