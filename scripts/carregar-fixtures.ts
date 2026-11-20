// Passa as 30 conversas simuladas pelo mesmo caminho do webhook: mascara, deduplica e liga ao vendedor.
// node --env-file=.env scripts/carregar-fixtures.ts   (rodar duas vezes mostra a deduplicação)
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { criarPool } from '../src/db.ts';
import { hmacTelefone } from '../src/fontes/hmac.ts';
import { gravarMensagem } from '../src/gravacao.ts';
import { mascarar } from '../src/mascaramento.ts';

const dir = join(import.meta.dirname, '..', 'fixtures', 'conversas');
const pool = criarPool();
const contagem: Record<string, number> = { gravada: 0, duplicada: 0, vendedor_desconhecido: 0 };

for (const f of readdirSync(dir).filter((x) => /^c\d+\.json$/.test(x)).sort()) {
  const c = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  // Cada vendedor simulado tem uma "instância" própria, como no número real da Evolution.
  await pool.query(
    "INSERT INTO vendedores (id, nome, numero_wa_id, whatsapp_estado) VALUES ($1, $2, $3, 'simulado') ON CONFLICT (id) DO NOTHING",
    [c.vendedor.id, c.vendedor.nome, `vendedor-${c.vendedor.id}`]);
  for (const [i, m] of c.mensagens.entries()) {
    const r = await gravarMensagem(pool, {
      id: `${c.id}-${i}`, fonte: 'evolution', canal: 'whatsapp', de: m.de, vendedor: `vendedor-${c.vendedor.id}`,
      clienteHmac: hmacTelefone(c.cliente.telefone), enviadaEm: new Date(m.em).toISOString(),
      textoMascarado: mascarar(m.texto).texto,
    });
    contagem[r]++;
  }
}
console.log('mensagens:', contagem);
await pool.end();
