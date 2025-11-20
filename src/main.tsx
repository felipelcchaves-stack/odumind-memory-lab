import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';
import { AccessibilityProvider } from '@/contexts/AccessibilityContext';

// Register service worker for PWA
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Nova versão disponível! Deseja atualizar?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App pronto para uso offline');
  },
});

createRoot(document.getElementById("root")!).render(
  <AccessibilityProvider>
    <App />
  </AccessibilityProvider>
);
