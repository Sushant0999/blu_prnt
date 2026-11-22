import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { CatalogPage } from './pages/CatalogPage';
import { LessonPage } from './pages/LessonPage';
import { PlaygroundPage } from './pages/PlaygroundPage';
import { SimulatorsPage } from './pages/SimulatorsPage';
import { CalculatorsPage } from './pages/CalculatorsPage';
import { FlashcardsPage } from './pages/FlashcardsPage';
import { CasesPage } from './pages/CasesPage';
import { InterviewPage } from './pages/InterviewPage';
import { ProPage } from './pages/ProPage';
import { useThemeStore } from './stores/useThemeStore';

export const App: React.FC = () => {
  const { theme } = useThemeStore();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/lessons/:lessonId" element={<LessonPage />} />
          <Route path="/playground" element={<PlaygroundPage />} />
          <Route path="/simulate" element={<SimulatorsPage />} />
          <Route path="/simulate/:simulatorId" element={<SimulatorsPage />} />
          <Route path="/simulators" element={<SimulatorsPage />} />
          <Route path="/simulators/:simulatorId" element={<SimulatorsPage />} />
          <Route path="/calculators" element={<CalculatorsPage />} />
          <Route path="/flashcards" element={<FlashcardsPage />} />
          <Route path="/cases" element={<CasesPage />} />
          <Route path="/interview" element={<InterviewPage />} />
          <Route path="/pro" element={<ProPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
};

export default App;
