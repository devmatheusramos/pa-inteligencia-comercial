// Receptor do webhook da WhatsApp Cloud API — somente leitura (ADR 0001).
// Prova de viabilidade da Sprint 1: valida assinatura, normaliza, mascara e registra no log.
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { mascarar } from './mascaramento.ts';

export function assinaturaValida(corpo: Buffer, cabecalho: string | undefined, segredo: string): boolean {
  if (!cabecalho?.startsWith('sha256=') || !segredo) return false;
  const esperado = Buffer.from('sha256=' + createHmac('sha256', segredo).update(corpo).digest('hex'));
  const recebido = Buffer.from(cabecalho);
  return esperado.length === recebido.length && timingSafeEqual(esperado, recebido);
}

export type MensagemNormalizada = {
  id: string;
  de: 'cliente' | 'vendedor';
  numeroVendedor: string;
  clienteHmac: string;
  enviadaEm: string;
  textoMascarado: string;
};

const hmacTelefone = (tel: string) =>
  createHmac('sha256', process.env.HMAC_TELEFONE_KEY ?? 'dev').update(tel).digest('hex').slice(0, 16);

// Campos "messages" (cliente → vendedor) e "smb_message_echoes" (vendedor pelo app, coexistência).
export function normalizar(evento: any): MensagemNormalizada[] {
  const saida: MensagemNormalizada[] = [];
  for (const entry of evento?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const v = change.value ?? {};
      const numeroVendedor = v.metadata?.display_phone_number ?? '';
      const eco = change.field === 'smb_message_echoes';
      const lista = eco ? v.message_echoes ?? [] : v.messages ?? [];
      for (const m of lista) {
        const texto = m.text?.body ?? `[${m.type ?? 'desconhecido'}]`;
        saida.push({
          id: m.id,
          de: eco ? 'vendedor' : 'cliente',
          numeroVendedor,
          clienteHmac: hmacTelefone(eco ? m.to : m.from),
          enviadaEm: new Date(Number(m.timestamp) * 1000).toISOString(),
          textoMascarado: mascarar(texto).texto,
        });
      }
    }
  }
  return saida;
}

function lerCorpo(req: IncomingMessage): Promise<Buffer> {
  return new Promise((ok, erro) => {
    const partes: Buffer[] = [];
    req.on('data', (p) => partes.push(p));
    req.on('end', () => ok(Buffer.concat(partes)));
    req.on('error', erro);
  });
}

async function tratar(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname !== '/webhook') return void res.writeHead(404).end();

  if (req.method === 'GET') {
    const ok = url.searchParams.get('hub.mode') === 'subscribe'
      && url.searchParams.get('hub.verify_token') === process.env.WHATSAPP_VERIFY_TOKEN;
    console.log(`[webhook] verificação da Meta: ${ok ? 'aceita' : 'recusada'}`);
    return void res.writeHead(ok ? 200 : 403).end(ok ? url.searchParams.get('hub.challenge') ?? '' : '');
  }

  if (req.method === 'POST') {
    const corpo = await lerCorpo(req);
    const valida = assinaturaValida(corpo, req.headers['x-hub-signature-256'] as string, process.env.WHATSAPP_APP_SECRET ?? '');
    if (!valida) {
      console.warn('[webhook] assinatura inválida — evento descartado');
      return void res.writeHead(401).end();
    }
    for (const m of normalizar(JSON.parse(corpo.toString('utf8')))) {
      console.log(`[webhook] assinatura OK | ${m.enviadaEm} | ${m.de} | vendedor ${m.numeroVendedor} | cliente#${m.clienteHmac} | "${m.textoMascarado}"`);
    }
    // Em produção: enfileira no SQS aqui e responde. Nenhum envio de mensagem é feito.
    return void res.writeHead(200).end();
  }
  res.writeHead(405).end();
}

if (import.meta.main) {
  const porta = Number(process.env.PORT ?? 3000);
  createServer((req, res) => void tratar(req, res).catch((e) => {
    console.error('[webhook] erro', e.message);
    res.writeHead(500).end();
  })).listen(porta, () => console.log(`[webhook] ouvindo em http://localhost:${porta}/webhook`));
}
