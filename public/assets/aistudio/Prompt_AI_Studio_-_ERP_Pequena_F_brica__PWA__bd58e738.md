# Prompt para o Google AI Studio — ERP de pequena fábrica (PWA no celular)

Copie o prompt abaixo e cole no modo de construir apps do AI Studio. Ele gera um app web instalável, que roda no navegador do celular e guarda os dados no próprio aparelho.

## Prompt principal

```markdown
Crie um aplicativo web mobile-first (PWA instalável) de ERP para uma pequena fábrica, em português do Brasil, para uso de uma única pessoa no celular. Tudo deve funcionar offline, sem servidor e sem login. Os dados ficam no aparelho, em IndexedDB (use a biblioteca Dexie). Moeda em reais (R$), datas no formato dd/mm/aaaa.

O negócio: compro matéria-prima, fabrico produtos e vendo. Produzo para estoque e, às vezes, sob encomenda.

INTERFACE
- Layout mobile-first, botões grandes, barra de navegação inferior com 5 abas: Início, Vendas, Produção, Financeiro e Mais.
- A aba Mais abre: Estoque, Cadastros, Relatórios e Configurações.
- Visual limpo, cores sóbrias, modo claro e escuro, botão flutuante (+) para criar registros rápidos.
- Formulários curtos: poucos campos obrigatórios, o resto opcional.

CADASTROS
- Pessoas: nome, tipo (pessoa física ou jurídica), CPF/CNPJ, telefone, WhatsApp, endereço, observações, marcadores cliente e fornecedor (a mesma pessoa pode ser os dois).
- Produtos: tipo (matéria-prima, produto acabado, embalagem, revenda, serviço), código, nome, categoria, unidade, preço de custo, preço de venda, estoque mínimo, estoque atual.
- Categorias de produto.
- Formas de pagamento (já vêm: Dinheiro, Pix, Cartão, Boleto, Prazo) e contas (já vem: Caixa).

PRODUÇÃO
- Ficha técnica (receita) por produto acabado: rendimento, perda percentual e lista de insumos com quantidade por receita. Mostrar o custo calculado da ficha.
- Ordem de produção: tipo (para estoque ou sob encomenda), produto, ficha técnica, quantidade planejada, data prevista, status (planejada, em produção, concluída, cancelada).
- Ao criar a ordem, mostrar a necessidade de cada matéria-prima e avisar se o estoque não cobre.
- Ao concluir a ordem: informar quantidade produzida e consumo real; o app dá baixa nas matérias-primas, dá entrada no produto acabado e calcula o custo unitário real (matéria-prima consumida + custos adicionais como mão de obra, energia e embalagem, dividido pela quantidade produzida). Atualizar o preço de custo do produto.
- Mostrar a diferença entre consumo previsto e real (perdas).

VENDAS
- Orçamentos: cliente, itens, desconto, validade, status (rascunho, enviado, aprovado, recusado). Converter orçamento em pedido com um toque.
- Pedidos: cliente, itens, desconto, frete, forma de pagamento, número de parcelas, data de entrega prevista, status (aberto, em produção, faturado, entregue, cancelado).
- Em cada item do pedido, escolher a origem: sai do estoque ou vai para produção. Se for produção, criar automaticamente uma ordem de produção sob encomenda ligada ao pedido.
- Ao faturar o pedido: baixar o estoque dos itens de estoque, gerar as contas a receber (uma por parcela) e registrar o custo da venda.
- Gerar o orçamento ou pedido em PDF ou imagem para compartilhar pelo WhatsApp (use a Web Share API).

COMPRAS E ESTOQUE
- Compras de matéria-prima: fornecedor, itens, custo, parcelas. Ao receber: dar entrada no estoque, atualizar o custo médio e gerar as contas a pagar.
- Tela de estoque: saldo por produto, alerta visível de produtos abaixo do mínimo, histórico de movimentos (entrada, saída, ajuste) e ajuste manual com motivo.
- Todo movimento de estoque é registrado como lançamento; o saldo é a soma dos movimentos.

FINANCEIRO
- Contas a receber e contas a pagar: descrição, parcela, valor, vencimento, status. Destacar em vermelho as vencidas e em amarelo as que vencem em 7 dias.
- Baixar uma conta (pagar ou receber) escolhendo a conta e a data; isso gera um movimento financeiro.
- Fluxo de caixa: saldo atual por conta e projeção das próximas semanas.
- Lançamento avulso de despesa ou receita.

INÍCIO (painel)
- Cartões: vendas do mês, a receber, a pagar, saldo em caixa, lucro bruto do mês.
- Listas curtas: contas que vencem hoje, ordens de produção em andamento, produtos abaixo do estoque mínimo.

RELATÓRIOS
- Vendas por período, lucro por produto (preço de venda menos custo real), custo real versus custo padrão, consumo de matéria-prima, perdas de produção, contas em atraso, ranking de clientes. Botão para exportar em CSV.

CONFIGURAÇÕES
- Dados da empresa (nome, CNPJ ou CPF, telefone, logo).
- Backup: botão Fazer backup agora (baixa um arquivo JSON com todos os dados), botão Restaurar backup (carrega o arquivo, com confirmação) e uma chave Backup automático, desligada por padrão, que por enquanto só lembra o usuário de exportar toda semana (a integração com o Google Drive entra depois).
- Alternar tema claro e escuro.

REGRAS TÉCNICAS
- Exclusão lógica: nunca apagar de verdade, marcar como excluído.
- Valores monetários guardados em centavos (número inteiro) para evitar erro de arredondamento.
- Cada registro com id, data de criação e data de alteração.
- Operações que mexem em estoque e financeiro devem ser feitas de forma atômica (tudo ou nada).
- Incluir manifest e service worker para instalar na tela inicial e funcionar offline.
- Carregar dados de exemplo (3 clientes, 5 matérias-primas, 2 produtos acabados com ficha técnica) por um botão em Configurações, para testar.
```

## Como usar

1. Abra o Google AI Studio no navegador do celular e entre no modo de construir apps (Build).
2. Cole o prompt principal e envie. Aguarde a geração.
3. Teste o app na própria prévia e vá pedindo ajustes em pequenos passos.
4. Quando estiver bom, publique ou exporte e adicione à tela inicial do celular para usar como app.

## Prompts de ajuste (use depois, um de cada vez)

O AI Studio funciona melhor quando você pede uma mudança por vez. Sugestões de sequência:

1. "Teste o fluxo completo: compre matéria-prima, crie uma ficha técnica, produza e venda. Corrija qualquer erro de estoque ou financeiro que aparecer."
2. "Deixe os formulários mais rápidos: preencher o preço automaticamente ao escolher o produto e lembrar o último cliente usado."
3. "Adicione busca e filtros em todas as listas."
4. "Adicione a integração de backup com o Google Drive, usando login do Google, e ligue à chave de backup automático das configurações."
5. "Adicione a leitura de código de barras pela câmera no cadastro de produtos e nas vendas."

## Limites que vale conhecer

- Os dados ficam no navegador do celular. Se você limpar os dados do navegador ou trocar de aparelho sem backup, perde tudo. Por isso o backup em arquivo é parte essencial do prompt.
- É um app web instalável, não um app Android nativo em Flutter. Serve muito bem para testar o fluxo e as telas, e o modelo de dados é o mesmo do documento do Drift.
- Se o prompt gerar algo grande demais e travar, divida: peça primeiro cadastros e vendas, e depois produção, financeiro e relatórios.
