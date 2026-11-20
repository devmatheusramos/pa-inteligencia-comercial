// Testes com PostgreSQL de verdade (docker compose up -d db). Sem banco acessível, são pulados.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { criarPool, comPerfil } from '../src/db.ts';
import { gravarMensagem } from '../src/gravacao.ts';
import { mascarar } from '../src/mascaramento.ts';
import { emitirToken, lerToken } from '../src/auth.ts';

const pool = criarPool(process.env.DATABASE_URL ?? 'postgres://pa:pa@localhost:5432/pa');
const banco = await pool.query('SELECT 1').then(() => true, () => false);
const opts = { skip: banco ? false : 'PostgreSQL indisponível' };

const base = (id: string, vendedor: string, de: 'cliente' | 'vendedor', texto: string) => ({
  id, fonte: 'evolution' as const, de, vendedor, clienteHmac: 'cli-teste', enviadaEm: '2026-11-09T13:00:00.000Z', textoMascarado: mascarar(texto).texto,
});

if (banco) {
  await pool.query("DELETE FROM mensagens WHERE id LIKE 'tt-%'");
  await pool.query("DELETE FROM conversas WHERE cliente_hmac = 'cli-teste'");
  await pool.query("DELETE FROM vendedores WHERE id IN ('tt1','tt2')");
  await pool.query("INSERT INTO vendedores (id, nome, numero_wa_id) VALUES ('tt1','Teste Um','inst-tt1'),('tt2','Teste Dois','inst-tt2')");
}
after(async () => {
  if (banco) {
    await pool.query("DELETE FROM mensagens WHERE id LIKE 'tt-%'");
    await pool.query("DELETE FROM conversas WHERE cliente_hmac = 'cli-teste'");
    await pool.query("DELETE FROM vendedores WHERE id IN ('tt1','tt2')");
  }
  await pool.end();
});

test('grava mascarada, liga ao vendedor e ignora duplicada', opts, async () => {
  const m = base('tt-1', 'inst-tt1', 'cliente', 'Meu e-mail é ana@exemplo.com, tel (81) 98888-7777');
  assert.equal(await gravarMensagem(pool, m), 'gravada');
  assert.equal(await gravarMensagem(pool, m), 'duplicada');
  const r = await pool.query("SELECT texto_mascarado, vendedor_id FROM mensagens WHERE id = 'tt-1'");
  assert.equal(r.rowCount, 1);
  assert.equal(r.rows[0].texto_mascarado, 'Meu e-mail é [EMAIL], tel [TELEFONE]');
  assert.equal(r.rows[0].vendedor_id, 'tt1');
});

test('número desconhecido não grava nada', opts, async () => {
  assert.equal(await gravarMensagem(pool, base('tt-x', 'inst-nao-existe', 'cliente', 'oi')), 'vendedor_desconhecido');
});

test('RLS: vendedor só vê a própria carteira; gestor vê todas', opts, async () => {
  await gravarMensagem(pool, { ...base('tt-2', 'inst-tt2', 'cliente', 'oi'), clienteHmac: 'cli-teste' });
  const ids = (p: Parameters<typeof comPerfil>[1]) =>
    comPerfil(pool, p, async (c) => (await c.query("SELECT id FROM mensagens WHERE id LIKE 'tt-%' ORDER BY id")).rows.map((r) => r.id));
  assert.deepEqual(await ids({ papel: 'vendedor', vendedorId: 'tt1' }), ['tt-1']);
  assert.deepEqual(await ids({ papel: 'vendedor', vendedorId: 'tt2' }), ['tt-2']);
  assert.deepEqual(await ids({ papel: 'gestor' }), ['tt-1', 'tt-2']);
});

test('token: assinatura inválida ou expirado é recusado', () => {
  const ok = emitirToken({ papel: 'vendedor', vendedorId: 'tt1' }, 'segredo');
  assert.deepEqual(lerToken(ok, 'segredo'), { papel: 'vendedor', vendedorId: 'tt1' });
  assert.equal(lerToken(ok, 'outro-segredo'), null);
  assert.equal(lerToken(emitirToken({ papel: 'gestor' }, 'segredo', -10), 'segredo'), null);
});
