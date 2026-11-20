// Mostra o texto ORIGINAL x o que realmente vai ao LLM (só texto mascarado) para uma conversa que tenha dado pessoal.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mascarar } from '../src/mascaramento.ts';
import { formatarConversa } from '../src/analise/openai.ts';
const dir = join(import.meta.dirname, '..', 'fixtures', 'conversas');
for (const f of readdirSync(dir).filter((x) => /^c\d+\.json$/.test(x)).sort()) {
  const c = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  const idx = c.mensagens.findIndex((m: any) => Object.keys(mascarar(m.texto).ocorrencias).length > 0);
  if (idx < 0) continue;
  const ini = Math.max(0, idx - 1);
  console.log(`${c.id}: mensagem ${idx} ANTES do mascaramento (nunca sai do sistema):\n  "${c.mensagens[idx].texto}"\n`);
  console.log(`${c.id}: o que o modelo RECEBE (payload "user" enviado à OpenAI):`);
  console.log(formatarConversa(c.mensagens.slice(ini, idx + 2).map((m: any) => ({ de: m.de, em: m.em, texto: mascarar(m.texto).texto }))).replace(/^\[(\d+)\]/gm, (_, n) => `[${Number(n) + ini}]`));
  break;
}
