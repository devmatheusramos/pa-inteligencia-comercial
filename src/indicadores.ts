// Ticket 00007: tempo de resposta SEM IA, pelas regras de docs/escopo-e-validacao.md §3.
// Só contam minutos de seg–sex, 08h–18h (America/Recife, UTC-3 o ano todo desde 2019).

export type Msg = { de: 'cliente' | 'vendedor'; em: string; texto?: string };

// "ok", "obrigada", "beleza", 👍 ou um aviso de que o próprio cliente vai agir ("vou ver e te falo") não esperam resposta.
// Espera resposta: pergunta, pedido ou cobrança. Heurística simples e explicável, sem IA.
export function precisaResposta(texto: string): boolean {
  const t = texto.trim();
  if (!t || /^[\p{Extended_Pictographic}\p{Emoji_Component}\s]+$/u.test(t)) return false;
  return /\?/.test(t) || /\b(responde|cad[eê]|aguardo|esperando|me (passa|manda|envia|avisa)|pode|consegue|preciso|quero|qual|quanto|como|quando|onde)\b/i.test(t);
}

const OFFSET_MS = -3 * 3600_000;
const MIN = 60_000;
const DIA = 86_400_000;

// Minutos de horário comercial entre dois instantes.
export function minutosComerciais(inicio: Date, fim: Date): number {
  if (fim <= inicio) return 0;
  let total = 0;
  const diaLocal = (t: number) => Math.floor((t + OFFSET_MS) / DIA);
  for (let d = diaLocal(inicio.getTime()); d <= diaLocal(fim.getTime()); d++) {
    const dow = new Date(d * DIA).getUTCDay();      // 0 = domingo
    if (dow === 0 || dow === 6) continue;
    const meiaNoite = d * DIA - OFFSET_MS;
    const ini = Math.max(meiaNoite + 8 * 3600_000, inicio.getTime());
    const f = Math.min(meiaNoite + 18 * 3600_000, fim.getTime());
    if (f > ini) total += (f - ini) / MIN;
  }
  return Math.round(total);
}

export type Indicadores = { tprMinutos: number | null; tmrMinutos: number | null; turnos: number; semResposta: number };

// Turno do cliente = mensagens seguidas do cliente; o relógio começa na primeira. A resposta é a 1ª mensagem do vendedor depois.
export function calcularIndicadores(msgs: Msg[]): Indicadores {
  const ordenadas = [...msgs].sort((a, b) => Date.parse(a.em) - Date.parse(b.em));
  const tempos: number[] = [];
  let semResposta = 0, turnos = 0, inicioTurno: Date | null = null, textosTurno: (string | undefined)[] = [];
  for (const m of ordenadas) {
    if (m.de === 'cliente') { if (!inicioTurno) { inicioTurno = new Date(m.em); turnos++; textosTurno = []; } textosTurno.push(m.texto); }
    else if (inicioTurno) { tempos.push(minutosComerciais(inicioTurno, new Date(m.em))); inicioTurno = null; }
  }
  // Turno sem resposta só conta se o cliente de fato espera uma (sem o texto da mensagem, conta como antes).
  if (inicioTurno && (textosTurno.some((x) => x === undefined) || precisaResposta(textosTurno.join(' ')))) semResposta++;
  return {
    tprMinutos: tempos.length ? tempos[0] : null,
    tmrMinutos: tempos.length ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : null,
    turnos, semResposta,
  };
}
