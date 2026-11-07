# ADR 0003 — Integração de leitura via Evolution API (substitui a ADR 0001)

- Status: **Aceita**
- Data: 2026-11-07
- Ticket: 00002
- Substitui: [ADR 0001](0001-integracao-whatsapp.md)

## Contexto

A ADR 0001 escolheu a WhatsApp Cloud API oficial. Ao planejar a prova de viabilidade, apareceram dois problemas para o objetivo do MVP:

1. **Mensagens do vendedor.** A Cloud API só entrega as mensagens que o vendedor manda pelo aplicativo quando o número opera em **coexistência**. Esse modo exige cadastro embutido da Meta e não funciona com o número de teste. A prova cobriria só metade da conversa, e o MVP precisa dos dois lados para calcular o tempo de resposta e identificar a etapa da venda.
2. **Adoção.** Com a Cloud API, cada empresa precisa de app na Meta, verificação do negócio e migração do número. Isso é uma barreira grande para a PME do público-alvo, que já usa o WhatsApp no celular.

## Decisão

Usar a **Evolution API** (fork mantido pela comunidade, imagem `evoapicloud/evolution-api:v2.3.7`) como fonte de mensagens. Ela é auto-hospedada e conecta o número do vendedor como **aparelho vinculado**, como o WhatsApp Web, lendo o QR code ou um código de pareamento.

- O vendedor continua usando o celular do mesmo jeito.
- Toda mensagem, do cliente ou do vendedor, chega pelo webhook `messages.upsert`. O campo `key.fromMe` indica quem enviou.
- **Somente leitura**: o sistema não chama nenhuma rota de envio da Evolution.

Plano B: **Cloud API oficial** (receptor `src/fontes/meta.ts`, já implementado e testado). As duas fontes geram a mesma `MensagemNormalizada`, então o restante do pipeline não muda se a fonte for trocada.

## Riscos aceitos e mitigação

| Risco | Mitigação |
|---|---|
| Uso não oficial, fora dos termos do WhatsApp | Somente leitura: o sistema não envia mensagens, e envio em massa é o principal motivo de bloqueio. Número comercial dedicado. Cloud API mantida como plano B. Contrato com o cliente informa o risco. |
| Bloqueio ou desconexão do número | Evento `connection.update` monitorado com alerta. Reconexão por QR code. Sem histórico perdido no banco do MVP. |
| Mudanças no protocolo do WhatsApp quebrarem a biblioteca | Versão da imagem fixada. Atualizações testadas antes em ambiente separado. |
| Servidor próprio a manter | Evolution, Redis e banco em contêineres. Custo incluído em `docs/custos-aws.md`. |
| Segurança do webhook | Cada instância tem um token próprio, enviado no campo `apikey` do corpo. O receptor compara em tempo constante e descarta eventos sem token válido. A porta da Evolution não fica exposta à internet. |

## Consequências

- **Positivas:** os dois lados da conversa ficam disponíveis desde a primeira mensagem, a prova de viabilidade pode ser completa e o onboarding vira "ler um QR code".
- **Negativas:** há um contêiner a mais para operar e o risco de termos de uso, documentado acima e na seção de limitações do relatório.
- Mudança no C4: o sistema externo "WhatsApp Business Platform" vira o container **Evolution API**, dentro da conta AWS, mais o sistema externo **WhatsApp** (rede).

## Prova de viabilidade (Sprint 1)

`docker compose up -d` sobe PostgreSQL, Redis e Evolution. `npm run evolution:conectar` cria a instância do vendedor com o token do `.env` e salva o QR code. O número de teste é vinculado pelo celular. Critérios:

1. Uma mensagem enviada de outro celular ao número de teste aparece no log do receptor como `cliente`.
2. A resposta digitada no celular do vendedor aparece como `vendedor`.
3. As duas mensagens aparecem com dados pessoais mascarados.
