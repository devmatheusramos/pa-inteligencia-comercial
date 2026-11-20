# 2.2 Sprint 2 — rascunho para colar no relatório

Prints em `evidencias/prints/` (figuras 10 a 23). Os campos [entre colchetes] dependem de você.

## 2.2.1 Solução
Período: 09/11/2026 a 15/11/2026 (dias 8 a 14). Objetivo: implementar o fluxo principal do MVP (receber, mascarar, deduplicar e vincular as mensagens; analisar com LLM; calcular o tempo de resposta sem IA; restringir o acesso por perfil) e preparar a validação (gabarito congelado e linha de base).

**Evidência do planejamento:** na abertura da Sprint 2 foram selecionados 4 cartões do backlog e movidos para "Em andamento". *Figura 9: [print do Kanban do Notion com os tickets 00005 a 00008 em Em andamento].*

### 00005 — Receber as mensagens com mascaramento, deduplicação e vínculo ao vendedor
O webhook recebe a mensagem, mascara os dados pessoais, grava no PostgreSQL e liga a conversa ao vendedor dono do número (instância). Mensagem repetida é ignorada pela chave primária (id da mensagem) e número desconhecido não grava nada. Nenhuma rota de envio é chamada.
- Figura 10: webhook recebendo mensagem do cliente (com e-mail e telefone), resposta do vendedor, reenvio duplicado (`duplicada`) e token inválido (401).
- Figura 11: tabela `mensagens` com `[EMAIL]` e `[TELEFONE]` gravados e a conversa ligada ao vendedor.
- Figura 12: as 30 conversas simuladas (267 mensagens) carregadas duas vezes: 267 gravadas na 1ª, 267 duplicadas e 0 gravadas na 2ª.

### 00006 — Integrar o LLM para identificar etapa, pendências e próximos passos
Adaptador de LLM atrás da interface `AnalisadorConversa` (ADR 0002). Provedor usado nesta sprint: OpenAI, modelo gpt-4o-mini, temperatura 0, saída em JSON validada por `validarSaida` (etapa fora da lista fechada é rejeitada e reprocessada). O prompt fica em arquivo versionado (`prompts/analise-v1.md`) e só o texto mascarado é enviado. O resultado é gravado em `analises` com modelo e versão do prompt, como análise de IA a validar.
- Figura 13: prompt versionado.
- Figura 14: saída JSON para uma conversa (etapa, pendências com `origem_msg`, próximo passo).
- Figura 15: tabela `analises`.
- Figura 16: o que o modelo recebe: CPF, e-mail, CEP e telefone já trocados por marcadores.
- Figura 23: primeira rodada contra o gabarito congelado: **27 de 30 etapas corretas (90,0%)**, acima da meta de 85% (26/30). Erros: c06 e c09 (qualificação lida como prospecção) e c15 (negociação lida como proposta, caso difícil). É um ensaio; a medição oficial é da Sprint 3.

### 00007 — Calcular tempo de resposta e restringir acesso por perfil
O tempo de resposta é calculado sem IA, pelas regras do ticket 00001: turno do cliente começa na primeira mensagem, só contam minutos de seg–sex 08h–18h (America/Recife). Gera TPR (primeira resposta) e TMR (média), e conta turnos sem resposta à parte. O acesso é por perfil: token JWT (papel e vendedor_id, como o Cognito entregaria) e Row Level Security no PostgreSQL, com a API trocando para um papel sem privilégio de superusuário em cada transação.
- Figura 17: testes do tempo de resposta (10:00 → 10:12 = 12 min; fora do expediente; vários dias).
- Figura 18: gestor vê as 30 conversas dos 2 vendedores.
- Figura 19: vendedor Ana Paula vê só as 15 dela; abrir conversa do Bruno devolve 403; sem token devolve 401.

### 00008 — Preparar a validação: revisar o gabarito e medir o tempo sem o MVP
O gabarito das 30 conversas foi revisado de forma independente contra as regras do ticket 00001. Foi encontrada uma inconsistência (c21: faltava a pendência "emitir a nota fiscal após o evento", que o próprio próximo passo já citava) e corrigida. Em seguida o gabarito foi **congelado por hash SHA-256**, e o script de análise se recusa a rodar se o gabarito mudar depois disso.
- Figura 20: correção da c21 e congelamento/verificação do gabarito.
- Figura 21: [print da linha de base: `node scripts/baseline.ts conferir ...` com o seu T_manual, depois que você fizer a leitura cronometrada].

**Evidência dos resultados:** os requisitos foram movidos para Concluído *(Figura 24: [print do Notion])*. Figura 22: 19 testes automatizados passando, 4 deles com PostgreSQL real.

| Entrega | Onde está |
|---|---|
| Gravação, deduplicação e vínculo | `src/gravacao.ts`, `src/webhook.ts` |
| Adaptador de LLM e prompt | `src/analise/openai.ts`, `prompts/analise-v1.md` |
| Tempo de resposta | `src/indicadores.ts` |
| Acesso por perfil (JWT + RLS) | `src/auth.ts`, `src/api.ts`, `src/db.ts`, `db/02-acesso.sql` |
| Gabarito congelado | `fixtures/conversas/gabarito.sha256` |
| Linha de base | `scripts/baseline.ts` |
| Testes | `test/indicadores.test.ts`, `test/banco.test.ts` |

## 2.2.2 Lições aprendidas
- **00005:** gravar só texto já mascarado e deixar o banco ignorar duplicadas (chave primária) tornou a recepção segura para reenvio. Limitação: o id da mensagem é único só dentro de uma instância da Evolution; com muitos números, o id precisa incluir a instância.
- **00006:** o teste mostrou que **nome e endereço não são mascarados** e chegam ao modelo (Figura 16, conversa c05). O mascaramento por regras só cobre dado com formato (CPF, e-mail, telefone, CEP). Fica como limitação registrada e próximo passo (reconhecimento de nomes e endereços). O modelo também sub-identifica pendências (por exemplo, c02 com 0 contra 1 no gabarito), o que a Sprint 3 deve medir com precisão e cobertura.
- **00007:** o Row Level Security só vale para um papel sem privilégio de superusuário; o usuário do banco do Docker é superusuário e ignora a política. Por isso a API troca de papel a cada transação.
- **00008:** congelar o gabarito por hash antes de rodar a IA impede ajustar a resposta ao resultado. A revisão independente achou um erro de pendência que o autor não tinha visto.
