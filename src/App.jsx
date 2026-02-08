import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomeView from './views/HomeView';
import SetupView from './views/SetupView';
import LoadView from './views/LoadView';
import QuizView from './views/QuizView';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeView />} />
        <Route path="/setup" element={<SetupView />} />
        <Route path="/load" element={<LoadView />} />
        <Route path="/quiz/:quizId" element={<QuizView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
