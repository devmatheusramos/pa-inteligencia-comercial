# Escopo do MVP, etapas de venda, indicadores e plano de validação

Ticket 00001 · Sprint 1 · Projeto Aplicado — Plataforma de inteligência comercial para equipes de vendas via WhatsApp

## 1. Escopo do MVP (21 dias)

| Classificação | Item | Sprint |
|---|---|---|
| **Essencial** | Recebimento das mensagens do WhatsApp **somente leitura** (cliente e vendedor) | 2 |
| **Essencial** | Mascaramento de dados pessoais antes de gravar e antes de enviar ao LLM | 2 |
| **Essencial** | Vínculo de cada conversa ao vendedor dono do número | 2 |
| **Essencial** | Análise da conversa por LLM: etapa, pendências e próximo passo | 2 |
| **Essencial** | Cálculo do tempo de resposta por vendedor | 2 |
| **Essencial** | Controle de acesso por perfil (gestor vê a equipe; vendedor vê só a própria carteira) | 2 |
| **Essencial** | Painel do gestor e visão do vendedor | 3 |
| **Essencial** | Validação com conversas simuladas e gabarito | 2–3 |
| Desejável | Alertas de follow-up atrasado | 3, se houver tempo |
| Desejável | Sentimento do cliente e taxa de conversão por vendedor | 3, se houver dado e tempo |
| Desejável | Implantação na AWS com monitoramento de custo | 3, se o prazo permitir |
| **Fora do MVP** | Envio automático de mensagens (a integração é só leitura) | — |
| **Fora do MVP** | Teste com usuários e empresas reais (validação futura) | — |
| **Fora do MVP** | Integração com CRM/ERP de terceiros, app mobile, múltiplas empresas (multi-tenant completo) | — |

## 2. Etapas de venda (lista fechada)

A etapa de uma conversa é a **mais avançada atingida até a última mensagem**. A IA só pode responder um destes seis valores.

| Código | Etapa | Definição | Exemplo de mensagem que caracteriza |
|---|---|---|---|
| `prospeccao` | Prospecção | Primeiro contato. Ainda não se sabe a necessidade do cliente. | "Oi, vi o anúncio de vocês no Instagram, vocês atendem em Olinda?" |
| `qualificacao` | Qualificação | Vendedor levanta necessidade, quantidade, prazo ou orçamento. Nenhum preço concreto enviado. | "Quantas pessoas vão ser no evento e qual a data?" |
| `proposta` | Proposta enviada | Vendedor enviou preço, orçamento ou condições concretas. Cliente ainda não contestou nem aceitou. | "Fica R$ 2.400 em 3x sem juros, entrega em 10 dias." |
| `negociacao` | Negociação | Cliente levantou objeção (preço, prazo, concorrente, pagamento) ou pediu ajuste, e a conversa segue aberta. | "Achei caro, o concorrente fez por 2.100." |
| `fechado_ganho` | Fechado (ganho) | Cliente confirmou a compra: aceite explícito, pedido confirmado ou comprovante enviado. | "Fechado, segue o comprovante do PIX." |
| `perdido` | Perdido | Cliente recusou, escolheu concorrente ou desistiu. | "Vou ficar com a outra empresa, obrigado." |

Regras de desempate:
- Proposta seguida de silêncio do cliente continua `proposta` (vira pendência do cliente, não `perdido`).
- Cliente que aceita e depois volta atrás termina em `perdido`.
- Pedido de desconto depois da proposta é `negociacao`, mesmo sem palavra "caro".

## 3. Regras dos indicadores

**Turno do cliente**: sequência de mensagens do cliente desde a última mensagem do vendedor. O relógio começa na **primeira** mensagem do turno.

| Indicador | Regra |
|---|---|
| Tempo da primeira resposta (TPR) | Do início do primeiro turno do cliente até a primeira mensagem do vendedor. |
| Tempo médio de resposta (TMR) | Média dos tempos de resposta de todos os turnos do cliente na conversa. Turno sem resposta não entra na média; entra como pendência. |
| Horário comercial | Contam apenas minutos de seg–sex, 08h–18h (America/Recife). Mensagem fora do horário começa a contar na abertura seguinte. |
| Pendência | Algo prometido ou pedido que não foi cumprido até a última mensagem. Tem responsável (`vendedor` ou `cliente`), descrição e a mensagem de origem. |
| Próximo passo | Uma frase com a ação recomendada ao vendedor, gerada pela IA a partir das pendências. |
| Conversa parada | Etapa não final (`prospeccao` a `negociacao`) e sem mensagem há mais de 48 horas úteis. |

## 4. Plano de validação

As metas abaixo são **metas**, não resultados. Os resultados serão medidos na Sprint 3.

### 4.1 Acurácia da etapa (meta ≥ 85%)

- Amostra: **30 conversas simuladas** (`fixtures/conversas/`), 4 normais por etapa (24) + 6 casos difíceis, divididas entre 2 vendedores simulados.
- O gabarito de cada conversa é escrito **antes** de rodar a IA.
- Fórmula: `acurácia = conversas com etapa igual ao gabarito / 30`.
- Meta atingida com **26 acertos ou mais** (26/30 = 86,7%; 25/30 = 83,3% não atinge).
- Também será publicada a matriz de confusão por etapa e, para pendências, precisão e cobertura (sem meta, só registro).

### 4.2 Redução do tempo de acompanhamento (meta ≥ 79%)

- **Atividade padrão**: o gestor responde 5 perguntas sobre o lote de 30 conversas:
  1. Em que etapa está cada negociação?
  2. Quais negociações estão em `negociacao` e qual é a objeção?
  3. Quais pendências do vendedor estão abertas?
  4. Qual vendedor tem o maior tempo médio de resposta?
  5. Quais conversas estão sem resposta do vendedor?
- **Sem o MVP (T_manual)**: o avaliador lê as conversas no formato de chat e responde, cronometrado.
- **Com o MVP (T_painel)**: o mesmo avaliador responde usando o painel do gestor, cronometrado, com intervalo mínimo de 48 h e ordem das perguntas embaralhada para reduzir o efeito de memória.
- Fórmula: `redução = (T_manual − T_painel) / T_manual`. Meta: ≥ 79%.
- As respostas das duas rodadas são conferidas com o gabarito; tempo só vale se a rodada tiver pelo menos 4 das 5 respostas corretas.

### 4.3 Hipóteses × evidência

| Hipótese | Evidência no MVP |
|---|---|
| H1 — esforço de acompanhamento cai | Redução de tempo (4.2) |
| H2 — tempo de resposta é mensurável | TPR/TMR calculados batem com o cálculo manual das 30 conversas |
| H3 — pendências podem ser extraídas | Precisão e cobertura das pendências contra o gabarito |
| H4 — IA identifica a etapa | Acurácia (4.1) |

Limitação registrada: conversas simuladas não representam todo o uso real. Validação com gestores e vendedores reais fica como próximo passo.
