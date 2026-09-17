import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';
import { toast } from 'sonner';
import { AccessibilityProvider } from '@/contexts/AccessibilityContext';

// Register service worker for PWA. registerType is 'prompt' (see vite.config.ts),
// so this onNeedRefresh callback only fires once a new version has finished
// installing and is waiting - nothing reloads until the user opts in.
const updateSW = registerSW({
  onNeedRefresh() {
    toast('Nova versão disponível', {
      description: 'Atualize quando quiser continuar com a versão mais recente.',
      duration: Infinity,
      action: { label: 'Atualizar agora', onClick: () => updateSW(true) },
    });
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
