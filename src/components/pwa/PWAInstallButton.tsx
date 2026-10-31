import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { Download, Share2, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-2.5 py-1.5 shadow-sm transition"
        title="Instalar aplicativo na tela inicial"
        aria-label="Instalar aplicativo"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Instalar App</span>
        <span className="sm:hidden">Instalar</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium px-2.5 py-1.5 transition"
          title="Instalar no iPhone"
          aria-label="Instalar no iOS"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Instalar PWA</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Instalar no iPhone / iPad</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                  aria-label="Fechar guia de instalação"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
                1. Toque no botão de <strong>Compartilhar</strong> na barra do Safari.<br />
                2. Role para baixo e toque em <strong>Adicionar à Tela de Início</strong>.<br />
                3. O app funcionará em tela cheia mesmo sem internet!
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl bg-sky-600 text-white font-medium py-2.5 text-sm hover:bg-sky-500 transition"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
