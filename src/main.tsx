import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { installInteractionGuards } from './lib/guards';
import './styles.css';

installInteractionGuards();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
