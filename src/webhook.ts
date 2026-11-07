// Receptor dos webhooks — somente leitura. Prova de viabilidade da Sprint 1:
// autentica, normaliza, mascara e registra no log. Em produção, enfileira no SQS.
//   POST /webhook/evolution   fonte principal (ADR 0003)
//   GET|POST /webhook/meta    plano B, Cloud API (ADR 0001)
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { normalizarEvolution, tokenValido } from './fontes/evolution.ts';
import { assinaturaValida, normalizarMeta } from './fontes/meta.ts';
import type { MensagemNormalizada } from './fontes/tipos.ts';

function lerCorpo(req: IncomingMessage): Promise<Buffer> {
  return new Promise((ok, erro) => {
    const partes: Buffer[] = [];
    req.on('data', (p) => partes.push(p));
    req.on('end', () => ok(Buffer.concat(partes)));
    req.on('error', erro);
  });
}

const registrar = (msgs: MensagemNormalizada[]) => {
  for (const m of msgs) {
    console.log(`[${m.fonte}] OK | ${m.enviadaEm} | ${m.de.padEnd(8)} | vendedor ${m.vendedor} | cliente#${m.clienteHmac} | "${m.textoMascarado}"`);
  }
};

export async function tratar(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://localhost');

  if (url.pathname === '/webhook/evolution' && req.method === 'POST') {
    const evento = JSON.parse((await lerCorpo(req)).toString('utf8'));
    if (!tokenValido(evento.apikey, process.env.EVOLUTION_INSTANCE_TOKEN ?? '')) {
      console.warn('[evolution] token inválido — evento descartado');
      return void res.writeHead(401).end();
    }
    if (evento.event === 'connection.update') console.log(`[evolution] conexão da instância ${evento.instance}: ${evento.data?.state}`);
    registrar(normalizarEvolution(evento));
    return void res.writeHead(200).end();
  }

  if (url.pathname === '/webhook/meta' && req.method === 'GET') {
    const ok = url.searchParams.get('hub.mode') === 'subscribe'
      && url.searchParams.get('hub.verify_token') === process.env.WHATSAPP_VERIFY_TOKEN;
    return void res.writeHead(ok ? 200 : 403).end(ok ? url.searchParams.get('hub.challenge') ?? '' : '');
  }

  if (url.pathname === '/webhook/meta' && req.method === 'POST') {
    const corpo = await lerCorpo(req);
    if (!assinaturaValida(corpo, req.headers['x-hub-signature-256'] as string, process.env.WHATSAPP_APP_SECRET ?? '')) {
      console.warn('[meta] assinatura inválida — evento descartado');
      return void res.writeHead(401).end();
    }
    registrar(normalizarMeta(JSON.parse(corpo.toString('utf8'))));
    return void res.writeHead(200).end();
  }

  res.writeHead(404).end();
}

if (import.meta.main) {
  const porta = Number(process.env.PORT ?? 3000);
  createServer((req, res) => void tratar(req, res).catch((e) => {
    console.error('[webhook] erro', e.message);
    res.writeHead(500).end();
  })).listen(porta, () => console.log(`[webhook] ouvindo em http://localhost:${porta}/webhook/evolution (e /webhook/meta)`));
}
