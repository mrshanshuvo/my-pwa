'use client';

import { useEffect, useState } from 'react';

export default function PwaUpdatePrompt() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Limit prompt solely to mobile screen dimensions (< 768px)
      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      if (!isMobile) return;

      // Handle clean reload once the new service worker has activated and taken control
      let refreshing = false;
      const handleControllerChange = () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      };
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);

        // Detect if there's already a waiting worker from a previous background check
        if (reg.waiting) {
          setShowPrompt(true);
        }

        // Listen for new service worker installation cycles
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setShowPrompt(true);
              }
            });
          }
        });
      });

      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      };
    }
  }, []);

  const handleUpdate = () => {
    if (registration && registration.waiting) {
      // Signals the waiting service worker to skipWaiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  if (!showPrompt) return null;

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from {
            transform: translate3d(0, 100%, 0);
            opacity: 0;
          }
          to {
            transform: translate3d(0, 0, 0);
            opacity: 1;
          }
        }
        .pwa-prompt-container {
          position: fixed;
          bottom: 24px;
          left: 16px;
          right: 16px;
          background: rgba(18, 18, 20, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #ffffff;
          padding: 16px 20px;
          borderRadius: 16px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .pwa-prompt-text {
          font-size: 14px;
          font-weight: 500;
          line-height: 1.4;
          letter-spacing: -0.01em;
          color: rgba(255, 255, 255, 0.95);
        }
        .pwa-prompt-button {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: #ffffff;
          border: none;
          padding: 10px 18px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
          white-space: nowrap;
        }
        .pwa-prompt-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4);
          background: linear-gradient(135deg, #5a52e8 0%, #8746ef 100%);
        }
        .pwa-prompt-button:active {
          transform: translateY(1px);
          box-shadow: 0 2px 6px rgba(79, 70, 229, 0.3);
        }
      `}</style>
      <div className="pwa-prompt-container">
        <span className="pwa-prompt-text">
          A fresh version is available!
        </span>
        <button onClick={handleUpdate} className="pwa-prompt-button">
          Update Now
        </button>
      </div>
    </>
  );
}
