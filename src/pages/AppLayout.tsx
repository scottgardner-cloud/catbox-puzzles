import { useCallback, useRef } from 'react';
import { Link, Outlet, useOutletContext } from 'react-router-dom';
import '../App.css';

/** Context provided by AppLayout to child routes via Outlet. */
export interface LayoutContext {
  /** Push a message to the screen reader live region. */
  announce: (message: string) => void;
}

/** Hook for child routes to access the layout context. */
export function useLayoutContext(): LayoutContext {
  return useOutletContext<LayoutContext>();
}

/**
 * Shared application shell rendered around all routes.
 * Provides the header, navigation, screen reader live region,
 * and passes an `announce()` function to child routes via Outlet context.
 */
export function AppLayout(): React.JSX.Element {
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const announceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((message: string) => {
    if (!liveRegionRef.current) return;
    liveRegionRef.current.textContent = '';
    if (announceTimeoutRef.current) clearTimeout(announceTimeoutRef.current);
    announceTimeoutRef.current = setTimeout(() => {
      if (liveRegionRef.current) liveRegionRef.current.textContent = message;
    }, 50);
  }, []);

  const context: LayoutContext = { announce };

  return (
    <div className="cb-app">
      <header className="cb-header">
        <h1>
          <Link to="/" className="cb-header__title-link">
            CatBox Puzzles
          </Link>
        </h1>
        <nav className="cb-nav">
          <Link to="/" className="cb-nav__link">
            Puzzles
          </Link>
          <Link to="/generator" className="cb-nav__link">
            Generator
          </Link>
          <Link to="/editor" className="cb-nav__link">
            Editor
          </Link>
        </nav>
      </header>

      <main className="cb-main">
        <Outlet context={context} />
      </main>

      {/* Visually hidden live region for screen reader announcements */}
      <div
        ref={liveRegionRef}
        className="cb-sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />
    </div>
  );
}
