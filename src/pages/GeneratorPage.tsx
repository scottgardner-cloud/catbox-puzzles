import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLayoutContext } from './AppLayout';
import { usePuzzleGenerator } from '../generator/hooks/usePuzzleGenerator';
import { UploadPanel } from '../generator/components/UploadPanel';
import { SettingsPanel } from '../generator/components/SettingsPanel';
import { PreviewGrid } from '../generator/components/PreviewGrid';
import { ExportPanel } from '../generator/components/ExportPanel';
import './GeneratorPage.css';

/**
 * Full generator page. Single-page workflow: Upload → Settings → Preview → Export.
 * Panels are progressively revealed as the user advances through the flow.
 */
export function GeneratorPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { announce } = useLayoutContext();
  const gen = usePuzzleGenerator();

  const handleLoadImage = useCallback(
    async (file: File) => {
      const success = await gen.loadImage(file);
      announce(success ? `Image loaded: ${file.name}` : 'Failed to load image.');
    },
    [gen, announce],
  );

  const handleGenerate = useCallback(async () => {
    const result = await gen.generate();
    if (result?.ok) {
      const solMsg = result.solvability.solvable
        ? 'Puzzle is uniquely solvable.'
        : 'Warning: puzzle may not be uniquely solvable.';
      announce(`Puzzle generated successfully. ${solMsg}`);
    } else if (result) {
      announce('Generation produced errors. Check the details below.');
    } else {
      announce('Generation failed.');
    }
  }, [gen, announce]);

  const handleSaveToLibrary = useCallback(async () => {
    const puzzle = await gen.saveToLibrary();
    if (puzzle) {
      announce(`Puzzle "${puzzle.name}" saved to library.`);
      navigate('/');
    } else {
      announce('Failed to save puzzle.');
    }
  }, [gen, announce, navigate]);

  const hasImage = gen.sourceImage !== null;
  const hasResult = gen.result !== null && gen.result.ok;
  const validationErrors = gen.result && !gen.result.ok ? gen.result.errors : null;
  const puzzle = gen.result?.ok ? gen.result.puzzle : null;
  const isBusy = gen.status === 'generating' || gen.status === 'saving' || gen.status === 'loading-image';

  return (
    <div className="pap-gen">
      <h2>Puzzle Generator</h2>
      <p className="pap-gen__subtitle">Convert an image into a playable nonogram puzzle.</p>

      {/* Step 1: Upload */}
      <UploadPanel
        onFileSelected={handleLoadImage}
        previewUrl={gen.sourceImage?.previewUrl ?? null}
        fileName={gen.sourceImage?.fileName ?? null}
        isLoading={gen.status === 'loading-image'}
        disabled={gen.status === 'generating' || gen.status === 'saving'}
      />

      {/* Step 2: Settings (shown after image loaded) */}
      {hasImage && (
        <SettingsPanel
          settings={gen.settings}
          onUpdate={gen.updateSettings}
          onGenerate={handleGenerate}
          isGenerating={gen.status === 'generating'}
          settingsChanged={gen.settingsChanged}
          hasResult={hasResult}
          disabled={isBusy}
        />
      )}

      {/* Step 3: Preview (shown after successful generation) */}
      {puzzle && <PreviewGrid puzzle={puzzle} />}

      {/* Solvability warning */}
      {gen.result?.ok && !gen.result.solvability.solvable && (
        <div className="pap-gen-solvability-warning" role="alert">
          <p><strong>⚠ Solvability warning:</strong> {gen.result.solvability.reason}</p>
          <p className="pap-gen-solvability-warning__hint">{gen.result.solvability.hint}</p>
          <p className="pap-gen-solvability-warning__note">You can still save this puzzle, but it may require guessing to solve.</p>
        </div>
      )}

      {/* Step 4: Export (shown after any generation attempt) */}
      {(gen.result || gen.error) && (
        <ExportPanel
          puzzle={puzzle}
          errors={validationErrors}
          error={gen.error}
          isSaving={gen.status === 'saving'}
          onSaveToLibrary={handleSaveToLibrary}
          onReset={gen.reset}
        />
      )}

      {/* Standalone reset when no result yet */}
      {hasImage && !gen.result && !gen.error && (
        <div className="pap-gen__secondary">
          <button type="button" className="pap-btn" onClick={gen.reset}>
            ↩ Start Over
          </button>
        </div>
      )}
    </div>
  );
}
