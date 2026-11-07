// Contrato do analisador (ADR 0002). O domínio depende só desta interface;
// cada provedor de LLM (Bedrock, Anthropic, OpenAI) é um adaptador.

export const ETAPAS = ['prospeccao', 'qualificacao', 'proposta', 'negociacao', 'fechado_ganho', 'perdido'] as const;
export type Etapa = (typeof ETAPAS)[number];

export type MensagemConversa = { de: 'cliente' | 'vendedor'; em: string; texto: string };

export type Pendencia = { responsavel: 'cliente' | 'vendedor'; descricao: string; origem_msg: number };

export type ResultadoAnalise = {
  etapa: Etapa;
  pendencias: Pendencia[];
  proximo_passo: string;
  modelo: string;
  versao_prompt: string;
};

export interface AnalisadorConversa {
  analisar(mensagensMascaradas: MensagemConversa[]): Promise<ResultadoAnalise>;
}

// Rejeita saída fora do contrato; o chamador reprocessa.
export function validarSaida(bruto: unknown): Omit<ResultadoAnalise, 'modelo' | 'versao_prompt'> {
  const o = bruto as Record<string, unknown>;
  if (!o || !ETAPAS.includes(o.etapa as Etapa)) throw new Error(`etapa inválida: ${String(o?.etapa)}`);
  if (!Array.isArray(o.pendencias)) throw new Error('pendencias deve ser lista');
  for (const p of o.pendencias as Pendencia[]) {
    if (p.responsavel !== 'cliente' && p.responsavel !== 'vendedor') throw new Error('responsavel inválido');
    if (typeof p.descricao !== 'string' || !p.descricao) throw new Error('descricao vazia');
  }
  return { etapa: o.etapa as Etapa, pendencias: o.pendencias as Pendencia[], proximo_passo: String(o.proximo_passo ?? '') };
}
