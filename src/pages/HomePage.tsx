import { Link } from 'react-router-dom';
import type { PuzzleTypeModule } from '../shared/types/puzzle-type';

/** Props for the {@link HomePage} component. */
export interface HomePageProps {
  readonly modules: readonly PuzzleTypeModule[];
}

/**
 * Landing page showing available puzzle types.
 * With multiple types, displays a card grid. With one type,
 * main.tsx redirects to that type directly (this page is still
 * accessible for testing and future multi-type support).
 */
export function HomePage({ modules }: HomePageProps): React.JSX.Element {
  return (
    <div className="cb-home">
      <h2 className="cb-home__heading">Choose a puzzle type</h2>
      <div className="cb-home__grid">
        {modules.map((mod) => (
          <Link key={mod.id} to={`/${mod.id}`} className="cb-home__card">
            <span className="cb-home__icon">{mod.icon}</span>
            <span className="cb-home__name">{mod.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
