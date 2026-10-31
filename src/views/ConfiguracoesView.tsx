import React, { useState, useEffect } from 'react';
import {
  Building2,
  Database,
  Upload,
  Download,
  RotateCcw,
  Sun,
  Moon,
  CheckCircle,
  AlertTriangle,
  Bell,
  Sparkles,
} from 'lucide-react';
import { db } from '../db';
import { seedSampleData } from '../db/seed';
import { DadosEmpresa } from '../types';
import { todayIsoDate } from '../utils/formatters';

interface ConfiguracoesViewProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onReloadAllData: () => void;
}

export const ConfiguracoesView: React.FC<ConfiguracoesViewProps> = ({
  isDarkMode,
  onToggleTheme,
  onReloadAllData,
}) => {
  const [empresa, setEmpresa] = useState<DadosEmpresa>({
    nome: '',
    cpfCnpj: '',
    telefone: '',
    whatsapp: '',
    endereco: '',
    email: '',
    lembreteBackupSemanal: false,
    ultimoBackup: '',
  });

  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [carregandoSeed, setCarregandoSeed] = useState(false);

  const carregarConfig = async () => {
    const config = await db.empresaConfig.get('empresa_padrao');
    if (config) {
      setEmpresa(config);
    }
  };

  useEffect(() => {
    carregarConfig();
  }, []);

  const handleSalvarEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.empresaConfig.put({
      id: 'empresa_padrao',
      ...empresa,
    });
    setMensagemSucesso('Dados da empresa salvos com sucesso!');
    setTimeout(() => setMensagemSucesso(''), 3000);
  };

  // 1. Fazer Backup Agora (Export JSON)
  const handleFazerBackup = async () => {
    try {
      const backupData = {
        versao: 1,
        geradoEm: new Date().toISOString(),
        empresaConfig: await db.empresaConfig.toArray(),
        pessoas: await db.pessoas.toArray(),
        produtos: await db.produtos.toArray(),
        categorias: await db.categorias.toArray(),
        fichasTecnicas: await db.fichasTecnicas.toArray(),
        ordensProducao: await db.ordensProducao.toArray(),
        vendas: await db.vendas.toArray(),
        compras: await db.compras.toArray(),
        movimentosEstoque: await db.movimentosEstoque.toArray(),
        contasFinanceiras: await db.contasFinanceiras.toArray(),
        contasBancarias: await db.contasBancarias.toArray(),
        formasPagamento: await db.formasPagamento.toArray(),
        planoContas: await db.planoContas.toArray(),
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_fabrilerp_${todayIsoDate()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Atualiza data do último backup
      const hoje = todayIsoDate();
      setEmpresa((prev) => ({ ...prev, ultimoBackup: hoje }));
      await db.empresaConfig.update('empresa_padrao', { ultimoBackup: hoje });

      setMensagemSucesso('Arquivo de backup baixado com sucesso!');
      setTimeout(() => setMensagemSucesso(''), 3000);
    } catch (err: any) {
      alert('Erro ao gerar backup: ' + err.message);
    }
  };

  // 2. Restaurar Backup (Import JSON)
  const handleRestaurarBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!window.confirm('Atenção: Restaurar um backup substituirá os dados atuais pelo arquivo selecionado. Deseja continuar?')) {
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);

        await db.transaction('rw', [
          db.pessoas,
          db.produtos,
          db.categorias,
          db.fichasTecnicas,
          db.ordensProducao,
          db.vendas,
          db.compras,
          db.movimentosEstoque,
          db.contasFinanceiras,
          db.contasBancarias,
          db.formasPagamento,
          db.planoContas,
          db.empresaConfig,
        ], async () => {
          if (data.empresaConfig) {
            await db.empresaConfig.clear();
            await db.empresaConfig.bulkAdd(data.empresaConfig);
          }
          if (data.pessoas) {
            await db.pessoas.clear();
            await db.pessoas.bulkAdd(data.pessoas);
          }
          if (data.produtos) {
            await db.produtos.clear();
            await db.produtos.bulkAdd(data.produtos);
          }
          if (data.categorias) {
            await db.categorias.clear();
            await db.categorias.bulkAdd(data.categorias);
          }
          if (data.fichasTecnicas) {
            await db.fichasTecnicas.clear();
            await db.fichasTecnicas.bulkAdd(data.fichasTecnicas);
          }
          if (data.ordensProducao) {
            await db.ordensProducao.clear();
            await db.ordensProducao.bulkAdd(data.ordensProducao);
          }
          if (data.vendas) {
            await db.vendas.clear();
            await db.vendas.bulkAdd(data.vendas);
          }
          if (data.compras) {
            await db.compras.clear();
            await db.compras.bulkAdd(data.compras);
          }
          if (data.movimentosEstoque) {
            await db.movimentosEstoque.clear();
            await db.movimentosEstoque.bulkAdd(data.movimentosEstoque);
          }
          if (data.contasFinanceiras) {
            await db.contasFinanceiras.clear();
            await db.contasFinanceiras.bulkAdd(data.contasFinanceiras);
          }
          if (data.contasBancarias) {
            await db.contasBancarias.clear();
            await db.contasBancarias.bulkAdd(data.contasBancarias);
          }
          if (data.formasPagamento) {
            await db.formasPagamento.clear();
            await db.formasPagamento.bulkAdd(data.formasPagamento);
          }
          if (data.planoContas) {
            await db.planoContas.clear();
            await db.planoContas.bulkAdd(data.planoContas);
          }
        });

        alert('Backup restaurado com sucesso!');
        await carregarConfig();
        onReloadAllData();
      } catch (err: any) {
        alert('Erro ao restaurar backup: Arquivo inválido ou corrompido.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // 3. Resetar com Dados de Exemplo (Seed)
  const handleCarregarDadosExemplo = async () => {
    if (!window.confirm('Carregar dados de teste (3 clientes, 5 matérias-primas, 2 produtos acabados com ficha técnica)? Isso redefinirá a base com dados de exemplo.')) {
      return;
    }

    setCarregandoSeed(true);
    try {
      await seedSampleData(true);
      await carregarConfig();
      onReloadAllData();
      alert('Dados de exemplo carregados com sucesso! Você pode testar todo o ciclo fabril.');
    } catch (err: any) {
      alert('Erro ao carregar dados: ' + err.message);
    } finally {
      setCarregandoSeed(false);
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-xl mx-auto pb-28">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Configurações & Backup</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Dados da fábrica, segurança em IndexedDB e tema
        </p>
      </div>

      {mensagemSucesso && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{mensagemSucesso}</span>
        </div>
      )}

      {/* Card 1: Tema Claro e Escuro */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">Tema do Aplicativo</h3>
          <p className="text-[11px] text-slate-500">Alternar entre modo claro e escuro</p>
        </div>
        <button
          onClick={onToggleTheme}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 transition"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          <span>{isDarkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
        </button>
      </div>

      {/* Card 2: Dados da Empresa */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Building2 className="w-4 h-4 text-sky-500" />
          Dados da Empresa (Fábrica)
        </h3>

        <form onSubmit={handleSalvarEmpresa} className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
              Nome da Fábrica / Razão Social
            </label>
            <input
              type="text"
              required
              value={empresa.nome}
              onChange={(e) => setEmpresa({ ...empresa, nome: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                CNPJ ou CPF
              </label>
              <input
                type="text"
                value={empresa.cpfCnpj}
                onChange={(e) => setEmpresa({ ...empresa, cpfCnpj: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                value={empresa.whatsapp}
                onChange={(e) => setEmpresa({ ...empresa, whatsapp: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
              Endereço da Fábrica
            </label>
            <input
              type="text"
              value={empresa.endereco}
              onChange={(e) => setEmpresa({ ...empresa, endereco: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition shadow-xs"
          >
            Salvar Dados da Empresa
          </button>
        </form>
      </div>

      {/* Card 3: Backup & Segurança Offline */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-500" />
          Backup & Segurança dos Dados
        </h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Como o aplicativo funciona 100% offline, todos os dados ficam salvos no IndexedDB do seu navegador. Exporte um backup em arquivo JSON regularmente para não perder seus registros.
        </p>

        {empresa.ultimoBackup && (
          <div className="text-[11px] text-slate-500">
            Último backup realizado: <strong>{empresa.ultimoBackup}</strong>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleFazerBackup}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 rounded-xl font-bold text-xs transition shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Fazer Backup Agora</span>
          </button>

          <label className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-800 dark:text-slate-200 cursor-pointer transition">
            <Upload className="w-4 h-4" />
            <span>Restaurar Backup</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleRestaurarBackup}
              className="hidden"
            />
          </label>
        </div>

        {/* Chave Backup Automático (Lembrete Semanal) */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              Lembrete de Backup Semanal
            </span>
            <span className="text-[10px] text-slate-500">
              Alerta semanalmente para salvar uma cópia no seu aparelho
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={empresa.lembreteBackupSemanal}
              onChange={async (e) => {
                const val = e.target.checked;
                setEmpresa({ ...empresa, lembreteBackupSemanal: val });
                await db.empresaConfig.update('empresa_padrao', {
                  lembreteBackupSemanal: val,
                });
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
          </label>
        </div>
      </div>

      {/* Card 4: Carregar Dados de Demonstração */}
      <div className="bg-slate-100/80 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
          Dados de Teste e Demonstração
        </h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Carrega dados completos de uma pequena fábrica (3 clientes, 5 matérias-primas, 2 produtos acabados com ficha técnica e ordens de produção) para teste imediato.
        </p>
        <button
          onClick={handleCarregarDadosExemplo}
          disabled={carregandoSeed}
          className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${carregandoSeed ? 'animate-spin' : ''}`} />
          <span>{carregandoSeed ? 'Carregando...' : 'Carregar Dados de Exemplo'}</span>
        </button>
      </div>
    </div>
  );
};
