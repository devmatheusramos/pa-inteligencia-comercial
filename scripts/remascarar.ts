// Refaz o mascaramento das mensagens já guardadas (depois de melhorar as regras de nome e endereço).
// Parte do texto ORIGINAL das conversas de teste, nunca do texto já mascarado.
//   node --env-file=.env scripts/remascarar.ts
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { criarPool } from '../src/db.ts';
import { mascarar } from '../src/mascaramento.ts';

const dir = join(import.meta.dirname, '..', 'fixtures', 'conversas');
const pool = criarPool();
let alteradas = 0, total = 0;
const marcadores: Record<string, number> = {};
for (const f of readdirSync(dir).filter((x) => /^c\d+\.json$/.test(x)).sort()) {
  const c = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  for (const [i, m] of c.mensagens.entries()) {
    const r = mascarar(m.texto, { nomes: [c.cliente.nome] });
    for (const [k, v] of Object.entries(r.ocorrencias)) marcadores[k] = (marcadores[k] ?? 0) + v;
    const u = await pool.query('UPDATE mensagens SET texto_mascarado = $2 WHERE id = $1 AND texto_mascarado IS DISTINCT FROM $2', [`${c.id}-${i}`, r.texto]);
    total++; alteradas += u.rowCount ?? 0;
  }
}
console.log(`${total} mensagens conferidas, ${alteradas} atualizadas.`);
console.log('dados escondidos, por tipo:', marcadores);
await pool.end();
