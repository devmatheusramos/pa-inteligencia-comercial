// Renderiza a saída REAL dos comandos (evidencias/logs/*.txt) como imagens de terminal, via Edge headless.
// node evidencias/gerar-prints.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const aqui = import.meta.dirname;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const L = (f) => readFileSync(join(aqui, 'logs', f), 'utf8').replace(/\r/g, '').trimEnd();
const P = (f) => readFileSync(join(aqui, '..', f), 'utf8').replace(/\r/g, '').trimEnd();
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const figuras = [
  ['fig10-webhook-recebendo', 'Ticket 00005 | webhook recebendo mensagens (npm run webhook)', `${L('05-webhook-requisicoes.txt')}\n\n--- log do receptor ---\n${L('05-webhook-log.txt')}`],
  ['fig11-banco-mascarado', 'Ticket 00005 | PostgreSQL: texto gravado já mascarado, ligado ao vendedor', `$ psql -c "select ... from mensagens m join conversas c join vendedores v"\n${L('05-banco.txt')}`],
  ['fig12-deduplicacao', 'Ticket 00005 | 30 conversas carregadas duas vezes: a 2ª rodada não duplica nada', `$ node scripts/carregar-fixtures.ts   (1ª vez)\n${L('05-carga-1.txt')}\n\n$ node scripts/carregar-fixtures.ts   (2ª vez, mesmas mensagens)\n${L('05-carga-2-dedup.txt')}`],
  ['fig13-prompt-versionado', 'Ticket 00006 | prompts/analise-v1.md (prompt versionado em arquivo)', P('prompts/analise-v1.md')],
  ['fig14-saida-json', 'Ticket 00006 | saída JSON do analisador para uma conversa (validada por validarSaida)', L('06-json-c01.txt')],
  ['fig15-tabela-analises', 'Ticket 00006 | tabela analises: modelo e versão do prompt gravados', `$ psql -c "select ... from analises"\n${L('06-tabela-analises.txt')}`],
  ['fig16-payload-mascarado', 'Ticket 00006 | só texto mascarado vai ao modelo (scripts/mostrar-payload.ts)', L('06-payload-mascarado.txt')],
  ['fig17-teste-tempo-resposta', 'Ticket 00007 | testes do tempo de resposta (10:00 -> 10:12 = 12 min)', `$ node --test test/indicadores.test.ts\n${L('07-teste-indicadores.txt')}`],
  ['fig18-acesso-gestor', 'Ticket 00007 | GESTOR: API devolve as conversas dos 2 vendedores', L('07-gestor.txt')],
  ['fig19-acesso-vendedor', 'Ticket 00007 | VENDEDOR: só a própria carteira; conversa de outro = 403; sem token = 401', `${L('07-vendedor.txt')}\n\n${L('07-negado.txt')}`],
  ['fig20-gabarito-congelado', 'Ticket 00008 | gabarito revisado (c21 corrigida) e congelado por hash antes de rodar a IA', `$ git diff fixtures/conversas/c21.json   (correção da revisão)\n${L('08-c21-diff.txt')}\n\n$ node scripts/congelar-gabarito.ts\n${L('08-congelar.txt')}\n\n$ node scripts/congelar-gabarito.ts --verificar\n${L('08-verificar.txt')}`],
  ['fig22-testes-todos', 'Fechamento | npm test: todos os testes (inclui PostgreSQL real)', `$ npm test\n${L('99-testes-todos.txt')}`],
  ['fig23-primeira-rodada-ia', 'Ticket 00006 | primeira rodada da IA contra o gabarito congelado (ensaio)', `$ node --env-file=.env scripts/analisar-fixtures.ts\n${L('06-analise.txt')}`],
];

mkdirSync(join(aqui, 'prints'), { recursive: true });
mkdirSync(join(aqui, '_html'), { recursive: true });
for (const [nome, titulo, corpo] of figuras) {
  const linhas = corpo.split('\n');
  const maior = Math.min(Math.max(...linhas.map((l) => l.length)), 150);
  const largura = Math.max(900, Math.min(1500, Math.round(maior * 8.4) + 60));
  const alt = linhas.length * 19 + 80;
  const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#1e1e2e">
<div style="background:#313244;color:#cdd6f4;font:13px Segoe UI,sans-serif;padding:8px 14px;display:flex;gap:8px;align-items:center">
<span style="width:11px;height:11px;border-radius:50%;background:#f38ba8"></span><span style="width:11px;height:11px;border-radius:50%;background:#f9e2af"></span><span style="width:11px;height:11px;border-radius:50%;background:#a6e3a1"></span><b style="margin-left:10px">${esc(titulo)}</b></div>
<pre style="margin:0;padding:14px;color:#cdd6f4;font:13px/19px Consolas,'Courier New',monospace;white-space:pre-wrap;word-break:break-all">${esc(corpo)}</pre></body>`;
  const arq = join(aqui, '_html', `${nome}.html`);
  writeFileSync(arq, html);
  execFileSync(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${largura},${alt}`, `--screenshot=${join(aqui, 'prints', nome + '.png')}`, 'file:///' + arq.replace(/\\/g, '/')], { stdio: 'ignore' });
  console.log('gerado', nome + '.png');
}
