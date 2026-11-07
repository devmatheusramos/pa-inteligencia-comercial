// Fonte plano B: WhatsApp Cloud API oficial (ADR 0001, substituída pela ADR 0003).
import { createHmac, timingSafeEqual } from 'node:crypto';
import { mascarar } from '../mascaramento.ts';
import { hmacTelefone } from './hmac.ts';
import type { MensagemNormalizada } from './tipos.ts';

export function assinaturaValida(corpo: Buffer, cabecalho: string | undefined, segredo: string): boolean {
  if (!cabecalho?.startsWith('sha256=') || !segredo) return false;
  const esperado = Buffer.from('sha256=' + createHmac('sha256', segredo).update(corpo).digest('hex'));
  const recebido = Buffer.from(cabecalho);
  return esperado.length === recebido.length && timingSafeEqual(esperado, recebido);
}

// Campos "messages" (cliente → vendedor) e "smb_message_echoes" (vendedor pelo app, coexistência).
export function normalizarMeta(evento: any): MensagemNormalizada[] {
  const saida: MensagemNormalizada[] = [];
  for (const entry of evento?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const v = change.value ?? {};
      const eco = change.field === 'smb_message_echoes';
      const lista = eco ? v.message_echoes ?? [] : v.messages ?? [];
      for (const m of lista) {
        saida.push({
          id: m.id,
          fonte: 'meta',
          de: eco ? 'vendedor' : 'cliente',
          vendedor: v.metadata?.display_phone_number ?? '',
          clienteHmac: hmacTelefone(eco ? m.to : m.from),
          enviadaEm: new Date(Number(m.timestamp) * 1000).toISOString(),
          textoMascarado: mascarar(m.text?.body ?? `[${m.type ?? 'desconhecido'}]`).texto,
        });
      }
    }
  }
  return saida;
}
