import type { GeneratorFormSettings } from '../hooks/usePuzzleGenerator';

export interface SettingsPanelProps {
  readonly settings: GeneratorFormSettings;
  readonly onUpdate: (partial: Partial<GeneratorFormSettings>) => void;
  readonly onGenerate: () => void;
  readonly isGenerating: boolean;
  readonly settingsChanged: boolean;
  readonly hasResult: boolean;
  readonly disabled: boolean;
}

/**
 * Settings panel for configuring puzzle generation parameters.
 * Includes grid size, mode, threshold/colors, and generate button.
 */
export function SettingsPanel({
  settings,
  onUpdate,
  onGenerate,
  isGenerating,
  settingsChanged,
  hasResult,
  disabled,
}: SettingsPanelProps): React.JSX.Element {
  return (
    <section className="pap-gen-settings" aria-label="Generator settings">
      {/* Puzzle name */}
      <div className="pap-gen-settings__field">
        <label htmlFor="gen-name">Puzzle name</label>
        <input
          id="gen-name"
          type="text"
          value={settings.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="My Puzzle"
          disabled={disabled}
        />
      </div>

      {/* Grid size */}
      <fieldset className="pap-gen-settings__fieldset" disabled={disabled}>
        <legend>Grid size</legend>
        <div className="pap-gen-settings__row">
          <label htmlFor="gen-rows">Rows</label>
          <input
            id="gen-rows"
            type="number"
            min={5}
            max={25}
            value={settings.targetRows}
            onChange={(e) => onUpdate({ targetRows: clampGrid(e.target.valueAsNumber) })}
          />
          <span aria-hidden="true">×</span>
          <label htmlFor="gen-cols">Cols</label>
          <input
            id="gen-cols"
            type="number"
            min={5}
            max={25}
            value={settings.targetCols}
            onChange={(e) => onUpdate({ targetCols: clampGrid(e.target.valueAsNumber) })}
          />
        </div>
      </fieldset>

      {/* Mode toggle */}
      <fieldset className="pap-gen-settings__fieldset" disabled={disabled}>
        <legend>Mode</legend>
        <div className="pap-gen-settings__row">
          <label>
            <input
              type="radio"
              name="gen-kind"
              value="bw"
              checked={settings.kind === 'bw'}
              onChange={() => onUpdate({ kind: 'bw' })}
            />
            B&amp;W
          </label>
          <label>
            <input
              type="radio"
              name="gen-kind"
              value="color"
              checked={settings.kind === 'color'}
              onChange={() => onUpdate({ kind: 'color' })}
            />
            Color
          </label>
        </div>
      </fieldset>

      {/* B&W threshold */}
      {settings.kind === 'bw' && (
        <div className="pap-gen-settings__field" aria-label="Threshold settings">
          <label htmlFor="gen-threshold">
            Threshold: {settings.bwThreshold}
          </label>
          <input
            id="gen-threshold"
            type="range"
            min={0}
            max={255}
            value={settings.bwThreshold}
            onChange={(e) => onUpdate({ bwThreshold: e.target.valueAsNumber })}
            disabled={disabled}
            aria-valuemin={0}
            aria-valuemax={255}
            aria-valuenow={settings.bwThreshold}
          />
        </div>
      )}

      {/* Color options */}
      {settings.kind === 'color' && (
        <div className="pap-gen-settings__field" aria-label="Color settings">
          <label htmlFor="gen-colors">
            Max colors: {settings.maxColors}
          </label>
          <input
            id="gen-colors"
            type="range"
            min={2}
            max={8}
            value={settings.maxColors}
            onChange={(e) => onUpdate({ maxColors: e.target.valueAsNumber })}
            disabled={disabled}
            aria-valuemin={2}
            aria-valuemax={8}
            aria-valuenow={settings.maxColors}
          />
        </div>
      )}

      {/* Generate button */}
      <div className="pap-gen-settings__actions">
        <button
          type="button"
          className="pap-btn pap-btn--primary"
          onClick={onGenerate}
          disabled={disabled || isGenerating}
          aria-busy={isGenerating}
        >
          {isGenerating
            ? 'Generating…'
            : hasResult && !settingsChanged
              ? '✓ Generated'
              : hasResult && settingsChanged
                ? '↻ Regenerate'
                : '▶ Generate'}
        </button>
        {settingsChanged && hasResult && (
          <p className="pap-gen-settings__hint" role="status">
            Settings changed — regenerate to update preview.
          </p>
        )}
      </div>
    </section>
  );
}

function clampGrid(n: number): number {
  if (Number.isNaN(n)) return 10;
  return Math.max(5, Math.min(25, Math.round(n)));
}
