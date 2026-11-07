# Plataforma de inteligência comercial via WhatsApp — MVP

Projeto Aplicado · Pós-graduação Arquitetura de Software e Soluções com IA · XP Educação
Autor: Matheus Keeven da Silva Ramos

Lê, **somente leitura**, as conversas comerciais do WhatsApp, mascara dados pessoais e usa um LLM para identificar a etapa da venda, as pendências e o tempo de resposta de cada vendedor.

## Documentação (Sprint 1)

| Documento | Conteúdo |
|---|---|
| [docs/escopo-e-validacao.md](docs/escopo-e-validacao.md) | Escopo, etapas de venda, regras dos indicadores, plano de validação |
| [docs/adr/0001-integracao-whatsapp.md](docs/adr/0001-integracao-whatsapp.md) | Comparativo e decisão da integração com o WhatsApp |
| [docs/adr/0002-stack.md](docs/adr/0002-stack.md) | Backend, banco, LLM, autenticação, frontend |
| [docs/arquitetura/](docs/arquitetura/) | C4 níveis 1, 2 e 3 |
| [docs/custos-aws.md](docs/custos-aws.md) | Hospedagem AWS e estimativa de custo |
| [docs/dados-pessoais.md](docs/dados-pessoais.md) | Mascaramento, retenção e acesso por perfil (LGPD) |
| [fixtures/conversas/](fixtures/conversas/) | 30 conversas simuladas com gabarito |

## Rodar localmente

Requisitos: Node.js 24+, Docker.

```bash
cp .env.example .env
npm install
npm run lint && npm test && npm run validar-fixtures
docker compose up -d     # PostgreSQL com o esquema e RLS
npm run webhook          # receptor em http://localhost:3000/webhook
```

## Prova da integração (número de teste da Meta)

1. developers.facebook.com → criar app do tipo *Business* → adicionar o produto **WhatsApp**. A Meta fornece um número de teste.
2. Copiar a **Chave secreta do app** (Configurações → Básico) para `WHATSAPP_APP_SECRET` no `.env`.
3. `npm run webhook` e, em outro terminal, `ngrok http 3000`.
4. WhatsApp → Configuração → Webhook: URL `https://<id>.ngrok-free.app/webhook`, token igual a `WHATSAPP_VERIFY_TOKEN`. Assinar o campo `messages`.
5. Em *API Setup*, adicionar seu celular como destinatário e enviar uma mensagem dele para o número de teste.
6. O terminal mostra `assinatura OK | ... | cliente | ...` com o texto já mascarado.
