// Adaptador de LLM: OpenAI (ADR 0002 prevê um adaptador por provedor; o domínio só conhece AnalisadorConversa).
// Só recebe texto JÁ MASCARADO. Temperatura 0, saída em JSON validada; saída fora do contrato é reprocessada.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validarSaida, type AnalisadorConversa, type MensagemConversa, type ResultadoAnalise } from './analisador.ts';

export const VERSAO_PROMPT = 'analise-v1';
const PROMPT = readFileSync(join(import.meta.dirname, '..', '..', 'prompts', `${VERSAO_PROMPT}.md`), 'utf8');

export const formatarConversa = (msgs: MensagemConversa[]) => msgs.map((m, i) => `[${i}] ${m.de}: ${m.texto}`).join('\n');

export function criarAnalisadorOpenAI(opts: { chave: string; modelo?: string; url?: string; tentativas?: number }): AnalisadorConversa {
  const modelo = opts.modelo ?? 'gpt-4o-mini';
  const url = opts.url ?? 'https://api.openai.com/v1/chat/completions';
  return {
    async analisar(mensagensMascaradas): Promise<ResultadoAnalise> {
      let ultimoErro: unknown;
      for (let t = 0; t < (opts.tentativas ?? 2); t++) {
        try {
          const r = await fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json', authorization: `Bearer ${opts.chave}` },
            body: JSON.stringify({
              model: modelo, temperature: 0, response_format: { type: 'json_object' },
              messages: [{ role: 'system', content: PROMPT }, { role: 'user', content: formatarConversa(mensagensMascaradas) }],
            }),
          });
          if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 200)}`);
          const corpo: any = await r.json();
          const saida = validarSaida(JSON.parse(corpo.choices[0].message.content));
          return { ...saida, modelo, versao_prompt: VERSAO_PROMPT };
        } catch (e) { ultimoErro = e; }
      }
      throw ultimoErro;
    },
  };
}
