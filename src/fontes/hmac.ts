import { createHmac } from 'node:crypto';

// Telefone do cliente vira identificador pseudônimo (docs/dados-pessoais.md).
export const hmacTelefone = (tel: string) =>
  createHmac('sha256', process.env.HMAC_TELEFONE_KEY ?? 'dev').update(tel.replace(/\D/g, '')).digest('hex').slice(0, 16);
