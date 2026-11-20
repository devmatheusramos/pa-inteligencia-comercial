// API de leitura e painel (tickets 00007 e 00009). O filtro por perfil é feito pelo próprio banco (RLS), além do token.
//   GET /api/conversas                  conversas visíveis ao perfil, com indicadores
//   GET /api/conversas/:id/mensagens    mensagens de uma conversa (403 se não for do perfil)
//   POST /api/login-dev                 só com DEV_LOGIN=1: token de desenvolvimento no lugar do Cognito
//   GET /                               painel (public/index.html)
//   Gestor:   GET|POST /api/vendedores, GET /api/vendedores/:id/conexao, GET /api/agentes
//   Vendedor (sem login, pelo link de convite): GET /conectar/:token e GET /api/convite/:token
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type pg from 'pg';
import { emitirToken, lerToken } from './auth.ts';
import { comPerfil, criarPool } from './db.ts';
import { calcularIndicadores } from './indicadores.ts';
import { criarEvolutionAdmin, type EvolutionAdmin } from './conectores/evolution-admin.ts';
import { cadastrarVendedor, conexaoDoVendedor, listarVendedores, resumoDosAgentes } from './vendedores.ts';

const json = (res: ServerResponse, status: number, corpo: unknown) =>
  void res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }).end(JSON.stringify(corpo));

const lerCorpo = async (req: IncomingMessage) => {
  const partes: Buffer[] = []; let total = 0;
  for await (const c of req) { total += (c as Buffer).length; if (total > 10_000) throw new Error('corpo grande demais'); partes.push(c as Buffer); }
  return JSON.parse(Buffer.concat(partes).toString('utf8') || '{}');
};
const pagina = (res: ServerResponse, arquivo: string) =>
  void res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(readFileSync(join(import.meta.dirname, '..', 'public', arquivo)));

// Versão do contrato da API. O painel pergunta por ela: se não existir, está falando com uma API antiga (processo esquecido de antes).
export const VERSAO_API = 'painel-2026-11-19';

export function criarApi(pool: pg.Pool, segredo: string, evo: EvolutionAdmin = criarEvolutionAdmin()) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', 'http://localhost');

    if (req.method === 'GET' && url.pathname === '/api/versao') return json(res, 200, { versao: VERSAO_API });
    if (req.method === 'GET' && url.pathname === '/') return pagina(res, 'index.html');

    // Link de convite: o vendedor abre, vê o QR code e conecta o próprio WhatsApp. O token (24 hex) é o segredo.
    if (req.method === 'GET' && /^\/conectar\/[0-9a-f]{24}$/.test(url.pathname)) return pagina(res, 'conectar.html');
    const convite = url.pathname.match(/^\/api\/convite\/([0-9a-f]{24})$/);
    if (req.method === 'GET' && convite) {
      const c = await conexaoDoVendedor(pool, evo, { convite: convite[1] });
      return c ? json(res, 200, { nome: c.nome, estado: c.estado, qr: c.qr, aviso: c.aviso }) : json(res, 404, { erro: 'convite inválido' });
    }
    // Login de desenvolvimento (substitui o Cognito no MVP local). Desligado por padrão.
    if (req.method === 'POST' && url.pathname === '/api/login-dev') {
      if (process.env.DEV_LOGIN !== '1') return json(res, 404, { erro: 'rota não encontrada' });
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(c as Buffer);
      const { perfil: quem } = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
      const token = quem === 'gestor' ? emitirToken({ papel: 'gestor' }, segredo)
        : typeof quem === 'string' && /^v\d+$/.test(quem) ? emitirToken({ papel: 'vendedor', vendedorId: quem }, segredo) : null;
      return token ? json(res, 200, { token }) : json(res, 400, { erro: 'perfil inválido' });
    }

    const perfil = lerToken(req.headers.authorization, segredo);
    if (!perfil) return json(res, 401, { erro: 'não autenticado' });

    if (req.method === 'GET' && url.pathname === '/api/conversas') {
      const dados = await comPerfil(pool, perfil, async (c) => {
        const conv = await c.query(
          `SELECT c.id, c.vendedor_id, v.nome AS vendedor, c.canal, c.ultima_mensagem_em, a.etapa, a.pendencias, a.proximo_passo, a.resumo,
                  (SELECT json_agg(x ORDER BY x.t) FROM (SELECT m.de, left(m.texto_mascarado, 130) AS texto, m.enviada_em AS t FROM mensagens m WHERE m.conversa_id = c.id ORDER BY m.enviada_em DESC, m.id DESC LIMIT 3) x) AS ultimas,
                  (SELECT left(texto_mascarado, 140) FROM mensagens m WHERE m.conversa_id = c.id AND m.de = 'cliente' ORDER BY m.enviada_em, m.id LIMIT 1) AS previa,
                  (SELECT m.de FROM mensagens m WHERE m.conversa_id = c.id ORDER BY m.enviada_em DESC, m.id DESC LIMIT 1) AS ultima_de
             FROM conversas c JOIN vendedores v ON v.id = c.vendedor_id
             LEFT JOIN analises a ON a.conversa_id = c.id ORDER BY c.id`);
        const msgs = await c.query('SELECT conversa_id, de, enviada_em, texto_mascarado FROM mensagens ORDER BY enviada_em');
        return conv.rows.map((r) => ({
          ...r,
          ...calcularIndicadores(msgs.rows.filter((m) => m.conversa_id === r.id).map((m) => ({ de: m.de, em: m.enviada_em.toISOString(), texto: m.texto_mascarado }))),
        }));
      });
      return json(res, 200, { papel: perfil.papel, total: dados.length, conversas: dados });
    }

    // ---- áreas só do gestor ----
    if (url.pathname.startsWith('/api/vendedores') || url.pathname === '/api/agentes') {
      if (perfil.papel !== 'gestor') return json(res, 403, { erro: 'somente o gestor' });
      try {
        if (req.method === 'GET' && url.pathname === '/api/agentes') return json(res, 200, await resumoDosAgentes(pool));
        if (req.method === 'GET' && url.pathname === '/api/vendedores') return json(res, 200, { vendedores: await listarVendedores(pool) });
        if (req.method === 'POST' && url.pathname === '/api/vendedores') return json(res, 201, await cadastrarVendedor(pool, evo, await lerCorpo(req)));
        const cx = url.pathname.match(/^\/api\/vendedores\/(v\d+)\/conexao$/);
        if (req.method === 'GET' && cx) { const c = await conexaoDoVendedor(pool, evo, { id: cx[1] }); return c ? json(res, 200, c) : json(res, 404, { erro: 'vendedor não encontrado' }); }
      } catch (e: any) { return json(res, 400, { erro: e.message }); }
      return json(res, 404, { erro: 'rota não encontrada' });
    }

    const m = url.pathname.match(/^\/api\/conversas\/(\d+)\/mensagens$/);
    if (req.method === 'GET' && m) {
      const linhas = await comPerfil(pool, perfil, async (c) =>
        (await c.query('SELECT id, de, enviada_em, texto_mascarado FROM mensagens WHERE conversa_id = $1 ORDER BY enviada_em', [m[1]])).rows);
      // RLS esconde conversa de outro vendedor: do lado de fora ela "não existe".
      if (!linhas.length) return json(res, 403, { erro: 'sem acesso a esta conversa (ou ela não existe)' });
      return json(res, 200, { mensagens: linhas });
    }
    json(res, 404, { erro: 'rota não encontrada' });
  };
}

if (import.meta.main) {
  const pool = criarPool();
  const tratar = criarApi(pool, process.env.JWT_SECRET ?? '');
  const porta = Number(process.env.API_PORT ?? 3001);
  const servidor = createServer((req, res) => void tratar(req, res).catch((e) => { console.error('[api] erro', e.message); json(res, 500, { erro: 'erro interno' }); }));
  servidor.on('error', (e: NodeJS.ErrnoException) => {
    if (e.code === 'EADDRINUSE') console.error(`[api] a porta ${porta} já está em uso, provavelmente por uma API antiga. Feche-a ou use outra: API_PORT=3010 npm run api`);
    else console.error('[api] erro', e.message);
    process.exit(1);
  });
  servidor.listen(porta, () => console.log(`[api] ouvindo em http://localhost:${porta}/  (painel e API, versão ${VERSAO_API})`));
}
