// Gera o resumo em linguagem simples de cada conversa já analisada e grava em analises.resumo.
//   node --env-file=.env scripts/gerar-resumos.ts            (só as que ainda não têm resumo)
//   node --env-file=.env scripts/gerar-resumos.ts --todas
import { criarPool } from '../src/db.ts';
import { resumirConversa, VERSAO_PROMPT_RESUMO } from '../src/analise/resumo.ts';

const chave = process.env.OPENAI_API_KEY;
if (!chave) { console.error('defina OPENAI_API_KEY no .env'); process.exit(1); }
const pool = criarPool();
const todas = process.argv.includes('--todas');
const alvo = await pool.query(`SELECT conversa_id FROM analises ${todas ? '' : 'WHERE resumo IS NULL'} ORDER BY conversa_id`);
let ok = 0;
for (const { conversa_id } of alvo.rows) {
  const msgs = (await pool.query('SELECT de, enviada_em, texto_mascarado FROM mensagens WHERE conversa_id = $1 ORDER BY enviada_em, id', [conversa_id])).rows;
  const resumo = await resumirConversa(msgs.map((m) => ({ de: m.de, em: m.enviada_em.toISOString(), texto: m.texto_mascarado })), { chave, modelo: process.env.OPENAI_MODEL });
  await pool.query('UPDATE analises SET resumo = $2, resumo_prompt = $3 WHERE conversa_id = $1', [conversa_id, resumo, VERSAO_PROMPT_RESUMO]);
  ok++; console.log(`#${conversa_id}: ${resumo}`);
}
console.log(`\n${ok} resumo(s) gerado(s) com ${VERSAO_PROMPT_RESUMO}.`);
await pool.end();
