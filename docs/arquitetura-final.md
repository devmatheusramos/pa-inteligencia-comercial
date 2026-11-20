# Arquitetura final do MVP

Este documento resume como o sistema ficou ao fim das três sprints e o que mudou em relação ao plano da Sprint 1. Os diagramas detalhados continuam em [docs/arquitetura/](arquitetura/).

## Como funciona, em uma frase

O sistema **lê** as conversas comerciais do WhatsApp de cada vendedor, **esconde os dados pessoais**, pede a uma **IA** que entenda cada conversa (etapa da venda, pendências, próximo passo e um resumo), **mede o tempo de resposta** por regra simples e mostra tudo num **painel**: o gestor vê a equipe inteira; cada vendedor vê só a própria carteira.

## O caminho de uma mensagem

1. **WhatsApp → Evolution API.** O vendedor conecta o número lendo um QR code. A Evolution API entrega cada mensagem ao sistema. O sistema só lê; nunca envia nada.
2. **Receber e esconder.** O sistema confere o token, ignora grupos, troca CPF, e-mail, telefone, CEP, **endereço e nome** por marcadores e guarda o resultado no banco. Mensagem repetida não é guardada duas vezes.
3. **Ligar ao vendedor.** A conversa fica ligada ao vendedor dono do número e ao canal de origem (hoje só WhatsApp).
4. **Entender (IA).** A IA recebe só o texto já escondido e devolve a etapa da venda (uma de seis), as pendências e o próximo passo. Um segundo pedido gera o resumo em linguagem simples.
5. **Medir (sem IA).** O tempo de resposta conta só segunda a sexta, das 8h às 18h. "Cliente esperando" só vale quando o cliente fez uma pergunta ou cobrança.
6. **Mostrar.** O painel lê o banco. A API confere o login (gestor ou vendedor) e o próprio banco recusa devolver conversa de outro vendedor.

## Peças

| Peça | O que faz | Onde está |
|---|---|---|
| Evolution API | lê o WhatsApp (só leitura) | `docker-compose.yml`, `src/conectores/evolution-admin.ts` |
| Receptor | recebe, esconde, guarda, liga ao vendedor | `src/webhook.ts`, `src/mascaramento.ts`, `src/gravacao.ts` |
| Banco (PostgreSQL) | guarda mensagens, análises, vendedores | `db/*.sql` |
| IA | etapa, pendências, próximo passo, resumo | `src/analise/`, `prompts/` |
| Tempo de resposta | regra de horário comercial, sem IA | `src/indicadores.ts` |
| API e login | entrega os dados por perfil | `src/api.ts`, `src/auth.ts`, `src/db.ts` |
| Painel | telas do gestor e da vendedora | `public/index.html`, `public/conectar.html` |

## O que mudou em relação ao plano

- **IA:** o plano previa o Amazon Bedrock; usei a OpenAI (modelo gpt-4o-mini). A IA fica atrás de uma interface, então trocar de fornecedor não mexe no resto.
- **WhatsApp:** o plano previa a API oficial da Meta; passou a ser a Evolution API, porque a oficial não entrega as mensagens que o vendedor envia (decisão registrada na Sprint 1).
- **Hospedagem:** o plano previa a AWS. O MVP roda no computador, com Docker, sem custo de servidor. A AWS continua desenhada (`docs/custos-aws.md`) e vira próximo passo.
- **Painel:** além dos painéis pedidos, ganhou o cadastro de vendedores (nome, celular e QR code), o canal de origem de cada conversa e a divisão da tela em três agentes (Vigia, Cronômetro e Leitor).

## Limites conhecidos

- Nome e endereço são escondidos por regras (frases como "meu nome é", linhas só com nome, logradouros como "Rua" e "Avenida", e o nome do contato no WhatsApp). Um nome citado sem nenhuma dessas pistas pode passar.
- A IA acerta a etapa em 26 de 30 conversas de teste (86,7%), mas encontra só cerca de 3 de cada 10 pendências existentes.
- Tudo foi medido com 30 conversas de teste, não com uma empresa real.
- O sistema roda no computador, sem alta disponibilidade, e o login é de desenvolvimento (no desenho final seria o Amazon Cognito).
