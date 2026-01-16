import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import DictationPage from './pages/DictationPage';
import AdminPanel from './pages/AdminPanel';
import Test from './pages/test';
import ContactPage from './pages/Contact';
import Navbar from './component/Nav';
import Notes from './component/Notes';
import ManegerNotes from './pages/ManegerNotes';
function App() {
  
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<AdminPanel />} />
          <Route path="/" element={<Login />} />
          <Route path="/notes" element={<ManegerNotes />} />
          <Route path="/dictation" element={<DictationPage />} />
          <Route path="/contact" element={<ContactPage />} />
          {/* test routes */}
          <Route path="/test/test" element={<Test />} />
          <Route path="/test/nav" element={<Navbar />} />
          <Route path="/test/note" element={<Notes />} />

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
