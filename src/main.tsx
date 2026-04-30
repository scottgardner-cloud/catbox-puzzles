import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './pages';
import { HomePage } from './pages/HomePage';
import { puzzleModules } from './puzzle-modules';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route
            path="/"
            element={
              puzzleModules.length === 1 ? (
                <Navigate to={`/${puzzleModules[0].id}`} replace />
              ) : (
                <HomePage modules={puzzleModules} />
              )
            }
          />
          {puzzleModules.map((mod) => (
            <Route key={mod.id} path={`${mod.id}/*`}>
              {mod.routes.map((route, i) => (
                <Route key={i} {...route} />
              ))}
            </Route>
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  </StrictMode>,
);
