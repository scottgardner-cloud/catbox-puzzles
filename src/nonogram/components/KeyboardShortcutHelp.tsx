import { useCallback, useEffect, useRef, useState } from 'react';
import './KeyboardShortcutHelp.css';

/** A single keyboard shortcut entry. */
interface Shortcut {
  readonly keys: string;
  readonly description: string;
}

const GRID_SHORTCUTS: Shortcut[] = [
  { keys: '↑ ↓ ← →', description: 'Navigate cells' },
  { keys: 'Space / Enter', description: 'Cycle cell state' },
  { keys: 'Home', description: 'Jump to first column' },
  { keys: 'End', description: 'Jump to last column' },
  { keys: 'Ctrl+Home', description: 'Jump to top-left cell' },
  { keys: 'Ctrl+End', description: 'Jump to bottom-right cell' },
];

const GLOBAL_SHORTCUTS: Shortcut[] = [
  { keys: 'Ctrl+Z', description: 'Undo' },
  { keys: 'Ctrl+Y / Ctrl+Shift+Z', description: 'Redo' },
  { keys: '1–9', description: 'Select palette color' },
];

/**
 * A help button that opens a modal overlay listing all keyboard shortcuts.
 * Pressing Escape or clicking outside the modal closes it.
 * Focus is trapped inside the modal while open and restored on close.
 */
export function KeyboardShortcutHelp({
  onOpenChange,
}: {
  /** Called when the modal opens or closes. */
  readonly onOpenChange?: (isOpen: boolean) => void;
} = {}): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const hasBeenOpened = useRef(false);

  const setOpen = useCallback(
    (value: boolean) => {
      setIsOpen(value);
      onOpenChange?.(value);
    },
    [onOpenChange],
  );

  const toggle = useCallback(() => setOpen(!isOpen), [setOpen, isOpen]);
  const close = useCallback(() => setOpen(false), [setOpen]);

  // Focus management: move focus into modal on open, restore on close
  useEffect(() => {
    if (isOpen) {
      hasBeenOpened.current = true;
      closeRef.current?.focus();
    } else if (hasBeenOpened.current) {
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, close]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="cb-btn cb-shortcut-help__trigger"
        onClick={toggle}
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts"
      >
        ?
      </button>

      {isOpen && (
        <div className="cb-shortcut-help__backdrop" onClick={close} role="presentation">
          <div
            className="cb-shortcut-help__modal"
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cb-shortcut-help__header">
              <h3>Keyboard Shortcuts</h3>
              <button
                ref={closeRef}
                type="button"
                className="cb-shortcut-help__close"
                onClick={close}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <h4 className="cb-shortcut-help__section">Grid Navigation</h4>
            <ShortcutTable shortcuts={GRID_SHORTCUTS} />

            <h4 className="cb-shortcut-help__section">Global</h4>
            <ShortcutTable shortcuts={GLOBAL_SHORTCUTS} />
          </div>
        </div>
      )}
    </>
  );
}

function ShortcutTable({
  shortcuts,
}: {
  readonly shortcuts: readonly Shortcut[];
}): React.JSX.Element {
  return (
    <table className="cb-shortcut-help__table">
      <tbody>
        {shortcuts.map((s) => (
          <tr key={s.keys}>
            <td className="cb-shortcut-help__keys">
              {s.keys.split(' / ').map((k, i) => (
                <span key={k}>
                  {i > 0 && <span className="cb-shortcut-help__sep"> / </span>}
                  <kbd>{k}</kbd>
                </span>
              ))}
            </td>
            <td className="cb-shortcut-help__desc">{s.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
