import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout, BrowserPage, GameRoute, GeneratorPage, EditorPage } from './pages';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<BrowserPage />} />
          <Route path="/play/:entryId" element={<GameRoute />} />
          <Route path="/generator" element={<GeneratorPage />} />
          <Route path="/editor/:entryId?" element={<EditorPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  </StrictMode>,
);
