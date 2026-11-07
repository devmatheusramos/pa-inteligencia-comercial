# Tratamento de dados pessoais

Ticket 00003 · base: LGPD (Lei 13.709/2018)

## O que é mascarado

| Dado no texto da mensagem | Detecção | Substituído por |
|---|---|---|
| CPF | regex + dígito verificador | `[CPF]` |
| CNPJ | regex + dígito verificador | `[CNPJ]` |
| E-mail | regex | `[EMAIL]` |
| Telefone | regex (formatos BR, com e sem DDI) | `[TELEFONE]` |
| CEP | regex `00000-000` | `[CEP]` |
| Cartão de crédito | regex + algoritmo de Luhn | `[CARTAO]` |
| Chave PIX aleatória | regex de UUID | `[PIX]` |

Nome do cliente **não** é mascarado no MVP: a etapa e as pendências dependem de quem fala, e o nome aparece para o próprio vendedor no app de origem. Fica registrado como limitação; a evolução prevista é detecção de entidades por modelo (NER).

## Quando

```
webhook → fila → [MASCARAMENTO] → grava no banco → [análise LLM recebe o texto já mascarado]
```

1. O texto original só existe em memória, entre a fila e o mascaramento. Nunca é gravado.
2. O LLM recebe apenas o texto mascarado.
3. O telefone do cliente (identificador da conversa) é guardado como **HMAC-SHA256** com chave no Secrets Manager: permite agrupar a conversa sem guardar o número.
4. Logs não registram corpo de mensagem, só IDs.

## Retenção

| Dado | Prazo |
|---|---|
| Mensagens mascaradas | 180 dias, depois apagadas por rotina diária |
| Análises (etapa, pendências, indicadores) | Enquanto a empresa for cliente |
| Mensagens com falha na fila (DLQ) | 14 dias (máximo do SQS) |

## Quem vê o quê

| Perfil | Vê | Não vê |
|---|---|---|
| Gestor | Indicadores, etapas e pendências de toda a equipe; texto mascarado das conversas | Telefone do cliente, dados mascarados |
| Vendedor | Somente a própria carteira (conversas do seu número) | Conversas e indicadores de outros vendedores |

Regra aplicada em duas camadas: filtro por `vendedor_id` na API e Row Level Security no PostgreSQL.

## Bases legais (resumo)

- Empresa cliente é a **controladora**; a plataforma é **operadora**; AWS é suboperadora. A Evolution API roda na conta AWS do projeto: nenhum terceiro recebe as mensagens além do próprio WhatsApp.
- A Evolution é configurada para **não gravar** mensagens, contatos e conversas no banco dela (`DATABASE_SAVE_DATA_*=false`); o texto só é gravado depois de mascarado.
- Base legal sugerida: legítimo interesse na gestão comercial (art. 7º, IX), com aviso aos vendedores sobre o monitoramento do número corporativo.
- Validação usa apenas conversas simuladas com dados fictícios.
