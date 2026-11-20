// Ticket 00008: congela o gabarito ANTES de rodar a IA. Grava o hash SHA-256 do gabarito de cada conversa;
// `--verificar` falha se qualquer gabarito mudou depois do congelamento (evita ajustar a resposta ao resultado).
//   node scripts/congelar-gabarito.ts            congela
//   node scripts/congelar-gabarito.ts --verificar
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(import.meta.dirname, '..', 'fixtures', 'conversas');
const manifesto = join(dir, 'gabarito.sha256');
const hashes = readdirSync(dir).filter((f) => /^c\d+\.json$/.test(f)).sort().map((f) => {
  const g = JSON.parse(readFileSync(join(dir, f), 'utf8')).gabarito;
  return `${createHash('sha256').update(JSON.stringify(g)).digest('hex')}  ${f}`;
});

if (process.argv.includes('--verificar')) {
  if (!existsSync(manifesto)) { console.error('gabarito ainda não foi congelado'); process.exit(1); }
  const antes = readFileSync(manifesto, 'utf8').trim().split('\n');
  const mudou = hashes.filter((h, i) => h !== antes[i]);
  if (mudou.length || antes.length !== hashes.length) { console.error(`gabarito ALTERADO após o congelamento em: ${mudou.map((m) => m.split('  ')[1]).join(', ')}`); process.exit(1); }
  console.log(`gabarito íntegro: ${hashes.length} conversas conferem com o congelamento (${manifesto.split(/[\\/]/).slice(-3).join('/')})`);
} else {
  writeFileSync(manifesto, hashes.join('\n') + '\n');
  console.log(`gabarito congelado: ${hashes.length} hashes gravados`);
}
