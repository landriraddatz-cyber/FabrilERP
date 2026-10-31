import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Initialize GoogleGenAI server-side client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint for Search Grounding with Gemini 3.8 Flash (e.g., cotacao de insumos, precos de materias-primas, fornecedores)
app.post('/api/gemini/market-search', async (req, res) => {
  try {
    const { query, category } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const prompt = `Como especialista em compras e suprimentos para pequenas indústrias no Brasil:
Pesquise informações atualizadas no mercado brasileiro sobre: "${query}" (categoria: ${category || 'Geral'}).
Inclua:
1. Faixa média estimada de preços de mercado no atacado/varejo em R$.
2. Dicas de negociação e compra de lote.
3. Principais tipos de fornecedores ou distribuidores recomendados no Brasil.
4. Cuidados técnicos ao receber essa matéria-prima ou insumo.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: 'Você é um consultor técnico de suprimentos industriais e compras para pequenas fábricas brasileiras. Seja conciso, direto e prático.',
      },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const searchSources = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title,
        uri: chunk.web.uri,
      }));

    res.json({
      text: response.text || 'Não foi possível obter dados no momento.',
      sources: searchSources,
    });
  } catch (error: any) {
    console.error('Error in market-search:', error);
    res.status(500).json({
      error: error.message || 'Erro ao consultar inteligência de mercado.',
      text: 'O serviço de busca de mercado requer conexão online ativa. Tente novamente em instantes.',
      sources: [],
    });
  }
});

// Endpoint for Factory AI Advisor / Copilot
app.post('/api/gemini/advisor', async (req, res) => {
  try {
    const { message, factoryContext } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const contextSummary = factoryContext
      ? `Dados da fábrica do usuário:
- Produtos cadastrados: ${factoryContext.productsCount || 0}
- Ordens ativas: ${factoryContext.activeOrdersCount || 0}
- Produtos abaixo do estoque mínimo: ${factoryContext.lowStockCount || 0}
- Saldo em caixa: ${factoryContext.cashBalance || 'R$ 0,00'}
- Vendas do mês: ${factoryContext.monthSales || 'R$ 0,00'}`
      : 'Sem dados específicos de contexto.';

    const prompt = `${contextSummary}\n\nPergunta do gestor da fábrica: "${message}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: `Você é o "Mestre Fabril", assistente sênior especialista em chão de fábrica, PCP, engenharia de produto, custos industriais e gestão para micro e pequenas fábricas no Brasil.
Responda de forma prática, motivadora, técnica e clara. Use termos em português (R$, fichas técnicas, insumos, perdas, markup).`,
      },
    });

    res.json({
      text: response.text || 'Sem resposta disponível.',
    });
  } catch (error: any) {
    console.error('Error in advisor:', error);
    res.status(500).json({
      error: error.message || 'Erro ao consultar assistente.',
      text: 'Assistente temporariamente indisponível. Verifique sua conexão.',
    });
  }
});

// Mount Vite middleware in development or serve static in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`FabrilERP server listening on port ${port} (${isDev ? 'dev' : 'production'})`);
  });
}

startServer();
