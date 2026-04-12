import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import CursorGlow from './components/CursorGlow.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CursorGlow />
    <App />
  </StrictMode>,
);
