import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { installInteractionGuards } from './lib/guards';
import { sound } from './lib/sound';
import './styles.css';

installInteractionGuards();

// Browsers allow audio only after a user gesture.
const unlockAudio = () => sound.unlock();
window.addEventListener('pointerdown', unlockAudio, { passive: true });
window.addEventListener('keydown', unlockAudio);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
