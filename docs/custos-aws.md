# Hospedagem AWS e estimativa de custos

Ticket 00003 · Região: **us-east-1** (Norte da Virgínia) no MVP pelo menor custo; produção com dados de clientes reais avalia **sa-east-1** (São Paulo).

Preços de tabela on-demand em USD, conferidos na AWS Pricing Calculator. Valores de referência — confirmar na data.

## Arquitetura

| Serviço | Papel | Configuração |
|---|---|---|
| EC2 + Docker | **Evolution API** (fonte de mensagens, ADR 0003) e Redis | t4g.small (2 GB), 20 GB gp3, IPv4 público, sub-rede pública sem porta de entrada aberta |
| API Gateway (HTTP API) | Recebe o webhook da Evolution e as chamadas da API dos painéis | 1 API, 2 rotas públicas (webhook) + rotas autenticadas |
| Lambda `webhook` | Valida o token da instância e enfileira | 128 MB, ~50 ms |
| SQS `mensagens` + DLQ | Desacopla recepção do processamento | Standard |
| Lambda `processador` | Mascara dados pessoais, vincula ao vendedor, grava | 256 MB, ~150 ms, na VPC |
| Lambda `analisador` | Chama o LLM e grava etapa, pendências, próximo passo | 256 MB, ~4 s, na VPC |
| EventBridge Scheduler | A cada 15 min dispara análise das conversas paradas há 30 min | — |
| Lambda `api` | API dos painéis | 256 MB, na VPC |
| RDS PostgreSQL | Banco do MVP e banco `evolution` (sessões) | db.t4g.micro, Single-AZ, 20 GB gp3, backup 7 dias |
| VPC endpoint (Bedrock) | Acesso privado ao LLM, sem NAT Gateway | 1 AZ |
| Amazon Bedrock | LLM (modelo pequeno da família Claude) | sob demanda |
| Cognito | Login e perfis | User pool, plano Lite |
| S3 + CloudFront | Frontend estático | — |
| Secrets Manager + KMS | Chave do HMAC, token da instância Evolution | 2 segredos, 1 chave |
| CloudWatch + AWS Budgets | Logs, alarmes, alerta de custo | Alerta em 80% do orçamento |

## Volume considerado

| Cenário | Vendedores | Conversas/dia | Mensagens/mês | Análises LLM/mês |
|---|---|---|---|---|
| **Validação do MVP** | 2 simulados | 30 conversas no total | ~400 | ~150 (5 rodadas) |
| **Piloto** | 10 | 40 por vendedor | ~180.000 | ~24.000 |

## Custo mensal estimado (USD)

| Item | Cálculo | Validação | Piloto |
|---|---|---|---|
| EC2 t4g.small (Evolution) | 0,0168/h × 730 h | 12,26 | 12,26 |
| EBS 20 GB + IPv4 público | 20 × 0,08 + 0,005/h × 730 | 5,25 | 5,25 |
| RDS db.t4g.micro | 0,016/h × 730 h | 11,68 | 11,68 |
| Armazenamento RDS | 20 GB × 0,115 | 2,30 | 2,30 |
| VPC endpoint Bedrock | 0,01/h × 730 h | 7,30 | 7,30 |
| Secrets Manager + KMS | 2 × 0,40 + 1,00 | 1,80 | 1,80 |
| CloudWatch Logs | ~2 GB × 0,50 | 0,10 | 1,00 |
| Lambda, API Gateway, SQS, Cognito | dentro do nível gratuito / centavos | 0,00 | ~1,00 |
| S3 + CloudFront | — | 0,10 | 0,50 |
| **Infraestrutura** | | **~41** | **~44** |
| LLM (entrada) | ~2.000 tokens × análises × preço/M | < 0,50 | 48 M × 1,00 = 48,00 |
| LLM (saída) | ~300 tokens × análises × preço/M | < 0,50 | 7,2 M × 5,00 = 36,00 |
| **Total** | | **~42** | **~128** |

Preço de referência do LLM: modelo pequeno a US$ 1,00 por milhão de tokens de entrada e US$ 5,00 por milhão de saída. O adaptador permite trocar por um modelo mais barato se a acurácia se mantiver.

## Decisões de custo

- **Sem NAT Gateway** (~US$ 33/mês): as Lambdas na VPC acessam o Bedrock por endpoint privado, e o banco usa autenticação IAM do RDS, que não exige chamada de rede ao Secrets Manager.
- **Análise com espera de 30 min**: a conversa é analisada quando para, não a cada mensagem. Corta o custo do LLM em ~5×.
- **Single-AZ** no MVP; Multi-AZ dobra o custo do RDS e entra em produção.
- **Evolution em EC2**, não em Fargate: precisa ficar ligada 24 h para manter a sessão do WhatsApp; uma instância pequena atende vários números no MVP.
- O LLM é o maior custo no piloto (~66%). Indicador acompanhado na Sprint 3: custo por conversa analisada.

## Para a evidência

Reproduzir os itens da tabela na AWS Pricing Calculator (calculator.aws), salvar a estimativa e guardar o link público e o print no relatório.
