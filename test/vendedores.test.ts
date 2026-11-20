import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarTelefone } from '../src/vendedores.ts';

test('celular: aceita formatos comuns e normaliza para 55 + DDD + número', () => {
  assert.equal(normalizarTelefone('(81) 98888-7777'), '5581988887777');
  assert.equal(normalizarTelefone('81988887777'), '5581988887777');
  assert.equal(normalizarTelefone('+55 81 98888-7777'), '5581988887777');
  assert.equal(normalizarTelefone('(81) 3333-4444'), '558133334444');   // fixo, 10 dígitos
});

test('celular: recusa número curto, sem DDD ou com 11 dígitos sem o 9', () => {
  assert.throws(() => normalizarTelefone('123'), /inválido/);
  assert.throws(() => normalizarTelefone('98888-7777'), /inválido/);
  assert.throws(() => normalizarTelefone('(81) 88888-7777'), /começa com 9/);
  assert.throws(() => normalizarTelefone(''), /inválido/);
});
