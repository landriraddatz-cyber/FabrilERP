import React from 'react';
import {
  Boxes,
  Users,
  FileSpreadsheet,
  Settings,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Factory,
} from 'lucide-react';

export type MaisSubView = 'estoque' | 'cadastros' | 'relatorios' | 'configuracoes';

interface MaisViewProps {
  onSelectSubView: (subview: MaisSubView) => void;
  onOpenAI: () => void;
}

export const MaisView: React.FC<MaisViewProps> = ({
  onSelectSubView,
  onOpenAI,
}) => {
  const items = [
    {
      id: 'estoque' as MaisSubView,
      title: 'Estoque & Materiais',
      subtitle: 'Saldos de insumos e acabados, compras e histórico',
      icon: Boxes,
      color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'cadastros' as MaisSubView,
      title: 'Cadastros Gerais',
      subtitle: 'Clientes, fornecedores, produtos, categorias e contas',
      icon: Users,
      color: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
    },
    {
      id: 'relatorios' as MaisSubView,
      title: 'Relatórios & Desempenho',
      subtitle: 'Lucro por produto, perdas, custos reais e exportação CSV',
      icon: FileSpreadsheet,
      color: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
    },
    {
      id: 'configuracoes' as MaisSubView,
      title: 'Configurações & Backup',
      subtitle: 'Dados da empresa, backup em arquivo JSON e tema',
      icon: Settings,
      color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    },
  ];

  return (
    <div className="p-4 space-y-4 max-w-xl mx-auto pb-28">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Mais Opções</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Módulos complementares do FabrilERP
        </p>
      </div>

      {/* Featured AI Card */}
      <div
        onClick={onOpenAI}
        className="p-4 rounded-2xl bg-gradient-to-r from-sky-900 to-indigo-950 text-white cursor-pointer hover:opacity-95 transition shadow-sm border border-sky-800/40 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/30 flex items-center justify-center text-sky-300">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Mestre Fabril AI (Voz & Cotações)</h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Pesquise cotação de insumos no Google e converse por voz
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
      </div>

      {/* Primary 4 Menu Options */}
      <div className="space-y-2.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onSelectSubView(item.id)}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-sky-500 transition text-left group active:scale-[0.99]"
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-sky-600 transition">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {item.subtitle}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-500 group-hover:translate-x-0.5 transition shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Offline Guarantee Badge */}
      <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-slate-500 flex items-center gap-2.5 text-xs">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
        <span>
          <strong>100% Offline & Seguro:</strong> Seus dados de fábrica ficam armazenados com segurança no seu próprio celular via IndexedDB.
        </span>
      </div>
    </div>
  );
};
