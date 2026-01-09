/**
 * Main App Component
 * 
 * Routes and navigation.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { EntryPage } from './pages/EntryPage';
import { WaitingRoomPage } from './pages/WaitingRoomPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EntryPage />} />
        <Route path="/waiting" element={<WaitingRoomPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
