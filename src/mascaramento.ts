// Mascaramento de dados pessoais antes de gravar e antes do LLM (docs/dados-pessoais.md).
// Dados com formato (CPF, e-mail, telefone, CEP...) são achados por regra. Endereço e nome, não têm formato fixo:
// endereço é achado pela palavra de logradouro (Rua, Avenida...); nome, por frases como "meu nome é", por linha
// que é só um nome completo e pelos nomes já conhecidos da conversa (ex.: nome do contato no WhatsApp).

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
  // Endereço: da palavra de logradouro até o fim da linha, da frase ou do " e " seguinte.
  { marcador: '[ENDERECO]', regex: /\b(?:Rua|Av\.?|Avenida|Travessa|Tv\.|Alameda|Pra[cç]a|Estrada|Rodovia|Largo)\s+[^\n]{2,100}?(?=\n|[.;!?]\s|\s+e\s|\s*$)/giu },
];

// Nome depois de "meu nome é", "me chamo", "sou o/a", "aqui é o/a" (nome começa com maiúscula).
const NOME_DECLARADO = /\b((?:meu nome (?:é|e)|me chamo|sou (?:o|a)|aqui (?:é|e) (?:o|a))\s+)([A-ZÀ-Ú][\p{L}'-]+(?:\s+(?:d[aeo]s?\s+)?[A-ZÀ-Ú][\p{L}'-]+){0,3})/gu;
// Linha que é só um nome completo (2 a 4 palavras com inicial maiúscula), como no bloco "nome / CPF / e-mail / endereço".
const NOME_NA_LINHA = /^(?!(?:Bom|Boa|Muito|Feliz|Obrigad|Perfeito|Tudo|Sim|Não|Nao|Oi|Olá|Ola|Ok|Beleza|Bora|Valeu)\b)[A-ZÀ-Ú][\p{L}'-]+(?:\s+(?:d[aeo]s?\s+)?[A-ZÀ-Ú][\p{L}'-]+){1,3}$/gmu;

const VARIANTES: Record<string, string> = { a: '[aáàâãä]', e: '[eéèêë]', i: '[iíìîï]', o: '[oóòôõö]', u: '[uúùûü]', c: '[cç]' };
const semAcento = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
const regexDoNome = (palavra: string) => new RegExp(`(?<![\\p{L}])${[...semAcento(palavra).toLowerCase()].map((c) => VARIANTES[c] ?? c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('')}(?![\\p{L}])`, 'giu');

export type ResultadoMascaramento = { texto: string; ocorrencias: Record<string, number> };
export type OpcoesMascaramento = { nomes?: string[] };   // nomes que já se sabe que são pessoais (ex.: nome do contato)

export function mascarar(texto: string, opcoes: OpcoesMascaramento = {}): ResultadoMascaramento {
  const ocorrencias: Record<string, number> = {};
  const conta = (m: string) => { ocorrencias[m] = (ocorrencias[m] ?? 0) + 1; };
  let saida = texto;
  for (const { marcador, regex, valida } of REGRAS) {
    saida = saida.replace(regex, (m) => {
      if (valida && !valida(m)) return m;
      conta(marcador);
      return marcador;
    });
  }
  saida = saida.replace(NOME_DECLARADO, (_, antes: string) => { conta('[NOME]'); return antes + '[NOME]'; });
  saida = saida.replace(NOME_NA_LINHA, () => { conta('[NOME]'); return '[NOME]'; });
  // Nomes conhecidos: cada palavra do nome (3+ letras), sem diferenciar maiúscula nem acento.
  const palavras = new Set((opcoes.nomes ?? []).flatMap((n) => n.split(/\s+/)).filter((w) => semAcento(w).length >= 3));
  for (const w of palavras) saida = saida.replace(regexDoNome(w), () => { conta('[NOME]'); return '[NOME]'; });
  return { texto: saida, ocorrencias };
}
