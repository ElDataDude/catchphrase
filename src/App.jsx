import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardView from './views/DashboardView';
import LibraryView from './views/LibraryView';
import EditorView from './views/EditorView';
import QuizView from './views/QuizView';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardView />} />
        <Route path="/library" element={<LibraryView />} />
        <Route path="/quiz/new" element={<EditorView />} />
        <Route path="/quiz/:quizId/edit" element={<EditorView />} />
        <Route path="/quiz/:quizId" element={<QuizView />} />
        <Route path="/setup" element={<Navigate to="/quiz/new" replace />} />
        <Route path="/load" element={<Navigate to="/library" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
