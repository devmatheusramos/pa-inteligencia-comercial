// Prints do ticket 00010 (acerto final da IA) e 00011 (nome e endereço escondidos), com dados reais.
//   node --env-file=.env evidencias/sprint3-resultados.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { criarPool } from '../src/db.ts';
import { mascarar } from '../src/mascaramento.ts';
import { abrirNavegador } from './capturar.mjs';

const RAIZ = join(import.meta.dirname, '..'), OUT = join(import.meta.dirname, 'prints', 'sprint3'), HTML = join(import.meta.dirname, '_html');
mkdirSync(HTML, { recursive: true });
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const NOME = { prospeccao: 'Prospecção', qualificacao: 'Qualificação', proposta: 'Proposta enviada', negociacao: 'Negociação', fechado_ganho: 'Fechado (ganho)', perdido: 'Perdido' };
const CSS = `body{margin:0;background:#fff;font:15px/1.5 system-ui,"Segoe UI",sans-serif;color:#0f172a;padding:26px 30px;width:960px}h1{font-size:19px;margin:0 0 4px}.sub{color:#64748b;margin:0 0 18px;font-size:14px}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:18px}.caixa{border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;background:#f8fafc}.caixa h2{margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#64748b}
pre{margin:0;font:14px/1.5 Consolas,monospace;white-space:pre-wrap}table{width:100%;border-collapse:collapse;font-size:14.5px}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #e2e8f0}th{font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.05em}
.ok{color:#16a34a;font-weight:700}.ruim{color:#dc2626;font-weight:700}.mut{color:#64748b}.sel{background:#fde68a;padding:0 3px;border-radius:3px}.mk{color:#16a34a;font-weight:700}
.num{font-size:34px;font-weight:750;letter-spacing:-.02em;line-height:1.1}.linha{display:flex;align-items:center;gap:18px;border:1px solid #e2e8f0;border-radius:12px;padding:14px 18px;margin-bottom:12px;background:#f8fafc}`;
const pagina = (nome, titulo, sub, corpo) => { const f = join(HTML, nome + '.html'); writeFileSync(f, `<!doctype html><meta charset="utf-8"><style>${CSS}</style><body><div id="tela"><h1>${titulo}</h1><p class="sub">${sub}</p>${corpo}</div></body>`); return pathToFileURL(f).href; };
const nav = await abrirNavegador({ largura: 1020, altura: 900 });
const tira = async (nome, url, marcas, opc = {}) => { await nav.ir(url, 500); await nav.foto(join(OUT, nome), await nav.marcar(marcas, { margem: 8, incluir: ['#tela'], ...opc })); console.log('ok', nome); };
const pool = criarPool();

try {
  /* ---- 00010: acerto final da IA ---- */
  const rod = JSON.parse(readFileSync(join(RAIZ, 'docs', 'primeira-rodada-ia.json'), 'utf8')), antes = JSON.parse(readFileSync(join(RAIZ, 'docs', 'primeira-rodada-ia-antes-da-mascara-de-nome.json'), 'utf8'));
  const acertos = (r) => r.filter((x) => x.ia.etapa === x.gabarito.etapa).length, a = acertos(rod), a0 = acertos(antes);
  const linha = (x) => { const ok = x.ia.etapa === x.gabarito.etapa; return `<tr id="${ok ? '' : 'e' + x.id}"><td><b>${x.id}</b></td><td>${NOME[x.gabarito.etapa]}</td><td>${NOME[x.ia.etapa]}</td><td class="${ok ? 'ok' : 'ruim'}">${ok ? '✔' : '✘'}</td></tr>`; };
  const cab = '<tr><th>Conversa</th><th>Resposta certa</th><th>Resposta da IA</th><th></th></tr>', m = Math.ceil(rod.length / 2);
  await tira('s3-08-acerto-final.png', pagina('s3-08', 'Acerto final da IA na etapa da venda: 30 conversas de teste', 'Com nome e endereço dos clientes já escondidos antes de a IA ler. As respostas certas são as mesmas, travadas desde a Sprint 2.',
    `<div class="linha" id="m1"><div class="num ${a >= 26 ? 'ok' : 'ruim'}">${a} de ${rod.length}</div><div><b>${(a / rod.length * 100).toFixed(1).replace('.', ',')}% de acerto</b><br><span class="mut">meta do projeto: 85% (26 de 30). No ensaio da Sprint 2, sem esconder nomes, foram ${a0} de 30.</span></div></div>
     <div class="cols"><table>${cab}${rod.slice(0, m).map(linha).join('')}</table><table>${cab}${rod.slice(m).map(linha).join('')}</table></div>`),
    ['#m1', ...rod.filter((x) => x.ia.etapa !== x.gabarito.etapa).map((x) => '#e' + x.id)], { folga: 2 });

  /* ---- 00011: nome e endereço escondidos ---- */
  execFileSync('git', ['show', 'b5bc8c0:src/mascaramento.ts'], { cwd: RAIZ }); // confirma que a versão antiga existe
  writeFileSync(join(HTML, 'mascaramento-antigo.ts'), execFileSync('git', ['show', 'b5bc8c0:src/mascaramento.ts'], { cwd: RAIZ, encoding: 'utf8' }));
  const { mascarar: antigo } = await import(pathToFileURL(join(HTML, 'mascaramento-antigo.ts')).href);
  const conv = readdirSync(join(RAIZ, 'fixtures', 'conversas')).filter((f) => /^c\d+\.json$/.test(f)).sort().map((f) => JSON.parse(readFileSync(join(RAIZ, 'fixtures', 'conversas', f), 'utf8')));
  const sa = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const temNome = (c, t) => c.cliente.nome.split(/\s+/).filter((w) => sa(w).length >= 3).some((w) => new RegExp(`(?<![a-z])${sa(w)}(?![a-z])`).test(sa(t)));
  let nAntes = 0, nDepois = 0, total = 0;
  for (const c of conv) for (const mm of c.mensagens) { total++; if (temNome(c, antigo(mm.texto).texto)) nAntes++; if (temNome(c, mascarar(mm.texto, { nomes: [c.cliente.nome] }).texto)) nDepois++; }
  const c05 = conv.find((c) => c.id === 'c05'), i05 = c05.mensagens.findIndex((mm) => /Rua das/.test(mm.texto));
  const cx = conv.find((c) => c.mensagens.some((mm) => mm.de === 'vendedor' && temNome(c, antigo(mm.texto).texto))), ix = cx.mensagens.findIndex((mm) => mm.de === 'vendedor' && temNome(cx, antigo(mm.texto).texto));
  const mark = (t) => esc(t).replace(/(\[[A-Z]+\])/g, '<b class="mk">$1</b>');
  const antes05 = esc(antigo(c05.mensagens[i05].texto).texto), antesX = esc(antigo(cx.mensagens[ix].texto).texto);
  const dep05 = mascarar(c05.mensagens[i05].texto, { nomes: [c05.cliente.nome] }).texto, depX = mascarar(cx.mensagens[ix].texto, { nomes: [cx.cliente.nome] }).texto;
  const sombra = (t) => t.replace(/(Luciana Ferreira Bastos|Rua das Acácias, 245, apto 302, Boa Viagem, Recife-PE,)/g, '<span class="sel">$1</span>');
  await tira('s3-09-mascara-nome-endereco.png', pagina('s3-09', 'Nome e endereço agora também são escondidos', 'Conversas de teste, dados fictícios. À esquerda, como era; à direita, como ficou, e é o que a IA recebe.',
    `<div class="cols"><div class="caixa" id="m1"><h2>Antes: nome e endereço à vista</h2><pre>${sombra(antes05)}</pre><p class="mut" style="margin:10px 0 0;font-size:13px">e na fala do vendedor:</p><pre>${esc(antesX).replace(/(Lúcia|Luciana|Patrícia|Juliana|Mariana|Ana|Carla|Dona \S+)/g, '<span class="sel">$1</span>')}</pre></div>
     <div class="caixa" id="m2"><h2>Depois: escondidos</h2><pre>${mark(dep05)}</pre><p class="mut" style="margin:10px 0 0;font-size:13px">e na fala do vendedor:</p><pre>${mark(depX)}</pre></div></div>
     <div class="linha" id="m3" style="margin-top:14px"><div class="num ok">${nAntes} → ${nDepois}</div><div><b>mensagens com o nome do cliente à vista</b><br><span class="mut">nas ${total} mensagens das 30 conversas de teste</span></div></div>`), ['#m1', '#m2', '#m3'], { folga: 3 });
  console.log(JSON.stringify({ a, a0, nAntes, nDepois, total }));
} finally { await nav.fechar(); await pool.end(); }
