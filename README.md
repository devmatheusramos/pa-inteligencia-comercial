# Plataforma de inteligência comercial via WhatsApp — MVP

Projeto Aplicado · Pós-graduação Arquitetura de Software e Soluções com IA · XP Educação
Autor: Matheus Keeven da Silva Ramos

Lê, **somente leitura**, as conversas comerciais do WhatsApp, mascara dados pessoais e usa um LLM para identificar a etapa da venda, as pendências e o tempo de resposta de cada vendedor.

## Documentação (Sprint 1)

| Documento | Conteúdo |
|---|---|
| [docs/escopo-e-validacao.md](docs/escopo-e-validacao.md) | Escopo, etapas de venda, regras dos indicadores, plano de validação |
| [docs/adr/0003-integracao-evolution-api.md](docs/adr/0003-integracao-evolution-api.md) | **Integração adotada**: Evolution API (mudança de escopo) |
| [docs/adr/0001-integracao-whatsapp.md](docs/adr/0001-integracao-whatsapp.md) | Comparativo inicial e Cloud API oficial (substituída, hoje plano B) |
| [docs/adr/0002-stack.md](docs/adr/0002-stack.md) | Backend, banco, LLM, autenticação, frontend |
| [docs/arquitetura/](docs/arquitetura/) | C4 níveis 1, 2 e 3 |
| [docs/custos-aws.md](docs/custos-aws.md) | Hospedagem AWS e estimativa de custo |
| [docs/dados-pessoais.md](docs/dados-pessoais.md) | Mascaramento, retenção e acesso por perfil (LGPD) |
| [fixtures/conversas/](fixtures/conversas/) | 30 conversas simuladas com gabarito |

## Rodar localmente

Requisitos: Node.js 24+, Docker.

```bash
cp .env.example .env      # troque as chaves de exemplo por valores aleatórios
npm install
npm run lint && npm test && npm run validar-fixtures
docker compose up -d      # PostgreSQL (com RLS), Redis e Evolution API v2.3.7
npm run webhook           # receptor em http://localhost:3000/webhook/evolution
```

## Prova da integração (Evolution API)

1. Com o receptor rodando, em outro terminal: `npm run evolution:conectar`. Cria a instância `vendedor-teste` com o token do `.env`, aponta o webhook para o receptor e salva `evolution-qrcode.png`.
2. No celular do número de teste (papel de vendedor): WhatsApp → Aparelhos conectados → Conectar aparelho → ler o QR code. O receptor mostra `conexão da instância vendedor-teste: open`.
3. De outro celular, mande uma mensagem para o número de teste. O receptor mostra `cliente | ... | "texto mascarado"`.
4. Responda pelo celular do vendedor. O receptor mostra `vendedor | ...` com o mesmo `cliente#`, ou seja, a mesma conversa.

Nenhuma rota de envio da Evolution é chamada: o sistema só lê.
