import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularIndicadores, minutosComerciais, precisaResposta } from '../src/indicadores.ts';

// 2026-11-09 é segunda-feira. Horários em America/Recife (-03:00).
const t = (s: string) => new Date(`${s}-03:00`);

test('tempo dentro do horário comercial: 10:00 -> 10:12 = 12 min', () => {
  assert.equal(minutosComerciais(t('2026-11-09T10:00:00'), t('2026-11-09T10:12:00')), 12);
});

test('mensagem fora do expediente começa a contar na abertura seguinte', () => {
  // sexta 17:50 -> segunda 08:10 = 10 min na sexta + 10 min na segunda
  assert.equal(minutosComerciais(t('2026-11-06T17:50:00'), t('2026-11-09T08:10:00')), 20);
  // sábado 11:00 -> segunda 08:30 = só 30 min
  assert.equal(minutosComerciais(t('2026-11-07T11:00:00'), t('2026-11-09T08:30:00')), 30);
});

test('vários dias úteis: dia cheio = 600 min', () => {
  assert.equal(minutosComerciais(t('2026-11-09T08:00:00'), t('2026-11-11T08:00:00')), 1200);
});

test('turno do cliente: relógio começa na primeira mensagem do turno', () => {
  const r = calcularIndicadores([
    { de: 'cliente', em: '2026-11-09T10:00:00-03:00' },
    { de: 'cliente', em: '2026-11-09T10:05:00-03:00' },
    { de: 'vendedor', em: '2026-11-09T10:12:00-03:00' },
    { de: 'cliente', em: '2026-11-09T11:00:00-03:00' },
    { de: 'vendedor', em: '2026-11-09T11:30:00-03:00' },
  ]);
  assert.equal(r.tprMinutos, 12);
  assert.equal(r.tmrMinutos, 21);   // (12 + 30) / 2
  assert.equal(r.turnos, 2);
  assert.equal(r.semResposta, 0);
});

test('turno sem resposta não entra na média e é contado à parte', () => {
  const r = calcularIndicadores([
    { de: 'cliente', em: '2026-11-09T10:00:00-03:00' },
    { de: 'vendedor', em: '2026-11-09T10:10:00-03:00' },
    { de: 'cliente', em: '2026-11-09T11:00:00-03:00' },
  ]);
  assert.equal(r.tmrMinutos, 10);
  assert.equal(r.semResposta, 1);
});

test('"ok", "obrigada", 👍 e "vou ver e te falo" não esperam resposta; pergunta e cobrança esperam', () => {
  for (const t of ['ok obgda', 'beleza', '👍', 'perfeito', 'vou ver se encaixa e te falo', 'mando a noite, a logo ta no pc']) assert.equal(precisaResposta(t), false, t);
  for (const t of ['e 10x sem juros?', 'ta, mas responde mesmo dessa vez né', 'me passa o valor']) assert.equal(precisaResposta(t), true, t);
});

test('conversa que termina com "ok, obrigada" do cliente não conta como cliente esperando', () => {
  const r = calcularIndicadores([
    { de: 'cliente', em: '2026-11-09T10:00:00-03:00', texto: 'quanto fica?' },
    { de: 'vendedor', em: '2026-11-09T10:05:00-03:00', texto: 'R$ 100' },
    { de: 'cliente', em: '2026-11-09T10:10:00-03:00', texto: 'ok obrigada' },
  ]);
  assert.equal(r.semResposta, 0);
});
