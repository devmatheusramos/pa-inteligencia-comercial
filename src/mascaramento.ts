// Mascaramento de dados pessoais antes de gravar e antes do LLM (docs/dados-pessoais.md).

const soDigitos = (s: string) => s.replace(/\D/g, '');

export function cpfValido(cpf: string): boolean {
  const d = soDigitos(cpf);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  for (const n of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const dv = ((soma * 10) % 11) % 10;
    if (dv !== Number(d[n])) return false;
  }
  return true;
}

export function cnpjValido(cnpj: string): boolean {
  const d = soDigitos(cnpj);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const pesos = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (const n of [12, 13]) {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * pesos[i + 13 - n];
    const r = soma % 11;
    if ((r < 2 ? 0 : 11 - r) !== Number(d[n])) return false;
  }
  return true;
}

export function luhnValido(numero: string): boolean {
  const d = soDigitos(numero);
  if (d.length < 13 || d.length > 19) return false;
  let soma = 0;
  for (let i = 0; i < d.length; i++) {
    let x = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) { x *= 2; if (x > 9) x -= 9; }
    soma += x;
  }
  return soma % 10 === 0;
}

type Regra = { marcador: string; regex: RegExp; valida?: (s: string) => boolean };

// Ordem importa: padrões mais longos primeiro para não serem quebrados por padrões curtos.
const REGRAS: Regra[] = [
  { marcador: '[EMAIL]', regex: /[\w.+-]+@[\w-]+(\.[\w-]+)+/g },
  { marcador: '[PIX]', regex: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi },
  { marcador: '[CARTAO]', regex: /\b(?:\d[ -]?){12,18}\d\b/g, valida: luhnValido },
  { marcador: '[CNPJ]', regex: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, valida: cnpjValido },
  { marcador: '[CPF]', regex: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, valida: cpfValido },
  { marcador: '[TELEFONE]', regex: /(?:\+?55\s?)?\(?\b\d{2}\)?\s?9?\d{4}[-\s]?\d{4}\b/g },
  { marcador: '[CEP]', regex: /\b\d{5}-\d{3}\b/g },
];

export type ResultadoMascaramento = { texto: string; ocorrencias: Record<string, number> };

export function mascarar(texto: string): ResultadoMascaramento {
  const ocorrencias: Record<string, number> = {};
  let saida = texto;
  for (const { marcador, regex, valida } of REGRAS) {
    saida = saida.replace(regex, (m) => {
      if (valida && !valida(m)) return m;
      ocorrencias[marcador] = (ocorrencias[marcador] ?? 0) + 1;
      return marcador;
    });
  }
  return { texto: saida, ocorrencias };
}
