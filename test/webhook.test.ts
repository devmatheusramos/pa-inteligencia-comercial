import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { assinaturaValida, normalizar } from '../src/webhook.ts';
import { validarSaida } from '../src/analise/analisador.ts';

test('aceita só assinatura HMAC correta', () => {
  const corpo = Buffer.from('{"a":1}');
  const assinatura = 'sha256=' + createHmac('sha256', 'segredo').update(corpo).digest('hex');
  assert.equal(assinaturaValida(corpo, assinatura, 'segredo'), true);
  assert.equal(assinaturaValida(corpo, assinatura, 'outro'), false);
  assert.equal(assinaturaValida(corpo, undefined, 'segredo'), false);
});

test('normaliza mensagem do cliente e eco do vendedor, mascarando o texto', () => {
  const evento = {
    entry: [{
      changes: [
        { field: 'messages', value: { metadata: { display_phone_number: '5581999990000' },
          messages: [{ id: 'm1', from: '5581988887777', timestamp: '1762520400', type: 'text', text: { body: 'Meu email é ana@exemplo.com' } }] } },
        { field: 'smb_message_echoes', value: { metadata: { display_phone_number: '5581999990000' },
          message_echoes: [{ id: 'm2', to: '5581988887777', timestamp: '1762520460', type: 'text', text: { body: 'Recebido, obrigado!' } }] } },
      ],
    }],
  };
  const [c, v] = normalizar(evento);
  assert.equal(c.de, 'cliente');
  assert.equal(c.textoMascarado, 'Meu email é [EMAIL]');
  assert.equal(v.de, 'vendedor');
  assert.equal(c.clienteHmac, v.clienteHmac, 'mesma conversa nos dois sentidos');
});

test('rejeita etapa fora da lista fechada', () => {
  assert.throws(() => validarSaida({ etapa: 'fechando', pendencias: [] }));
  assert.equal(validarSaida({ etapa: 'proposta', pendencias: [], proximo_passo: 'x' }).etapa, 'proposta');
});
