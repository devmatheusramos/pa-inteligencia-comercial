// Fonte principal: Evolution API (ADR 0003). Somente leitura — nenhuma rota de envio é chamada.
import { timingSafeEqual } from 'node:crypto';
import { mascarar } from '../mascaramento.ts';
import { hmacTelefone } from './hmac.ts';
import type { MensagemNormalizada } from './tipos.ts';

// A Evolution manda o token da instância no campo `apikey` do corpo de cada webhook.
export function tokenValido(recebido: unknown, esperado: string): boolean {
  if (typeof recebido !== 'string' || !esperado) return false;
  const a = Buffer.from(recebido), b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

function textoDa(data: any): string {
  const m = data.message ?? {};
  return m.conversation
    ?? m.extendedTextMessage?.text
    ?? m.imageMessage?.caption
    ?? m.videoMessage?.caption
    ?? `[${data.messageType ?? 'desconhecido'}]`;
}

// Só conversas individuais: grupos (@g.us), status e newsletters ficam de fora.
function jidDoCliente(key: any): string | null {
  const jid: string = key?.remoteJid ?? '';
  if (!jid || jid.endsWith('@g.us') || jid === 'status@broadcast' || jid.endsWith('@newsletter')) return null;
  // Contas com identificador oculto (@lid) trazem o número real em remoteJidAlt.
  if (jid.endsWith('@lid')) return key.remoteJidAlt ?? null;
  return jid;
}

export function normalizarEvolution(evento: any): MensagemNormalizada[] {
  if (evento?.event !== 'messages.upsert') return [];
  const lista = Array.isArray(evento.data) ? evento.data : [evento.data];
  const saida: MensagemNormalizada[] = [];
  for (const data of lista) {
    const jid = jidDoCliente(data?.key);
    if (!jid) continue;
    saida.push({
      id: data.key.id,
      fonte: 'evolution',
      de: data.key.fromMe ? 'vendedor' : 'cliente',
      vendedor: evento.instance,
      clienteHmac: hmacTelefone(jid.split('@')[0]),
      enviadaEm: new Date(Number(data.messageTimestamp) * 1000).toISOString(),
      textoMascarado: mascarar(textoDa(data)).texto,
    });
  }
  return saida;
}
