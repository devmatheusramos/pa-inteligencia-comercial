// Resumo de uma conversa em linguagem simples (Agente Analista). Prompt próprio, separado da classificação de etapa:
// assim a medição de acurácia do analise-v1 não muda. Só recebe texto já mascarado.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MensagemConversa } from './analisador.ts';
import { formatarConversa } from './openai.ts';

export const VERSAO_PROMPT_RESUMO = 'resumo-v1';
const PROMPT = readFileSync(join(import.meta.dirname, '..', '..', 'prompts', `${VERSAO_PROMPT_RESUMO}.md`), 'utf8');

export async function resumirConversa(msgsMascaradas: MensagemConversa[], opts: { chave: string; modelo?: string }): Promise<string> {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${opts.chave}` },
    body: JSON.stringify({
      model: opts.modelo ?? 'gpt-4o-mini', temperature: 0, response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: PROMPT }, { role: 'user', content: formatarConversa(msgsMascaradas) }],
    }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const texto = JSON.parse(((await r.json()) as any).choices[0].message.content)?.resumo;
  if (typeof texto !== 'string' || !texto.trim()) throw new Error('resumo vazio');
  return texto.trim().slice(0, 300);
}
