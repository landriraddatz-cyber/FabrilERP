import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { BottomNav, MainTab } from './components/layout/BottomNav';
import { QuickCreateModal, QuickActionType } from './components/modals/QuickCreateModal';
import { AIAssistantModal } from './components/ai/AIAssistantModal';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';

import { DashboardView } from './views/DashboardView';
import { VendasView } from './views/VendasView';
import { ProducaoView } from './views/ProducaoView';
import { FinanceiroView } from './views/FinanceiroView';
import { MaisView, MaisSubView } from './views/MaisView';
import { EstoqueView } from './views/EstoqueView';
import { CadastrosView } from './views/CadastrosView';
import { RelatoriosView } from './views/RelatoriosView';
import { ConfiguracoesView } from './views/ConfiguracoesView';

import { db } from './db';
import { seedSampleData } from './db/seed';
import { DadosEmpresa } from './types';
import { formatCurrency } from './utils/formatters';
import { ArrowLeft } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTab>('inicio');
  const [maisSubView, setMaisSubView] = useState<MaisSubView | null>(null);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [empresa, setEmpresa] = useState<DadosEmpresa | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return (
      localStorage.getItem('fabril_theme') === 'dark' ||
      (!('fabril_theme' in localStorage) &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    );
  });

  const [isReady, setIsReady] = useState(false);
  const [factoryContext, setFactoryContext] = useState<any>(undefined);

  // Synchronize Dark Mode class on <html>
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('fabril_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('fabril_theme', 'light');
    }
  }, [isDarkMode]);

  // Initial startup: Seed sample data if database is fresh, register service worker
  useEffect(() => {
    const init = async () => {
      await seedSampleData(false);
      const emp = await db.empresaConfig.get('empresa_padrao');
      if (emp) setEmpresa(emp);

      // Load summary context for AI Host
      const prodsCount = await db.produtos.count();
      const opsCount = await db.ordensProducao.filter((o) => !o.excluido && o.status !== 'concluida').count();
      const lowStock = await db.produtos.filter((p) => !p.excluido && p.estoqueAtual < p.estoqueMinimo).count();

      setFactoryContext({
        productsCount: prodsCount,
        activeOrdersCount: opsCount,
        lowStockCount: lowStock,
        cashBalance: 'R$ 9.700,00',
        monthSales: 'R$ 640,00',
      });
      setIsReady(true);
    };
    init();

    // Register service worker for PWA
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.warn('SW registration failed:', err);
        });
      });
    }
  }, []);

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const handleReloadAll = async () => {
    const emp = await db.empresaConfig.get('empresa_padrao');
    if (emp) setEmpresa(emp);
    setActiveTab('inicio');
    setMaisSubView(null);
  };

  const handleQuickAction = (action: QuickActionType) => {
    switch (action) {
      case 'novo_pedido':
        setActiveTab('vendas');
        setMaisSubView(null);
        break;
      case 'nova_op':
        setActiveTab('producao');
        setMaisSubView(null);
        break;
      case 'nova_compra':
        setActiveTab('mais');
        setMaisSubView('estoque');
        break;
      case 'novo_lancamento':
        setActiveTab('financeiro');
        setMaisSubView(null);
        break;
      case 'novo_produto':
        setActiveTab('mais');
        setMaisSubView('cadastros');
        break;
      case 'nova_pessoa':
        setActiveTab('mais');
        setMaisSubView('cadastros');
        break;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Navbar */}
      <Navbar
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        onOpenAI={() => setIsAIOpen(true)}
        empresaNome={empresa?.nome}
      />

      {/* Offline Status Badge */}
      <OfflineIndicator />

      {/* Subview Header with Back button if in 'Mais' submenu */}
      {activeTab === 'mais' && maisSubView && (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-between sticky top-14 z-30">
          <button
            onClick={() => setMaisSubView(null)}
            className="flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Mais</span>
          </button>
          <span className="text-xs font-semibold capitalize text-slate-500">
            {maisSubView === 'estoque' && 'Estoque & Materiais'}
            {maisSubView === 'cadastros' && 'Cadastros Gerais'}
            {maisSubView === 'relatorios' && 'Relatórios Fabris'}
            {maisSubView === 'configuracoes' && 'Configurações'}
          </span>
        </div>
      )}

      {/* Main View Router */}
      <main className="flex-1 overflow-x-hidden">
        {!isReady ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-sky-600 flex items-center justify-center text-white shadow-lg mb-3 animate-bounce">
              <span className="font-black text-lg">F</span>
            </div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Iniciando FabrilERP...</h2>
            <p className="text-xs text-slate-400 mt-1">Carregando banco de dados offline IndexedDB</p>
          </div>
        ) : (
          <>
            {activeTab === 'inicio' && (
              <DashboardView
                onNavigateTab={(tab) => {
                  setActiveTab(tab);
                  setMaisSubView(null);
                }}
                onOpenQuickCreate={() => setIsQuickCreateOpen(true)}
                onOpenAI={() => setIsAIOpen(true)}
              />
            )}

            {activeTab === 'vendas' && <VendasView />}

            {activeTab === 'producao' && <ProducaoView />}

            {activeTab === 'financeiro' && <FinanceiroView />}

            {activeTab === 'mais' && (
              <>
                {maisSubView === null && (
                  <MaisView
                    onSelectSubView={(sub) => setMaisSubView(sub)}
                    onOpenAI={() => setIsAIOpen(true)}
                  />
                )}
                {maisSubView === 'estoque' && <EstoqueView />}
                {maisSubView === 'cadastros' && <CadastrosView />}
                {maisSubView === 'relatorios' && <RelatoriosView />}
                {maisSubView === 'configuracoes' && (
                  <ConfiguracoesView
                    isDarkMode={isDarkMode}
                    onToggleTheme={handleToggleTheme}
                    onReloadAllData={handleReloadAll}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Bottom Navigation with 5 tabs and floating action button (+) */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'mais') setMaisSubView(null);
        }}
        onOpenQuickCreate={() => setIsQuickCreateOpen(true)}
      />

      {/* Quick Action Floating Menu Modal */}
      <QuickCreateModal
        isOpen={isQuickCreateOpen}
        onClose={() => setIsQuickCreateOpen(false)}
        onSelectAction={handleQuickAction}
      />

      {/* AI Host Assistant & Live Google Market Search Grounding */}
      <AIAssistantModal
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        factoryContext={factoryContext}
      />
    </div>
  );
}
