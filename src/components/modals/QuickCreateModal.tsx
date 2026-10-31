import React from 'react';
import { ShoppingCart, Cog, Truck, PackagePlus, DollarSign, UserPlus, X } from 'lucide-react';

export type QuickActionType =
  | 'novo_pedido'
  | 'nova_op'
  | 'nova_compra'
  | 'novo_produto'
  | 'novo_lancamento'
  | 'nova_pessoa';

interface QuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: QuickActionType) => void;
}

export const QuickCreateModal: React.FC<QuickCreateModalProps> = ({
  isOpen,
  onClose,
  onSelectAction,
}) => {
  if (!isOpen) return null;

  const actions = [
    {
      id: 'novo_pedido' as QuickActionType,
      title: 'Venda / Pedido / Orçamento',
      subtitle: 'Registrar orçamento ou pedido de cliente',
      icon: ShoppingCart,
      color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'nova_op' as QuickActionType,
      title: 'Ordem de Produção',
      subtitle: 'Planejar lote para estoque ou encomenda',
      icon: Cog,
      color: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
    },
    {
      id: 'nova_compra' as QuickActionType,
      title: 'Compra de Matéria-Prima',
      subtitle: 'Entrada de insumos e contas a pagar',
      icon: Truck,
      color: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
    },
    {
      id: 'novo_lancamento' as QuickActionType,
      title: 'Lançamento Financeiro',
      subtitle: 'Despesa ou receita avulsa no caixa',
      icon: DollarSign,
      color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    },
    {
      id: 'novo_produto' as QuickActionType,
      title: 'Produto ou Matéria-Prima',
      subtitle: 'Cadastrar novo item ou embalagem',
      icon: PackagePlus,
      color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
    },
    {
      id: 'nova_pessoa' as QuickActionType,
      title: 'Cliente ou Fornecedor',
      subtitle: 'Cadastrar nova pessoa física ou jurídica',
      icon: UserPlus,
      color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 animate-in slide-in-from-bottom-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Criar Registro Rápido</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Escolha a operação desejada</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2.5 max-h-[70vh] overflow-y-auto">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                onClick={() => {
                  onSelectAction(act.id);
                  onClose();
                }}
                className="flex items-center gap-3.5 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-sky-500 dark:hover:border-sky-500 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-sky-50/50 dark:hover:bg-sky-950/20 text-left transition group active:scale-[0.99]"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${act.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition">
                    {act.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{act.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
