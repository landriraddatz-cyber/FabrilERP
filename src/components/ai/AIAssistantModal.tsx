import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Mic, MicOff, Search, Send, X, Volume2, ExternalLink, Bot, Factory } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  factoryContext?: {
    productsCount: number;
    activeOrdersCount: number;
    lowStockCount: number;
    cashBalance: string;
    monthSales: string;
  };
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  sources?: Array<{ title: string; uri: string }>;
  timestamp: string;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  factoryContext,
}) => {
  const [activeTab, setActiveTab] = useState<'advisor' | 'market'>('advisor');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Olá! Sou o Mestre Fabril, seu consultor de produção, custos e suprimentos industriais. Como posso ajudar sua fábrica hoje?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Market Search query state
  const [marketQuery, setMarketQuery] = useState('');
  const [marketCategory, setMarketCategory] = useState('Matéria-Prima');
  const [marketResults, setMarketResults] = useState<{
    text: string;
    sources: Array<{ title: string; uri: string }>;
  } | null>(null);

  // Initialize Web Speech API for voice conversation
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'pt-BR';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
          handleSendMessage(transcript);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [factoryContext]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const speakText = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/[*_#]/g, ''));
      utterance.lang = 'pt-BR';
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Reconhecimento de voz não suportado neste navegador.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const msg = (textToSend || input).trim();
    if (!msg || isLoading) return;

    const userMsg: Message = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text: msg,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/gemini/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          factoryContext,
        }),
      });

      const data = await res.json();
      const assistantText = data.text || 'Entendido. Estou à disposição para mais perguntas.';

      const botMsg: Message = {
        id: 'bot_' + Date.now(),
        sender: 'assistant',
        text: assistantText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
      speakText(assistantText);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot_' + Date.now(),
          sender: 'assistant',
          text: 'Não consegui me conectar no momento. Como o FabrilERP é offline, suas operações de produção continuam funcionando normalmente!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarketSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!marketQuery.trim() || isLoading) return;

    setIsLoading(true);
    setMarketResults(null);

    try {
      const res = await fetch('/api/gemini/market-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: marketQuery,
          category: marketCategory,
        }),
      });

      const data = await res.json();
      setMarketResults({
        text: data.text || 'Nenhum resultado retornado.',
        sources: data.sources || [],
      });
      if (voiceEnabled && data.text) {
        speakText('Encontrei informações de mercado para sua consulta.');
      }
    } catch {
      setMarketResults({
        text: 'Erro ao consultar inteligência de mercado com busca Google. Verifique sua conexão à internet.',
        sources: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-xl h-[85vh] sm:h-[650px] bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-6">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base leading-none">Mestre Fabril AI</h3>
                <span className="text-[10px] font-semibold uppercase bg-sky-500/30 text-sky-300 px-1.5 py-0.5 rounded">
                  Gemini 3.8
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Consultoria de chão de fábrica & Cotação Google</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setVoiceEnabled(!voiceEnabled);
                if (voiceEnabled && 'speechSynthesis' in window) window.speechSynthesis.cancel();
              }}
              className={`p-2 rounded-lg text-xs transition ${
                voiceEnabled ? 'bg-slate-800 text-sky-400' : 'text-slate-500'
              }`}
              title={voiceEnabled ? 'Voz ativada' : 'Voz desativada'}
              aria-label="Alternar voz"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg transition"
              aria-label="Fechar assistente"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-1">
          <button
            onClick={() => setActiveTab('advisor')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'advisor'
                ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Consultor da Fábrica (Voz/Texto)</span>
          </button>
          <button
            onClick={() => setActiveTab('market')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'market'
                ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Cotação de Insumos (Google Search)</span>
          </button>
        </div>

        {/* Tab 1: Advisor Chat */}
        {activeTab === 'advisor' && (
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950/40">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm shadow-xs ${
                      m.sender === 'user'
                        ? 'bg-sky-600 text-white rounded-br-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 rounded-bl-xs leading-relaxed whitespace-pre-wrap'
                    }`}
                  >
                    {m.text}
                    <div
                      className={`text-[10px] mt-1 ${
                        m.sender === 'user' ? 'text-sky-200 text-right' : 'text-slate-400'
                      }`}
                    >
                      {m.timestamp}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2 text-xs text-slate-500 flex items-center gap-2 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
                    <span>Mestre Fabril analisando...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions */}
            <div className="px-3 py-1.5 flex gap-1.5 overflow-x-auto no-scrollbar border-t border-slate-200/60 dark:border-slate-800">
              {[
                'Como calcular meu markup?',
                'Como reduzir perdas na produção?',
                'Dicas para organizar estoque mínimo',
              ].map((sug, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(sug)}
                  className="shrink-0 text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:border-sky-500 transition"
                >
                  {sug}
                </button>
              ))}
            </div>

            {/* Input form with voice button */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2.5 rounded-xl transition flex items-center justify-center ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
                title={isListening ? 'Ouvindo... Toque para parar' : 'Falar por voz'}
                aria-label="Microfone de voz"
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={isListening ? 'Ouvindo sua voz...' : 'Pergunte sobre produção, estoque ou custos...'}
                className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isLoading}
                className="p-2.5 rounded-xl bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-40 transition flex items-center justify-center shadow-xs"
                aria-label="Enviar mensagem"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Market Grounding Search */}
        {activeTab === 'market' && (
          <div className="flex-1 flex flex-col min-h-0 p-4 overflow-y-auto bg-slate-50 dark:bg-slate-950/40">
            <form onSubmit={handleMarketSearch} className="space-y-3 mb-4">
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-sky-500" />
                  <label htmlFor="market-input" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Pesquisa de Mercado & Cotação (Google Search Grounding)
                  </label>
                </div>
                <div className="flex gap-2">
                  <input
                    id="market-input"
                    type="text"
                    value={marketQuery}
                    onChange={(e) => setMarketQuery(e.target.value)}
                    placeholder="Ex: Preço saco 50kg farinha trigo atacado SP"
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <button
                    type="submit"
                    disabled={!marketQuery.trim() || isLoading}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs sm:text-sm rounded-xl disabled:opacity-40 transition shadow-xs flex items-center gap-1.5"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Pesquisar</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-500">Sugestões:</span>
                  {['Farinha de Trigo Especial', 'Açúcar Cristal 50kg', 'Caixa Papelão Kraft'].map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setMarketQuery(s);
                      }}
                      className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </form>

            {/* Results */}
            {isLoading && (
              <div className="text-center py-10 space-y-3">
                <div className="inline-block w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-500">Buscando cotações e fornecedores em tempo real no Google...</p>
              </div>
            )}

            {marketResults && !isLoading && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5 text-sky-600">
                    <Sparkles className="w-3.5 h-3.5" />
                    Diagnóstico de Mercado & Fornecedores
                  </h4>
                  <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {marketResults.text}
                  </div>
                </div>

                {/* Grounding Source Links (MANDATORY when using Google Search Grounding) */}
                {marketResults.sources && marketResults.sources.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Fontes e Distribuidores Consultados no Google
                    </h5>
                    <div className="space-y-1.5">
                      {marketResults.sources.map((src, i) => (
                        <a
                          key={i}
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 text-xs text-sky-600 dark:text-sky-400 hover:bg-slate-100 transition"
                        >
                          <span className="truncate pr-2 font-medium">{src.title || src.uri}</span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
