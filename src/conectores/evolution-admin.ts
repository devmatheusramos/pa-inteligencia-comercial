// Administração da Evolution API (ADR 0003): cria a instância de um vendedor, entrega o QR code e informa se já conectou.
// Só usa rotas de conexão — nenhuma rota de envio de mensagem.
export type EstadoWhatsapp = 'conectado' | 'aguardando' | 'desconectado';

export type EvolutionAdmin = {
  criarInstancia(nome: string): Promise<void>;
  qr(nome: string): Promise<string | null>;       // data URL do QR, ou null se já conectado
  estado(nome: string): Promise<EstadoWhatsapp>;
};

export class EvolutionIndisponivel extends Error {}

export function criarEvolutionAdmin(cfg = {
  url: process.env.EVOLUTION_URL ?? 'http://localhost:8080',
  apikey: process.env.EVOLUTION_API_KEY ?? '',
  token: process.env.EVOLUTION_INSTANCE_TOKEN ?? '',
  webhook: process.env.EVOLUTION_WEBHOOK_URL ?? 'http://host.docker.internal:3000/webhook/evolution',
}): EvolutionAdmin {
  const chamar = async (metodo: string, caminho: string, corpo?: unknown) => {
    let r: Response;
    try {
      r = await fetch(cfg.url + caminho, { method: metodo, headers: { apikey: cfg.apikey, 'content-type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined, signal: AbortSignal.timeout(15000) });
    } catch {
      throw new EvolutionIndisponivel('A Evolution API não está respondendo. Suba com: docker compose up -d evolution');
    }
    return { status: r.status, json: (await r.json().catch(() => ({}))) as any };
  };
  const dataUrl = (b64?: string) => (b64 ? (b64.startsWith('data:') ? b64 : 'data:image/png;base64,' + b64) : null);

  return {
    async criarInstancia(nome) {
      const r = await chamar('POST', '/instance/create', {
        instanceName: nome, token: cfg.token, qrcode: true, integration: 'WHATSAPP-BAILEYS',
        webhook: { enabled: true, url: cfg.webhook, byEvents: false, base64: false, events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'] },
      });
      // 403/409: já existe — tudo bem, o QR é pedido em seguida.
      if (r.status >= 400 && r.status !== 403 && r.status !== 409) throw new Error('Evolution recusou criar a instância (' + r.status + ')');
    },
    async qr(nome) {
      const r = await chamar('GET', `/instance/connect/${encodeURIComponent(nome)}`);
      return dataUrl(r.json?.base64);
    },
    async estado(nome) {
      const r = await chamar('GET', `/instance/connectionState/${encodeURIComponent(nome)}`);
      const s = r.json?.instance?.state ?? r.json?.state;
      return s === 'open' ? 'conectado' : s === 'connecting' ? 'aguardando' : 'desconectado';
    },
  };
}
