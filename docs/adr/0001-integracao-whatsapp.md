# ADR 0001 — Integração de leitura do WhatsApp

- Status: **Aceita**
- Data: 2026-11-07
- Ticket: 00002

## Contexto

O MVP precisa ler, **somente leitura**, as mensagens trocadas entre o vendedor e o cliente: as que o cliente envia **e** as que o vendedor envia. É o maior risco técnico do projeto: se as mensagens não chegam, não há análise.

## Opções comparadas

| Critério | A. WhatsApp Cloud API (oficial, Meta) | B. API não oficial (Baileys / Evolution API) | C. Exportação de conversas (.txt) |
|---|---|---|---|
| Mensagens do cliente | Sim, webhook `messages` em tempo real | Sim, em tempo real | Sim, em lote, manual |
| Mensagens do vendedor | Sim, se o número usar **coexistência** (app WhatsApp Business + Cloud API no mesmo número): webhook `smb_message_echoes`. Sem coexistência, só as enviadas pela própria API | Sim, todas | Sim |
| Vendedor continua usando o app de sempre | Sim, com coexistência | Sim (sessão do WhatsApp Web) | Sim |
| Custo | Receber mensagens não é cobrado; cobrança é por mensagem enviada por template, e o MVP não envia | Gratuito (servidor próprio) | Gratuito |
| Risco de bloqueio do número | Baixo, canal oficial | **Alto**: viola os termos de uso, número pode ser banido | Nenhum |
| Termos de uso / LGPD | Conforme; Meta é operadora com contrato | Não conforme | Conforme, mas depende de ação manual |
| Tempo real para indicadores | Sim | Sim | Não; tempo de resposta só por lote |
| Esforço no MVP | Médio (app Meta, webhook, verificação de assinatura) | Baixo | Baixo |

## Decisão

**Opção A — WhatsApp Cloud API oficial**, recebendo os webhooks em um endpoint que apenas valida a assinatura `X-Hub-Signature-256` e enfileira a mensagem. Nenhuma chamada de envio é implementada (restrição de somente leitura).

- **Plano B**: importador da exportação `.txt` (opção C), usado se a coexistência não estiver disponível para o número do vendedor. Mantém a análise de etapa e pendências; o tempo de resposta passa a vir dos horários do arquivo.
- **Rejeitada**: opção B. Funciona tecnicamente, mas o risco de banimento do número comercial e a violação dos termos de uso tornam a opção inviável para um produto.

## Consequências

- O vendedor precisa conectar o número uma vez (cadastro embutido da Meta). Fica registrado como passo de implantação.
- A Meta só entrega mensagens novas; histórico anterior entra pela sincronização da coexistência ou pelo plano B.
- O endpoint precisa responder em menos de alguns segundos, por isso só valida e enfileira; o processamento é assíncrono (ver C4 nível 2).

## Prova de viabilidade (Sprint 1)

Executada com o número de teste do app no Meta for Developers e o receptor local `src/webhook` exposto por túnel HTTPS (ngrok). Critério: mensagem enviada de um celular ao número de teste aparece no log do receptor com assinatura válida. Evidência: print do log, no relatório.

Limitação registrada: o número de teste da Meta não usa coexistência, então o eco das mensagens do vendedor (`smb_message_echoes`) não pode ser provado nele. A prova cobre a mensagem do cliente; o eco fica para validar com um número real conectado por coexistência.
