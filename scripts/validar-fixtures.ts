// Confere o conjunto de conversas simuladas e o gabarito (docs/escopo-e-validacao.md §4.1).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ETAPAS } from '../src/analise/analisador.ts';

const dir = join(import.meta.dirname, '..', 'fixtures', 'conversas');
const arquivos = readdirSync(dir).filter((f) => /^c\d+\.json$/.test(f));
const erros: string[] = [];
const porEtapa: Record<string, number> = {};
const porVendedor: Record<string, number> = {};

for (const f of arquivos) {
  const c = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  const g = c.gabarito ?? {};
  if (!ETAPAS.includes(g.etapa)) erros.push(`${f}: etapa inválida ${g.etapa}`);
  if (!c.dificil) porEtapa[g.etapa] = (porEtapa[g.etapa] ?? 0) + 1;
  porVendedor[c.vendedor?.id] = (porVendedor[c.vendedor?.id] ?? 0) + 1;
  let anterior = 0;
  for (const m of c.mensagens) {
    const t = Date.parse(m.em);
    if (!(t >= anterior)) erros.push(`${f}: horário fora de ordem em ${m.em}`);
    anterior = t;
  }
  for (const p of g.pendencias ?? []) {
    if (p.origem_msg < 0 || p.origem_msg >= c.mensagens.length) erros.push(`${f}: origem_msg fora do intervalo`);
  }
}

if (arquivos.length < 30) erros.push(`esperadas 30 conversas, encontradas ${arquivos.length}`);
for (const e of ETAPAS) if ((porEtapa[e] ?? 0) < 3) erros.push(`etapa ${e} com menos de 3 conversas normais`);
if (Object.keys(porVendedor).length < 2) erros.push('menos de 2 vendedores');

console.log(`${arquivos.length} conversas | por etapa (normais): ${JSON.stringify(porEtapa)} | por vendedor: ${JSON.stringify(porVendedor)}`);
if (erros.length) { console.error(erros.join('\n')); process.exit(1); }
console.log('fixtures OK');
