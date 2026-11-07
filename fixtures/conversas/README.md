# Conversas simuladas de WhatsApp (fixtures)

30 conversas fictícias entre vendedores de PMEs e clientes (`c01.json` … `c30.json`), com o gabarito escrito antes de rodar a IA. Todos os nomes, telefones, CPFs e e-mails são inventados.

## Formato

Cada arquivo é um JSON UTF-8 com:

- `id`, `segmento`, `vendedor` (`{id, nome}`), `cliente` (`{nome, telefone}`), `dificil` (bool)
- `mensagens`: lista de `{de: "cliente"|"vendedor", em: ISO-8601 com -03:00, texto}`, em ordem crescente de horário (02/11 a 06/11/2026). Mídias aparecem como `[imagem]`, `[documento: ...]`, `[áudio] <transcrição>` e `[figurinha]`.
- `gabarito`:
  - `etapa`: a etapa mais avançada atingida no fim da conversa
  - `pendencias`: `{responsavel: "vendedor"|"cliente", descricao, origem_msg}`. `origem_msg` é o índice (0-based) da mensagem em que o responsável assumiu o compromisso; se ninguém assumiu, é a mensagem do pedido.
  - `proximo_passo`, `observacao` (preenchida nas difíceis)

`gabarito.csv` resume: `id,vendedor_id,segmento,etapa,qtd_pendencias,dificil`.

## Etapas

| etapa | critério |
|---|---|
| prospeccao | primeiro contato; necessidade ainda desconhecida |
| qualificacao | vendedor levanta necessidade/quantidade/prazo; nenhum preço enviado |
| proposta | preço ou condições concretas enviados; cliente não contestou nem aceitou |
| negociacao | cliente fez objeção (preço, prazo, concorrente, pagamento) ou pediu ajuste; conversa aberta |
| fechado_ganho | aceite explícito, pedido confirmado ou comprovante enviado |
| perdido | recusa explícita, escolheu concorrente ou desistiu |

## Distribuição

| etapa | v1 (Ana Paula) | v2 (Bruno) | total |
|---|---:|---:|---:|
| prospeccao | 2 | 2 | 4 |
| qualificacao | 3 | 2 | 5 |
| proposta | 2 | 3 | 5 |
| negociacao | 3 | 3 | 6 |
| fechado_ganho | 3 | 2 | 5 |
| perdido | 2 | 3 | 5 |
| **total** | **15** | **15** | **30** |

24 normais (4 por etapa) + 6 difíceis:

| id | caso | etapa |
|---|---|---|
| c15 | (a) ambígua entre proposta e negociacao | negociacao |
| c18 | (b) cliente some após a proposta | proposta |
| c05 | (c) dados pessoais fictícios no texto (CPF, e-mail, endereço, telefone) | fechado_ganho |
| c27 | (d) cliente volta atrás depois de aceitar | perdido |
| c09 | (e) perguntas misturadas, `[áudio]` e `[figurinha]` | qualificacao |
| c25 | (f) vendedor demora horas e o cliente reclama | negociacao |
