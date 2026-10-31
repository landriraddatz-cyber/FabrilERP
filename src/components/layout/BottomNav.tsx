import React from 'react';
import { LayoutDashboard, ShoppingCart, Cog, Wallet, MoreHorizontal, Plus } from 'lucide-react';

export type MainTab = 'inicio' | 'vendas' | 'producao' | 'financeiro' | 'mais';

interface BottomNavProps {
  activeTab: MainTab;
  onChangeTab: (tab: MainTab) => void;
  onOpenQuickCreate: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  onOpenQuickCreate,
}) => {
  const tabs = [
    { id: 'inicio' as MainTab, label: 'Início', icon: LayoutDashboard },
    { id: 'vendas' as MainTab, label: 'Vendas', icon: ShoppingCart },
    { id: 'producao' as MainTab, label: 'Produção', icon: Cog },
    { id: 'financeiro' as MainTab, label: 'Financeiro', icon: Wallet },
    { id: 'mais' as MainTab, label: 'Mais', icon: MoreHorizontal },
  ];

  return (
    <>
      {/* Floating Action Button (+) */}
      <button
        onClick={onOpenQuickCreate}
        className="fixed right-4 bottom-20 z-30 w-14 h-14 rounded-full bg-sky-600 hover:bg-sky-500 text-white shadow-xl flex items-center justify-center transition active:scale-95 focus:outline-none focus:ring-4 focus:ring-sky-500/30"
        title="Criar registro rápido (+)"
        aria-label="Criar registro rápido"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Bottom Bar with 5 tabs */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto grid grid-cols-5 h-16">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChangeTab(tab.id)}
                className={`flex flex-col items-center justify-center py-1 transition select-none active:scale-95 ${
                  isActive
                    ? 'text-sky-600 dark:text-sky-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
                }`}
              >
                <Icon className={`w-5 h-5 mb-1 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                <span className="text-[11px] leading-none">{tab.label}</span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-sky-600 dark:bg-sky-400 mt-1" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
