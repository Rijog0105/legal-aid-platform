import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Smartphone, Download, Share, X } from 'lucide-react';

const DISMISSAL_KEY = 'pwa_prompt_dismissed_at';
const DISMISSAL_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

export function InstallPromptCard() {
  const { roleName, isAuthenticated } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 1. Standalone / PWA running detection
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      console.info('[InstallPrompt] App is already running in standalone mode.');
      return;
    }

    // 2. Auth check
    if (!isAuthenticated) {
      return;
    }

    // 3. Dismissal period check
    const dismissedAt = localStorage.getItem(DISMISSAL_KEY);
    if (dismissedAt) {
      const timeSinceDismissal = Date.now() - parseInt(dismissedAt, 10);
      if (timeSinceDismissal < DISMISSAL_DURATION) {
        console.info('[InstallPrompt] Prompt is currently dismissed under the 30-day grace period.');
        return;
      }
    }

    // 4. iOS detection
    const userAgent = window.navigator.userAgent;
    const isIphoneOrIpad = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);

    if (isIphoneOrIpad) {
      setIsIos(true);
      if (isSafari) {
        // Show manual instructions after a short delay on iOS Safari
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
      return;
    }

    // 5. Chromium / Android beforeinstallprompt handling
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      console.info('[InstallPrompt] beforeinstallprompt event captured');
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isAuthenticated, roleName]);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem(DISMISSAL_KEY, Date.now().toString());
    console.info('[InstallPrompt] User dismissed prompt. Graced for 30 days.');
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.info(`[InstallPrompt] User decision outcome: ${outcome}`);
    } catch (err) {
      console.error('[InstallPrompt] Error triggering browser install prompt:', err);
    } finally {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50 transition-all duration-300 animate-slide-in">
      {/* Header and Close Icon */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
          <Smartphone className="h-5 w-5" />
          <h4 className="font-semibold text-gray-900 dark:text-white">Install Legal Aid Camp</h4>
        </div>
        <button 
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
        Add Legal Aid Camp to your Home Screen for quick access in the field.
      </p>

      {/* Conditional Action UI */}
      {isIos ? (
        <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 rounded-md p-3 text-xs text-indigo-700 dark:text-indigo-300 flex items-start space-x-2">
          <Share className="h-4 w-4 mt-0.5 flex-shrink-0 text-indigo-500" />
          <div>
            To install on iOS: Tap Safari's <span className="font-semibold">Share</span> icon, then select <span className="font-semibold">Add to Home Screen</span>.
          </div>
        </div>
      ) : (
        <div className="flex space-x-3">
          <button
            onClick={handleInstallClick}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium py-2 px-4 rounded text-sm flex items-center justify-center space-x-2 shadow-sm transition"
          >
            <Download className="h-4 w-4" />
            <span>Install App</span>
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium py-2 px-4 rounded text-sm transition"
          >
            Not now
          </button>
        </div>
      )}
    </div>
  );
}
