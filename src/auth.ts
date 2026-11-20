// Login de desenvolvimento: JWT HS256 com os mesmos campos que o Cognito entregaria (ADR 0002): papel e vendedor_id.
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Perfil } from './db.ts';

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const assinar = (dados: string, segredo: string) => createHmac('sha256', segredo).update(dados).digest('base64url');

export function emitirToken(perfil: Perfil, segredo: string, validadeS = 3600): string {
  const corpo = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ papel: perfil.papel, vendedor_id: perfil.vendedorId, exp: Math.floor(Date.now() / 1000) + validadeS })}`;
  return `${corpo}.${assinar(corpo, segredo)}`;
}

export function lerToken(token: string | undefined, segredo: string): Perfil | null {
  const p = (token ?? '').replace(/^Bearer /, '').split('.');
  if (p.length !== 3 || !segredo) return null;
  const esperado = Buffer.from(assinar(`${p[0]}.${p[1]}`, segredo)), recebido = Buffer.from(p[2]);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return null;
  const c = JSON.parse(Buffer.from(p[1], 'base64url').toString('utf8'));
  if (c.exp < Date.now() / 1000) return null;
  if (c.papel === 'gestor') return { papel: 'gestor' };
  if (c.papel === 'vendedor' && c.vendedor_id) return { papel: 'vendedor', vendedorId: c.vendedor_id };
  return null;
}
