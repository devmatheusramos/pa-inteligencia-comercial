import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mascarar, cpfValido, cnpjValido, luhnValido } from '../src/mascaramento.ts';

test('valida dígitos verificadores', () => {
  assert.equal(cpfValido('529.982.247-25'), true);
  assert.equal(cpfValido('529.982.247-26'), false);
  assert.equal(cpfValido('111.111.111-11'), false);
  assert.equal(cnpjValido('11.222.333/0001-81'), true);
  assert.equal(cnpjValido('11.222.333/0001-82'), false);
  assert.equal(luhnValido('4111 1111 1111 1111'), true);
});

test('mascara dados pessoais na mensagem', () => {
  const r = mascarar('Meu CPF é 529.982.247-25, email joao.silva@exemplo.com, cel (81) 98765-4321, CEP 50030-230');
  assert.equal(r.texto, 'Meu CPF é [CPF], email [EMAIL], cel [TELEFONE], CEP [CEP]');
  assert.deepEqual(r.ocorrencias, { '[EMAIL]': 1, '[CPF]': 1, '[TELEFONE]': 1, '[CEP]': 1 });
});

test('mascara CNPJ, cartão e chave PIX aleatória', () => {
  const r = mascarar('CNPJ 11.222.333/0001-81, cartão 4111 1111 1111 1111, pix 123e4567-e89b-12d3-a456-426614174000');
  assert.equal(r.texto, 'CNPJ [CNPJ], cartão [CARTAO], pix [PIX]');
});

test('não mascara números que não são dado pessoal', () => {
  const texto = 'Fica R$ 2.400 em 3x, entrega em 10 dias, pedido 12345';
  assert.equal(mascarar(texto).texto, texto);
});
