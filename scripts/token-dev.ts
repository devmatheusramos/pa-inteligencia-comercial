// Emite um token de desenvolvimento: node --env-file=.env scripts/token-dev.ts gestor | vendedor v1
import { emitirToken } from '../src/auth.ts';
const [papel, vendedorId] = process.argv.slice(2);
if (papel !== 'gestor' && papel !== 'vendedor') { console.error('uso: token-dev.ts gestor | vendedor <id>'); process.exit(1); }
console.log(emitirToken({ papel, vendedorId }, process.env.JWT_SECRET ?? ''));
