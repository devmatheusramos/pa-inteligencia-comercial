# ADR 0002 — Stack do MVP

- Status: **Aceita**
- Data: 2026-11-07
- Ticket: 00003

Cada decisão abaixo é pequena e reversível; ficam juntas para caber no prazo de 21 dias.

## Backend — Node.js 24 + TypeScript + Fastify

- Mesma linguagem no backend, nas funções Lambda e no frontend.
- Fastify valida entrada por schema e tem baixo custo de inicialização no Lambda.
- Alternativa descartada: Python/FastAPI (bom para IA, mas duplicaria a linguagem do frontend).

## Processamento — orientado a eventos (API Gateway → Lambda → SQS)

- O webhook só valida e enfileira; quem processa é outro consumidor. Picos de mensagens não derrubam a recepção, e falhas vão para fila de mensagens mortas (DLQ) para reprocessar.

## Banco — PostgreSQL (Amazon RDS db.t4g.micro; Docker local)

- Indicadores são consultas relacionais (agrupar por vendedor, etapa, período).
- **Row Level Security** por `vendedor_id` como segunda barreira do controle de acesso, além do filtro na camada de serviço.
- Alternativa descartada: DynamoDB (mais barato parado, mas consultas de painel ficam caras de modelar).

## Provedor de LLM — interface + adaptadores, padrão Amazon Bedrock (Claude, modelo pequeno)

- O domínio depende da interface `AnalisadorConversa`, não de um fornecedor. Adaptadores: Bedrock (padrão), API da Anthropic e OpenAI. Trocar de provedor é configuração.
- Bedrock mantém a conversa dentro da conta AWS e é acessado por endpoint privado da VPC, sem NAT Gateway.
- Temperatura 0, saída em JSON validada por schema, prompt versionado em arquivo. Etapa fora da lista fechada é rejeitada e reprocessada.

## Autenticação — Amazon Cognito (grupos `gestor` e `vendedor`)

- Login, senha, recuperação e MFA prontos; o API Gateway valida o token antes de chamar a API.
- O grupo vira `papel` no token; o `vendedor_id` vem de um atributo do usuário.
- Local: emissor de JWT de desenvolvimento com os mesmos campos.

## Frontend — React + Vite (SPA) em S3 + CloudFront

- Painéis são telas de leitura; SPA estática custa centavos e não precisa de servidor.
