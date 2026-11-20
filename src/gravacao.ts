// Ticket 00005: grava a mensagem já mascarada, ignora duplicadas e liga a conversa ao vendedor dono do número.
import type pg from 'pg';
import type { MensagemNormalizada } from './fontes/tipos.ts';

export type ResultadoGravacao = 'gravada' | 'duplicada' | 'vendedor_desconhecido';

export async function gravarMensagem(db: pg.Pool, m: MensagemNormalizada): Promise<ResultadoGravacao> {
  const c = await db.connect();
  try {
    await c.query('BEGIN');
    // Vendedor dono do número: instância da Evolution (ou número da Cloud API) cadastrada em vendedores.numero_wa_id.
    const v = await c.query('SELECT id FROM vendedores WHERE numero_wa_id = $1', [m.vendedor]);
    if (!v.rowCount) { await c.query('ROLLBACK'); return 'vendedor_desconhecido'; }
    const vendedorId: string = v.rows[0].id;
    const conv = await c.query(
      `INSERT INTO conversas (vendedor_id, canal, cliente_hmac, ultima_mensagem_em) VALUES ($1, $2, $3, $4)
       ON CONFLICT (vendedor_id, canal, cliente_hmac) DO UPDATE
         SET ultima_mensagem_em = GREATEST(conversas.ultima_mensagem_em, EXCLUDED.ultima_mensagem_em)
       RETURNING id`, [vendedorId, m.canal ?? 'whatsapp', m.clienteHmac, m.enviadaEm]);
    const ins = await c.query(
      `INSERT INTO mensagens (id, conversa_id, vendedor_id, de, enviada_em, texto_mascarado)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
      [m.id, conv.rows[0].id, vendedorId, m.de, m.enviadaEm, m.textoMascarado]);
    await c.query('COMMIT');
    return ins.rowCount ? 'gravada' : 'duplicada';
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}
