// Cria a instância do vendedor na Evolution local, aponta o webhook para o receptor
// e salva o QR code em evolution-qrcode.png para vincular o número de teste.
import { writeFileSync } from 'node:fs';

const base = process.env.EVOLUTION_URL ?? 'http://localhost:8080';
const apikey = process.env.EVOLUTION_API_KEY ?? '';
const instancia = process.env.EVOLUTION_INSTANCE ?? 'vendedor-teste';
const token = process.env.EVOLUTION_INSTANCE_TOKEN ?? '';
const webhook = process.env.EVOLUTION_WEBHOOK_URL ?? 'http://host.docker.internal:3000/webhook/evolution';

if (!apikey || !token) {
  console.error('Defina EVOLUTION_API_KEY e EVOLUTION_INSTANCE_TOKEN no .env');
  process.exit(1);
}

const chamar = async (metodo: string, caminho: string, corpo?: unknown) => {
  const r = await fetch(base + caminho, {
    method: metodo,
    headers: { apikey, 'content-type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: r.status, json: await r.json().catch(() => ({})) as any };
};

let r = await chamar('POST', '/instance/create', {
  instanceName: instancia,
  token,
  qrcode: true,
  integration: 'WHATSAPP-BAILEYS',
  webhook: { enabled: true, url: webhook, byEvents: false, base64: false, events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'] },
});
let qr = r.json?.qrcode?.base64;
if (r.status >= 400) {
  console.log(`Instância "${instancia}" já existe (${r.status}); pedindo novo QR code.`);
  r = await chamar('GET', `/instance/connect/${instancia}`);
  qr = r.json?.base64;
}
if (!qr) {
  console.log('Sem QR code na resposta — a instância pode já estar conectada:', JSON.stringify(r.json).slice(0, 300));
  process.exit(0);
}
writeFileSync('evolution-qrcode.png', Buffer.from(qr.split(',').pop(), 'base64'));
console.log(`QR code salvo em evolution-qrcode.png. No celular do número de teste: WhatsApp > Aparelhos conectados > Conectar aparelho.`);
