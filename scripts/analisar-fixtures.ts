// Ticket 00006: roda o analisador (LLM) sobre as 30 conversas JÁ gravadas no banco (texto mascarado),
// grava em `analises` e compara a etapa com o gabarito congelado. Primeira rodada: serve de ensaio; a medição oficial é da Sprint 3.
//   node --env-file=.env scripts/analisar-fixtures.ts
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { criarPool } from '../src/db.ts';
import { hmacTelefone } from '../src/fontes/hmac.ts';
import { criarAnalisadorOpenAI } from '../src/analise/openai.ts';
import { calcularIndicadores } from '../src/indicadores.ts';

// Trava: só analisa se o gabarito continua exatamente como foi congelado.
execFileSync('node', [join(import.meta.dirname, 'congelar-gabarito.ts'), '--verificar'], { stdio: 'inherit' });

const chave = process.env.OPENAI_API_KEY;
if (!chave) { console.error('defina OPENAI_API_KEY no .env'); process.exit(1); }
const analisador = criarAnalisadorOpenAI({ chave, modelo: process.env.OPENAI_MODEL });
const pool = criarPool();
const dir = join(import.meta.dirname, '..', 'fixtures', 'conversas');

const linhas: string[] = [];
let acertos = 0, total = 0;
const resultados: unknown[] = [];

for (const f of readdirSync(dir).filter((x) => /^c\d+\.json$/.test(x)).sort()) {
  const fx = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  const conv = await pool.query('SELECT id FROM conversas WHERE vendedor_id = $1 AND cliente_hmac = $2', [fx.vendedor.id, hmacTelefone(fx.cliente.telefone)]);
  if (!conv.rowCount) { console.error(`${fx.id}: conversa não está no banco (rode carregar-fixtures)`); continue; }
  const msgs = (await pool.query('SELECT de, enviada_em, texto_mascarado FROM mensagens WHERE conversa_id = $1 ORDER BY enviada_em, id', [conv.rows[0].id])).rows;
  const r = await analisador.analisar(msgs.map((m) => ({ de: m.de, em: m.enviada_em.toISOString(), texto: m.texto_mascarado })));
  const ind = calcularIndicadores(msgs.map((m) => ({ de: m.de, em: m.enviada_em.toISOString() })));
  await pool.query(
    `INSERT INTO analises (conversa_id, vendedor_id, etapa, pendencias, proximo_passo, tpr_minutos, tmr_minutos, modelo, versao_prompt)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (conversa_id) DO UPDATE SET etapa=EXCLUDED.etapa, pendencias=EXCLUDED.pendencias, proximo_passo=EXCLUDED.proximo_passo,
       tpr_minutos=EXCLUDED.tpr_minutos, tmr_minutos=EXCLUDED.tmr_minutos, modelo=EXCLUDED.modelo, versao_prompt=EXCLUDED.versao_prompt, analisada_em=now()`,
    [conv.rows[0].id, fx.vendedor.id, r.etapa, JSON.stringify(r.pendencias), r.proximo_passo, ind.tprMinutos, ind.tmrMinutos, r.modelo, r.versao_prompt]);
  const ok = r.etapa === fx.gabarito.etapa;
  total++; if (ok) acertos++;
  linhas.push(`${fx.id}  ${ok ? 'OK ' : 'ERR'}  IA=${r.etapa.padEnd(13)} gabarito=${fx.gabarito.etapa.padEnd(13)} pend IA=${r.pendencias.length} gab=${fx.gabarito.pendencias.length}${fx.dificil ? '  (difícil)' : ''}`);
  resultados.push({ id: fx.id, ia: r, gabarito: fx.gabarito });
}
console.log(linhas.join('\n'));
console.log(`\nEtapa correta: ${acertos}/${total} = ${((acertos / total) * 100).toFixed(1)}%  (meta da Sprint 3: >= 85%, ou seja, 26/30)  | modelo ${process.env.OPENAI_MODEL ?? 'gpt-4o-mini'} | prompt analise-v1`);
writeFileSync(join(import.meta.dirname, '..', 'docs', 'primeira-rodada-ia.json'), JSON.stringify(resultados, null, 2));
await pool.end();
