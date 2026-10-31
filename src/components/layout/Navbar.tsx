import React from 'react';
import { Factory, Moon, Sun, Sparkles } from 'lucide-react';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

interface NavbarProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenAI: () => void;
  empresaNome?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  isDarkMode,
  onToggleTheme,
  onOpenAI,
  empresaNome,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-sm">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left: Brand & Factory Name */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-inner">
            <Factory className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight leading-none text-white">
              {empresaNome || 'FabrilERP'}
            </h1>
            <span className="text-[10px] text-sky-400 font-medium">Gestão de Pequena Fábrica</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* PWA Install */}
          <PWAInstallButton />

          {/* AI Host / Assistant Button */}
          <button
            onClick={onOpenAI}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-semibold transition"
            title="Abrir Mestre Fabril (IA com Voz e Cotação Google)"
            aria-label="Abrir Assistente IA"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span className="hidden sm:inline">IA Fabril</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title={isDarkMode ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            aria-label="Alternar tema claro e escuro"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
          </button>
        </div>
      </div>
    </header>
  );
};
