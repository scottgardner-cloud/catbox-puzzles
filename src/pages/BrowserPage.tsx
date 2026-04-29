import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PuzzleBrowser, ImportPuzzle } from '../components';
import { getAllEntries, deleteCustomPuzzle } from '../puzzles/registry';

/**
 * Page component for the puzzle browser.
 * Loads entries fresh on each mount (reads from localStorage, always current).
 */
export function BrowserPage(): React.JSX.Element {
  const [entries, setEntries] = useState(() => getAllEntries());
  const [showImport, setShowImport] = useState(false);
  const navigate = useNavigate();

  const handleSelectPuzzle = useCallback(
    (entryId: string) => {
      navigate(`/play/${encodeURIComponent(entryId)}`);
    },
    [navigate],
  );

  const handleDeletePuzzle = useCallback((entryId: string) => {
    deleteCustomPuzzle(entryId);
    setEntries(getAllEntries());
  }, []);

  const handleImport = useCallback(() => {
    setShowImport(false);
    setEntries(getAllEntries());
  }, []);

  const handleEditPuzzle = useCallback(
    (entryId: string) => {
      navigate(`/editor/${encodeURIComponent(entryId)}`);
    },
    [navigate],
  );

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <button
          type="button"
          className="pap-btn pap-btn--primary"
          onClick={() => navigate('/editor')}
        >
          ✏️ Create New Puzzle
        </button>
      </div>
      <PuzzleBrowser
        entries={entries}
        onSelectPuzzle={handleSelectPuzzle}
        onDeletePuzzle={handleDeletePuzzle}
        onEditPuzzle={handleEditPuzzle}
        onImportPuzzle={() => setShowImport(true)}
      />
      {showImport && <ImportPuzzle onImport={handleImport} onClose={() => setShowImport(false)} />}
    </>
  );
}
