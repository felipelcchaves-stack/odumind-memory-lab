import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface ContentProtectionOptions {
  disableContextMenu?: boolean;
  disableTextSelection?: boolean;
  disableCopyPaste?: boolean;
  enablePrintOverlay?: boolean;
}

export const useContentProtection = (options: ContentProtectionOptions = {}) => {
  const { user } = useAuth();
  const {
    disableContextMenu = true,
    disableTextSelection = true,
    disableCopyPaste = true,
    enablePrintOverlay = true,
  } = options;

  useEffect(() => {
    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      if (disableContextMenu) {
        e.preventDefault();
        return false;
      }
    };

    // Disable text selection
    const handleSelectStart = (e: Event) => {
      if (disableTextSelection) {
        e.preventDefault();
        return false;
      }
    };

    // Disable copy/paste/cut
    const handleCopyPaste = (e: ClipboardEvent) => {
      if (disableCopyPaste) {
        e.preventDefault();
        return false;
      }
    };

    // Disable keyboard shortcuts for copy/paste/print/screenshot
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + C, X, V, P (copy, cut, paste, print)
      if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'v', 'p'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        return false;
      }

      // PrintScreen, Windows + PrintScreen
      if (e.key === 'PrintScreen' || (e.metaKey && e.key === 'PrintScreen')) {
        if (enablePrintOverlay) {
          e.preventDefault();
          showPrintWarning();
          return false;
        }
      }
    };

    // Show warning overlay when print screen is detected
    const showPrintWarning = () => {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 24px;
        font-weight: bold;
        text-align: center;
        padding: 20px;
      `;
      overlay.innerHTML = `
        <div>
          <div style="margin-bottom: 20px;">⚠️ Captura de tela detectada</div>
          <div style="font-size: 16px; font-weight: normal;">
            Este conteúdo é protegido e não pode ser copiado.<br/>
            Sua tentativa foi registrada.
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      
      setTimeout(() => {
        document.body.removeChild(overlay);
      }, 3000);
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('cut', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('cut', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [disableContextMenu, disableTextSelection, disableCopyPaste, enablePrintOverlay]);

  return {
    userId: user?.id,
  };
};
