import { useCallback, useRef } from 'react';
import { Link, Outlet, useLocation, useOutletContext } from 'react-router-dom';
import { puzzleModules } from '../puzzle-modules';
import '../shared/styles/app.css';

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
 *
 * Navigation is dynamic: when inside a puzzle type, shows that type's
 * nav items. At home level, shows registered puzzle types.
 */
export function AppLayout(): React.JSX.Element {
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const announceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const location = useLocation();

  const currentModule = puzzleModules.find((m) => location.pathname.startsWith(`/${m.id}`));

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
          {currentModule
            ? currentModule.navItems.map((item) => (
                <Link
                  key={item.path}
                  to={`/${currentModule.id}/${item.path}`}
                  className="cb-nav__link"
                >
                  {item.label}
                </Link>
              ))
            : puzzleModules.map((mod) => (
                <Link key={mod.id} to={`/${mod.id}`} className="cb-nav__link">
                  {mod.icon} {mod.name}
                </Link>
              ))}
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
