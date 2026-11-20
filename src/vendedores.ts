// Cadastro de vendedores (gestor): nome + celular, instância do WhatsApp e link de convite para o vendedor ler o QR code.
import { randomBytes } from 'node:crypto';
import type pg from 'pg';
import { EvolutionIndisponivel, type EvolutionAdmin } from './conectores/evolution-admin.ts';

// Aceita (81) 98888-7777, 81988887777, +55 81 98888-7777 e devolve 5581988887777.
export function normalizarTelefone(bruto: string): string {
  let d = String(bruto ?? '').replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) d = '55' + d;
  if (!/^55\d{10,11}$/.test(d)) throw new Error('Celular inválido. Use DDD + número, por exemplo (81) 98888-7777.');
  if (d.length === 13 && d[4] !== '9') throw new Error('Celular inválido: com 11 dígitos o número começa com 9 depois do DDD.');
  return d;
}

export async function listarVendedores(pool: pg.Pool) {
  const r = await pool.query(
    `SELECT v.id, v.nome, v.telefone, v.whatsapp_estado AS estado, v.convite_token, v.criado_em,
            (SELECT count(*)::int FROM conversas c WHERE c.vendedor_id = v.id) AS conversas
       FROM vendedores v ORDER BY v.criado_em, v.id`);
  return r.rows;
}

export async function cadastrarVendedor(pool: pg.Pool, evo: EvolutionAdmin, entrada: { nome: string; telefone: string }) {
  const nome = String(entrada.nome ?? '').trim();
  if (nome.length < 2 || nome.length > 60) throw new Error('Informe o nome do vendedor (2 a 60 caracteres).');
  const telefone = normalizarTelefone(entrada.telefone);
  if ((await pool.query('SELECT 1 FROM vendedores WHERE telefone = $1', [telefone])).rowCount) throw new Error('Já existe um vendedor com esse celular.');

  const prox = await pool.query("SELECT coalesce(max(substring(id from 2)::int), 0) + 1 AS n FROM vendedores WHERE id ~ '^v[0-9]+$'");
  const id = 'v' + prox.rows[0].n, instancia = 'vendedor-' + id, convite = randomBytes(12).toString('hex');
  await pool.query('INSERT INTO vendedores (id, nome, numero_wa_id, telefone, convite_token) VALUES ($1, $2, $3, $4, $5)', [id, nome, instancia, telefone, convite]);

  let aviso: string | null = null;
  try { await evo.criarInstancia(instancia); }
  catch (e) { aviso = e instanceof EvolutionIndisponivel ? e.message : 'Não foi possível criar a conexão do WhatsApp agora; tente reexibir o QR code em instantes.'; }
  return { id, nome, telefone, estado: 'aguardando', convite_token: convite, aviso };
}

// Estado + QR de um vendedor (por id, para o gestor, ou pelo token do convite, para o próprio vendedor).
export async function conexaoDoVendedor(pool: pg.Pool, evo: EvolutionAdmin, onde: { id?: string; convite?: string }) {
  const r = await pool.query(
    onde.id ? 'SELECT id, nome, numero_wa_id FROM vendedores WHERE id = $1' : 'SELECT id, nome, numero_wa_id FROM vendedores WHERE convite_token = $1',
    [onde.id ?? onde.convite]);
  if (!r.rowCount) return null;
  const v = r.rows[0];
  let estado: string, qr: string | null = null, aviso: string | null = null;
  try {
    estado = await evo.estado(v.numero_wa_id);
    if (estado !== 'conectado') {
      qr = await evo.qr(v.numero_wa_id);
      if (!qr) { await evo.criarInstancia(v.numero_wa_id); qr = await evo.qr(v.numero_wa_id); }
    }
  } catch (e) {
    estado = 'aguardando'; aviso = e instanceof EvolutionIndisponivel ? e.message : 'Não consegui obter o QR code agora.';
  }
  await pool.query('UPDATE vendedores SET whatsapp_estado = $2 WHERE id = $1 AND whatsapp_estado <> $2 AND whatsapp_estado <> $3', [v.id, estado, 'simulado']);
  return { id: v.id, nome: v.nome, estado, qr, aviso };
}

// Números para a tela de "agentes": tudo vem do banco, nada inventado.
export async function resumoDosAgentes(pool: pg.Pool) {
  const q = async (sql: string) => (await pool.query(sql)).rows;
  const [[m], [a], recentes, porEstado] = await Promise.all([
    q(`SELECT count(*)::int AS mensagens, max(enviada_em) AS ultima,
              count(*) FILTER (WHERE texto_mascarado ~ '\\[(EMAIL|CPF|CNPJ|TELEFONE|CEP|CARTAO|PIX)\\]')::int AS protegidas FROM mensagens`),
    q(`SELECT count(*)::int AS analises, max(analisada_em) AS ultima, string_agg(DISTINCT modelo || ' · ' || versao_prompt, ', ') AS modelos FROM analises`),
    q(`SELECT conversa_id, etapa, analisada_em FROM analises ORDER BY analisada_em DESC, conversa_id LIMIT 8`),
    q(`SELECT whatsapp_estado AS estado, count(*)::int AS n FROM vendedores GROUP BY 1`),
  ]);
  return { leitor: m, analista: a, recentes, vendedores: Object.fromEntries(porEstado.map((r: any) => [r.estado, r.n])) };
}
