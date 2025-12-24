import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ContentProtectionOptions {
  disableContextMenu?: boolean;
  disableTextSelection?: boolean;
  disableCopyPaste?: boolean;
  enablePrintOverlay?: boolean;
}

export const useContentProtection = (options: ContentProtectionOptions = {}) => {
  const { user } = useAuth();
  const location = useLocation();
  
  // Disable protection on admin routes
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  const {
    disableContextMenu = !isAdminRoute,
    disableTextSelection = !isAdminRoute,
    disableCopyPaste = !isAdminRoute,
    enablePrintOverlay = !isAdminRoute,
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

    // Helper to check if target is an input element
    const isInputElement = (target: EventTarget | null): boolean => {
      if (!target) return false;
      const el = target as HTMLElement;
      return el.tagName === 'INPUT' || 
             el.tagName === 'TEXTAREA' ||
             el.isContentEditable;
    };

    // Disable copy/paste/cut (except in input elements)
    const handleCopyPaste = (e: ClipboardEvent) => {
      if (disableCopyPaste && !isInputElement(e.target)) {
        e.preventDefault();
        return false;
      }
    };

    // Disable keyboard shortcuts for copy/paste/print/screenshot
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow copy/paste/cut in input elements
      if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'v'].includes(e.key.toLowerCase())) {
        if (isInputElement(e.target)) return; // Allow action in inputs
        if (disableCopyPaste) {
          e.preventDefault();
          return false;
        }
      }
      
      // Block print (Ctrl+P) unless in admin
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
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
