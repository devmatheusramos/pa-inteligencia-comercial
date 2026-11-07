import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { assinaturaValida, normalizarMeta } from '../src/fontes/meta.ts';
import { normalizarEvolution, tokenValido } from '../src/fontes/evolution.ts';
import { validarSaida } from '../src/analise/analisador.ts';

const evo = (data: unknown, event = 'messages.upsert') => ({ event, instance: 'vendedor-teste', apikey: 'tok', data });

test('Evolution: aceita só o token da instância', () => {
  assert.equal(tokenValido('tok', 'tok'), true);
  assert.equal(tokenValido('outro', 'tok'), false);
  assert.equal(tokenValido(undefined, 'tok'), false);
  assert.equal(tokenValido('tok', ''), false);
});

test('Evolution: mensagem do cliente e resposta do vendedor (fromMe) na mesma conversa, mascaradas', () => {
  const [c] = normalizarEvolution(evo({
    key: { remoteJid: '5581988887777@s.whatsapp.net', fromMe: false, id: 'A1' },
    message: { conversation: 'Meu CPF é 529.982.247-25' }, messageType: 'conversation', messageTimestamp: 1762520400,
  }));
  const [v] = normalizarEvolution(evo({
    key: { remoteJid: '5581988887777@s.whatsapp.net', fromMe: true, id: 'A2' },
    message: { extendedTextMessage: { text: 'Anotado! Te mando o orçamento.' } }, messageType: 'extendedTextMessage', messageTimestamp: '1762520460',
  }));
  assert.equal(c.de, 'cliente');
  assert.equal(c.textoMascarado, 'Meu CPF é [CPF]');
  assert.equal(v.de, 'vendedor');
  assert.equal(v.vendedor, 'vendedor-teste');
  assert.equal(c.clienteHmac, v.clienteHmac);
  assert.equal(v.enviadaEm, '2025-11-07T13:01:00.000Z');
});

test('Evolution: ignora grupos, status e outros eventos; resolve @lid pelo número real', () => {
  assert.equal(normalizarEvolution(evo({ key: { remoteJid: '1203630@g.us', id: 'G' }, message: { conversation: 'oi' } })).length, 0);
  assert.equal(normalizarEvolution(evo({ key: { remoteJid: 'status@broadcast', id: 'S' }, message: { conversation: 'oi' } })).length, 0);
  assert.equal(normalizarEvolution(evo({ state: 'open' }, 'connection.update')).length, 0);
  const [l] = normalizarEvolution(evo({
    key: { remoteJid: '99887766@lid', remoteJidAlt: '5581988887777@s.whatsapp.net', fromMe: false, id: 'L' },
    message: { imageMessage: {} }, messageType: 'imageMessage', messageTimestamp: 1762520400,
  }));
  const [n] = normalizarEvolution(evo({ key: { remoteJid: '5581988887777@s.whatsapp.net', id: 'N' }, message: { conversation: 'x' }, messageTimestamp: 1 }));
  assert.equal(l.clienteHmac, n.clienteHmac);
  assert.equal(l.textoMascarado, '[imageMessage]');
});

test('Meta (plano B): aceita só assinatura HMAC correta', () => {
  const corpo = Buffer.from('{"a":1}');
  const assinatura = 'sha256=' + createHmac('sha256', 'segredo').update(corpo).digest('hex');
  assert.equal(assinaturaValida(corpo, assinatura, 'segredo'), true);
  assert.equal(assinaturaValida(corpo, assinatura, 'outro'), false);
  assert.equal(assinaturaValida(corpo, undefined, 'segredo'), false);
});

test('Meta (plano B): normaliza cliente e eco do vendedor', () => {
  const [c, v] = normalizarMeta({
    entry: [{ changes: [
      { field: 'messages', value: { metadata: { display_phone_number: '5581999990000' },
        messages: [{ id: 'm1', from: '5581988887777', timestamp: '1762520400', type: 'text', text: { body: 'Meu email é ana@exemplo.com' } }] } },
      { field: 'smb_message_echoes', value: { metadata: { display_phone_number: '5581999990000' },
        message_echoes: [{ id: 'm2', to: '5581988887777', timestamp: '1762520460', type: 'text', text: { body: 'Recebido!' } }] } },
    ] }],
  });
  assert.equal(c.textoMascarado, 'Meu email é [EMAIL]');
  assert.equal(v.de, 'vendedor');
  assert.equal(c.clienteHmac, v.clienteHmac);
});

test('rejeita etapa fora da lista fechada', () => {
  assert.throws(() => validarSaida({ etapa: 'fechando', pendencias: [] }));
  assert.equal(validarSaida({ etapa: 'proposta', pendencias: [], proximo_passo: 'x' }).etapa, 'proposta');
});
