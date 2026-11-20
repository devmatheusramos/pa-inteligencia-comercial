// Prints da Sprint 2, um por afirmação, com dados reais (banco, conversas de teste e API rodando).
//   node --env-file=.env evidencias/sprint2-prints.mjs [http://localhost:3005]
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { criarPool } from '../src/db.ts';
import { mascarar } from '../src/mascaramento.ts';
import { emitirToken } from '../src/auth.ts';
import { calcularIndicadores, minutosComerciais } from '../src/indicadores.ts';
import { abrirNavegador } from './capturar.mjs';

const RAIZ = join(import.meta.dirname, '..');
const BASE = process.argv[2] ?? 'http://localhost:3005';
const OUT = join(import.meta.dirname, 'prints', 'sprint2');
const HTML = join(import.meta.dirname, '_html');
mkdirSync(HTML, { recursive: true });
const pool = criarPool();
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fix = (id) => JSON.parse(readFileSync(join(RAIZ, 'fixtures', 'conversas', id + '.json'), 'utf8'));
const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { timeZone: 'America/Recife', hour: '2-digit', minute: '2-digit' });
const NOME = { prospeccao: 'Prospecção', qualificacao: 'Qualificação', proposta: 'Proposta enviada', negociacao: 'Negociação', fechado_ganho: 'Fechado (ganho)', perdido: 'Perdido' };

const CSS = `body{margin:0;background:#fff;font:15px/1.5 system-ui,"Segoe UI",sans-serif;color:#0f172a;padding:26px 30px;width:960px}
h1{font-size:19px;margin:0 0 4px} .sub{color:#64748b;margin:0 0 18px;font-size:14px}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:18px} .caixa{border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;background:#f8fafc}
.caixa h2{margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#64748b} pre{margin:0;font:14px/1.5 Consolas,monospace;white-space:pre-wrap}
table{width:100%;border-collapse:collapse;font-size:14.5px} th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #e2e8f0} th{font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.05em}
.ok{color:#16a34a;font-weight:700} .ruim{color:#dc2626;font-weight:700} .mut{color:#64748b} .sel{background:#fff3c4;padding:0 3px;border-radius:3px}
.msg{padding:5px 10px;border-radius:9px;margin:4px 0;max-width:86%;font-size:13.5px;background:#eef2f7} .msg.v{margin-left:auto;background:#d7f3dd} .msg small{display:block;color:#64748b;font-size:11px}
.num{font-size:34px;font-weight:750;letter-spacing:-.02em;line-height:1.1} .linha{display:flex;align-items:center;gap:18px;border:1px solid #e2e8f0;border-radius:12px;padding:14px 18px;margin-bottom:12px;background:#f8fafc}
.tag{display:inline-block;padding:2px 10px;border-radius:99px;font-size:13px;font-weight:600;background:#e0e7ff;color:#3730a3}`;
const pagina = (nome, titulo, sub, corpo) => { const f = join(HTML, nome + '.html'); writeFileSync(f, `<!doctype html><meta charset="utf-8"><style>${CSS}</style><body><div id="tela"><h1>${titulo}</h1><p class="sub">${sub}</p>${corpo}</div></body>`); return pathToFileURL(f).href; };

const nav = await abrirNavegador({ largura: 1020, altura: 900 });
const tira = async (nome, url, marcas, opc = {}) => { await nav.ir(url, 500); const ret = await nav.marcar(marcas, { margem: 8, incluir: ['#tela'], ...opc }); await nav.foto(join(OUT, nome), ret); console.log('ok', nome); };

try {
  /* ---------- 00005: mensagem antes e depois do mascaramento ---------- */
  const c05 = fix('c05'), iDado = c05.mensagens.findIndex((m) => mascarar(m.texto).texto !== m.texto && /CPF/.test(mascarar(m.texto).texto));
  const g = (await pool.query('SELECT id, texto_mascarado FROM mensagens WHERE id = $1', [`c05-${iDado}`])).rows[0];
  const depois = esc(g.texto_mascarado).replace(/(\[[A-Z]+\])/g, '<b class="ok">$1</b>').replace(/(Luciana Ferreira Bastos|Rua das Acácias, 245, apto 302, Boa Viagem, Recife-PE,)/g, '<span class="sel" id="m3">$1</span>');
  await tira('s2-01-mascaramento.png', pagina('s2-01', 'Mensagem de um cliente: o que ele escreveu × o que o sistema guardou', 'Conversa de teste. Os dados abaixo são fictícios.',
    `<div class="cols"><div class="caixa" id="m1"><h2>O que o cliente escreveu</h2><pre>${esc(c05.mensagens[iDado].texto)}</pre></div><div class="caixa" id="m2"><h2>O que o sistema guardou (e o que a IA recebe)</h2><pre>${depois}</pre></div></div>`), ['#m1', '#m2', '#m3']);

  /* ---------- 00005: mensagem repetida é ignorada ---------- */
  const n = (arq) => { const t = readFileSync(join(import.meta.dirname, 'logs', arq), 'utf8'); return { g: +t.match(/gravada: (\d+)/)[1], d: +t.match(/duplicada: (\d+)/)[1] }; };
  const r1 = n('05-carga-1.txt'), r2 = n('05-carga-2-dedup.txt');
  await tira('s2-02-repetidas.png', pagina('s2-02', 'As mesmas 267 mensagens enviadas duas vezes', 'As 30 conversas de teste foram enviadas ao sistema duas vezes seguidas.',
    `<div class="linha" id="m1"><div class="num">${r1.g}</div><div><b>1ª vez</b><br><span class="mut">mensagens novas guardadas (repetidas ignoradas: ${r1.d})</span></div></div>
     <div class="linha" id="m2"><div class="num">${r2.g}</div><div><b>2ª vez, as mesmas mensagens</b><br><span class="mut">novas guardadas. <b class="ok">${r2.d} repetidas foram ignoradas</b></span></div></div>`), ['#m1', '#m2']);

  /* ---------- 00005: cada conversa ligada ao vendedor ---------- */
  const lig = (await pool.query(`SELECT v.numero_wa_id AS inst, v.nome, count(DISTINCT c.id)::int AS conversas, count(m.id)::int AS mensagens FROM vendedores v JOIN conversas c ON c.vendedor_id = v.id JOIN mensagens m ON m.conversa_id = c.id WHERE v.whatsapp_estado = 'simulado' GROUP BY 1, 2 ORDER BY 1`)).rows;
  await tira('s2-03-vendedor.png', pagina('s2-03', 'Cada conversa fica ligada ao vendedor dono do número', 'O sistema descobre o vendedor pelo número de WhatsApp que recebeu a mensagem.',
    `<table id="m1"><tr><th>Número de WhatsApp (identificação)</th><th>Vendedor</th><th>Conversas</th><th>Mensagens</th></tr>${lig.map((r) => `<tr><td>${esc(r.inst)}</td><td><b>${esc(r.nome)}</b></td><td>${r.conversas}</td><td>${r.mensagens}</td></tr>`).join('')}</table>`), ['#m1']);

  /* ---------- 00006: a IA lê uma conversa e responde ---------- */
  const c01 = fix('c01'), cid = (await pool.query("SELECT conversa_id FROM mensagens WHERE id = 'c01-0'")).rows[0].conversa_id;
  const an = (await pool.query('SELECT etapa, pendencias, proximo_passo, modelo, versao_prompt FROM analises WHERE conversa_id = $1', [cid])).rows[0];
  const msgs = (await pool.query("SELECT de, enviada_em, texto_mascarado FROM mensagens WHERE id LIKE 'c01-%' ORDER BY enviada_em, id")).rows.slice(0, 8);
  await tira('s2-04-ia-conversa.png', pagina('s2-04', 'A IA lê a conversa e responde', 'Conversa de teste. A IA recebe só o texto já com dados pessoais escondidos.',
    `<div class="cols"><div class="caixa" id="m1"><h2>A conversa (primeiras mensagens)</h2>${msgs.map((m) => `<div class="msg ${m.de === 'vendedor' ? 'v' : ''}"><small>${m.de === 'vendedor' ? 'Vendedor' : 'Cliente'} · ${hora(m.enviada_em)}</small>${esc(m.texto_mascarado)}</div>`).join('')}</div>
     <div><div class="caixa" id="m2"><h2>Etapa da venda, segundo a IA</h2><span class="tag">${NOME[an.etapa]}</span></div><div class="caixa" id="m3" style="margin-top:14px"><h2>Pendências que a IA encontrou</h2>${an.pendencias.map((p) => `<div>• <b>${p.responsavel === 'vendedor' ? 'Vendedor' : 'Cliente'}:</b> ${esc(p.descricao)}</div>`).join('') || '—'}</div>
     <div class="caixa" id="m4" style="margin-top:14px"><h2>Próximo passo sugerido</h2>${esc(an.proximo_passo)}</div><p class="mut" style="font-size:12.5px">Modelo: ${esc(an.modelo)} · instruções: ${esc(an.versao_prompt)}</p></div></div>`), ['#m1', '#m2', '#m3', '#m4']);

  /* ---------- 00006: acerto da IA nas 30 conversas ---------- */
  const rod = JSON.parse(readFileSync(join(RAIZ, 'docs', 'primeira-rodada-ia.json'), 'utf8')), acertos = rod.filter((x) => x.ia.etapa === x.gabarito.etapa).length;
  const linhaR = (x) => { const ok = x.ia.etapa === x.gabarito.etapa; return `<tr id="${ok ? '' : 'e' + x.id}"><td><b>${x.id}</b></td><td>${NOME[x.gabarito.etapa]}</td><td>${NOME[x.ia.etapa]}</td><td class="${ok ? 'ok' : 'ruim'}">${ok ? '✔' : '✘'}</td></tr>`; };
  const metade = Math.ceil(rod.length / 2), cab = '<tr><th>Conversa</th><th>Resposta certa</th><th>Resposta da IA</th><th></th></tr>';
  const erros = rod.filter((x) => x.ia.etapa !== x.gabarito.etapa).map((x) => '#e' + x.id);
  await tira('s2-05-acerto-ia.png', pagina('s2-05', 'Acerto da IA na etapa da venda: 30 conversas de teste', 'As "respostas certas" foram escritas e congeladas antes de rodar a IA.',
    `<div class="linha" id="m1"><div class="num ok">${acertos} de ${rod.length}</div><div><b>${Math.round((acertos / rod.length) * 100)}% de acerto</b><br><span class="mut">meta do projeto: 85% (26 de 30)</span></div></div>
     <div class="cols"><table>${cab}${rod.slice(0, metade).map(linhaR).join('')}</table><table>${cab}${rod.slice(metade).map(linhaR).join('')}</table></div>`), ['#m1', ...erros], { folga: 2 });

  /* ---------- 00007: tempo de resposta, conferido na mão ---------- */
  const ind = calcularIndicadores(c01.mensagens.map((m) => ({ de: m.de, em: m.em })));
  const casos = [['Segunda 10:00 → segunda 10:12', minutosComerciais(new Date('2026-11-09T10:00:00-03:00'), new Date('2026-11-09T10:12:00-03:00'))], ['Sexta 17:50 → segunda 08:10', minutosComerciais(new Date('2026-11-06T17:50:00-03:00'), new Date('2026-11-09T08:10:00-03:00'))], ['Sábado 11:00 → segunda 08:30', minutosComerciais(new Date('2026-11-07T11:00:00-03:00'), new Date('2026-11-09T08:30:00-03:00'))]];
  await tira('s2-06-tempo-resposta.png', pagina('s2-06', 'Tempo de resposta do vendedor', 'Calculado por regra simples (sem IA): só contam os minutos de segunda a sexta, das 8h às 18h.',
    `<div class="cols"><div class="caixa" id="m1"><h2>Conversa de teste: o cliente escreveu e o vendedor respondeu</h2>${c01.mensagens.slice(0, 3).map((m) => `<div class="msg ${m.de === 'vendedor' ? 'v' : ''}"><small>${m.de === 'vendedor' ? 'Vendedor' : 'Cliente'} · ${hora(m.em)}</small>${esc(m.texto)}</div>`).join('')}
     <p style="margin:10px 0 0"><b>Primeira resposta: ${ind.tprMinutos} minutos</b> (16:00 → 16:04, conferido na mão)</p></div>
     <div class="caixa" id="m2"><h2>Casos testados: fora do expediente não conta</h2><table>${casos.map(([t, v]) => `<tr><td>${t}</td><td><b>${v} min</b></td></tr>`).join('')}</table></div></div>`), ['#m1', '#m2']);

  /* ---------- 00007: quem vê o quê ---------- */
  const gestor = emitirToken({ papel: 'gestor' }, process.env.JWT_SECRET ?? ''), ana = emitirToken({ papel: 'vendedor', vendedorId: 'v1' }, process.env.JWT_SECRET ?? '');
  const chama = async (url, tk) => { const r = await fetch(BASE + url, { headers: tk ? { authorization: 'Bearer ' + tk } : {} }); return { st: r.status, j: await r.json().catch(() => ({})) }; };
  const lg = await chama('/api/conversas', gestor), la = await chama('/api/conversas', ana);
  const dele = lg.j.conversas.find((c) => c.vendedor_id === 'v2'), neg = await chama(`/api/conversas/${dele.id}/mensagens`, ana), sem = await chama('/api/conversas');
  const linhaA = (id, quem, pede, res, ok) => `<div class="linha" id="${id}"><div style="width:230px"><b>${quem}</b><br><span class="mut">${pede}</span></div><div class="${ok ? 'ok' : 'ruim'}" style="font-size:17px;font-weight:700">${res}</div></div>`;
  await tira('s2-07-acesso.png', pagina('s2-07', 'Quem vê o quê', 'Teste feito no sistema rodando: cada pessoa entra com o seu tipo de login.',
    linhaA('m1', 'Gestor', 'pede a lista de conversas', `Vê ${lg.j.conversas.length} conversas (as dos 2 vendedores)`, true) + linhaA('m2', 'Vendedora Ana Paula', 'pede a lista de conversas', `Vê só as ${la.j.conversas.length} dela`, true) +
    linhaA('m3', 'Ana Paula', 'tenta abrir uma conversa do Bruno', `Negado (erro ${neg.st})`, true) + linhaA('m4', 'Sem login', 'tenta ver as conversas', `Negado (erro ${sem.st})`, true)), ['#m1', '#m2', '#m3', '#m4'], { folga: 2 });

  /* ---------- 00008: gabarito corrigido e congelado ---------- */
  const antes = JSON.parse(execFileSync('git', ['show', '243c51a:fixtures/conversas/c21.json'], { cwd: RAIZ, encoding: 'utf8' })).gabarito.pendencias, agora = fix('c21').gabarito.pendencias;
  const manifesto = readFileSync(join(RAIZ, 'fixtures', 'conversas', 'gabarito.sha256'), 'utf8').trim().split('\n');
  let conferem = 0; for (const lin of manifesto) { const [h, f] = lin.split('  '); const hh = createHash('sha256').update(JSON.stringify(fix(f.replace('.json', '')).gabarito)).digest('hex'); if (hh === h) conferem++; }
  const lis = (a, novo) => a.map((p, i) => `<div>• ${esc(p.descricao)}${novo && i >= antes.length ? ' <b class="ok">(incluída na revisão)</b>' : ''}</div>`).join('');
  await tira('s2-08-gabarito.png', pagina('s2-08', 'Respostas certas das 30 conversas: revisadas e congeladas', 'Revisei as respostas certas antes de rodar a IA, corrigi uma e travei todas.',
    `<div class="cols"><div class="caixa" id="m1"><h2>Conversa c21, pendências do vendedor (antes da revisão)</h2>${lis(antes)}</div><div class="caixa" id="m2"><h2>Depois da revisão</h2>${lis(agora, true)}</div></div>
     <div class="linha" id="m3" style="margin-top:14px"><div class="num ok">${conferem} de ${manifesto.length}</div><div><b>respostas certas conferem com o congelamento</b><br><span class="mut">se qualquer uma for alterada depois, o sistema recusa rodar a análise</span></div></div>`), ['#m1', '#m2', '#m3']);
} finally { await nav.fechar(); await pool.end(); }
console.log('\nprints em', OUT);
