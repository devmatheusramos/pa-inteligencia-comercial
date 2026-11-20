# 2.3 Sprint 3 — rascunho (linguagem direta, uma prova por afirmação)

Prints em `evidencias/prints/sprint3/`. Onde estiver [PREENCHER], falta uma medição ou um print que só existe depois do trabalho.

## 2.3.1 Solução

Período: 16/11/2026 a 22/11/2026 (dias 15 a 21).
Objetivo: entregar o painel para gestor e vendedor, medir se o sistema funciona de verdade (acerto da IA e tempo economizado) e fechar a documentação.

### Planejamento
Na abertura da sprint, os 4 cartões foram movidos para "Em andamento".
*Figura 24: quadro do Notion no início da Sprint 3.* [PREENCHER: print]

---

### 00009 — Painel do gestor e visão do vendedor

**O que era pedido.** Uma tela em que o gestor veja a situação das negociações da equipe sem ler conversa por conversa, e em que cada vendedor veja só a própria carteira.

**O que foi feito.** Criei um painel com duas versões. O gestor abre e vê, de cima para baixo: os números do dia, o funil de vendas, as conversas mais urgentes, todas as conversas organizadas por etapa e o desempenho de cada vendedor. A vendedora vê outra tela, feita para o trabalho dela: uma lista do que fazer hoje, sem comparação com os colegas. A tela é dividida por três "agentes", cada um cuidando de uma parte: o Vigia (o que é urgente e em que etapa cada conversa está), o Cronômetro (tempo de resposta) e o Leitor (de onde vêm as conversas).

**Provas.**

1. Os números que o gestor vê ao abrir o sistema.
   *Figura 25: (1) seis indicadores: 20 negociações abertas, 11 pedem atenção, 8 pendências de vendedores, 8 clientes esperando resposta, tempo médio de resposta de 18 minutos e conversão de 50% (5 vendas ganhas e 5 perdidas).*
   `s3-01-gestor-indicadores.png`

2. O funil e o que é mais urgente.
   *Figura 26: (1) quantas conversas há em cada etapa de venda, de prospecção a perdido; (2) a conversa mais urgente, com um resumo de duas linhas, as últimas mensagens e o próximo passo sugerido.*
   `s3-02-gestor-funil-e-urgentes.png`

3. Todas as conversas, uma coluna por etapa.
   *Figura 27: (1) a coluna da etapa "Negociação", com 5 conversas; (2) cada cartão mostra o vendedor, o canal de origem (WhatsApp), um resumo, o que falta fazer e o tempo de resposta.*
   `s3-03-gestor-conversas-por-etapa.png`

4. Abrindo uma conversa.
   *Figura 28: (1) resumo gerado pela IA; (2) próximo passo sugerido; (3) a mensagem do cliente com CPF, e-mail e CEP já escondidos (aparecem como [CPF], [EMAIL] e [CEP]). Nome e endereço ainda aparecem: é a falha que será corrigida no ticket 00011.*
   `s3-04-conversa-aberta.png`

5. Quem responde mais rápido.
   *Figura 29: (1) desempenho por vendedor: Ana Paula responde em média em 9 minutos e Bruno em 27; Bruno tem 5 pendências e 4 clientes esperando, Ana tem 3 pendências e 4 esperando.*
   `s3-05-gestor-desempenho-por-vendedor.png`

6. A tela da vendedora.
   *Figura 30: (1) os cinco números dela: 4 clientes para responder agora, 3 pendências, tempo médio de 9 minutos, 10 em negociação e 3 vendas fechadas; (2) a lista "Para fazer hoje", com o mais urgente primeiro.*
   `s3-06-vendedora-hoje.png`

7. Ela só vê a própria carteira.
   *Figura 31: (1) ela entrou como "Vendedora Ana Paula"; (2) vê 15 conversas, as dela. O gestor vê as 30 (Figura 25).*
   `s3-07-vendedora-so-a-dela.png`

**Resultado.** O painel funciona com as 30 conversas de teste. As etapas, os resumos e os próximos passos vêm da IA e continuam marcados como "a validar".

---

### 00010 — Medir o acerto da IA e o tempo economizado

**O que era pedido.** Provar com números se o sistema atinge as duas metas: acertar a etapa da venda em pelo menos 85% das conversas e reduzir em pelo menos 79% o tempo que o gestor leva para acompanhar a equipe.

**O que foi feito.** [PREENCHER depois das medições]

**Provas.**

1. Acerto da IA na etapa da venda.
   Das 30 conversas de teste, a IA acertou a etapa de 27: **90%, acima da meta de 85%**. Errou 3 casos: duas conversas que ela viu como "prospecção" e eram "qualificação", e uma que ela viu como "proposta" e era "negociação".
   *Figura 32:* [PREENCHER: print da tabela conversa a conversa, com o gabarito ao lado]

2. Acerto nas pendências.
   Quando a IA aponta uma pendência, acerta em cerca de 9 de cada 10 vezes. Mas ela só encontra cerca de 3 de cada 10 pendências que existem de verdade. Ou seja: o que ela mostra costuma estar certo, mas falta mostrar muita coisa. Fica registrado como limitação. (conta preliminar, a refinar)

3. Tempo que o gestor leva para acompanhar a equipe.
   Sem o painel: [PREENCHER] minutos. Com o painel: [PREENCHER] minutos. Redução: [PREENCHER]% (meta: 79%).
   *Figura 33:* [PREENCHER: print do resultado das duas medições]

**Resultado.** [PREENCHER]

---

### 00011 — Corrigir o mais grave e documentar

**O que era pedido.** Consertar o que bloqueia o uso ou expõe dados, atualizar a documentação da arquitetura e registrar resultados, custos, limitações e próximos passos.

**O que foi feito.** [PREENCHER]

**Provas.**
- Correção: [PREENCHER: print antes e depois do mascaramento de nome e endereço]
- Custo real da IA durante o projeto: [PREENCHER]
- Documento da arquitetura atualizado: [PREENCHER: link]

---

### 00012 — Colocar na AWS (desejável)

Não foi feito. O sistema roda no computador e a AWS fica como próximo passo, com o desenho e a estimativa de custo já prontos desde a Sprint 1.

## 2.3.2 Lições aprendidas

- **Painel (00009):** a primeira versão tinha cara de brinquedo e não de ferramenta de gestão; refiz com os números no topo e tabelas. Também aprendi a desenhar duas telas diferentes, porque o gestor e a vendedora precisam de coisas diferentes.
- **Medição (00010):** [PREENCHER]
- **Correção e documentação (00011):** [PREENCHER]
