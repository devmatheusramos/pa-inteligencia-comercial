// Conexão com o PostgreSQL e execução de consultas sob o perfil do usuário (RLS).
import pg from 'pg';

export type Perfil = { papel: 'gestor' | 'vendedor'; vendedorId?: string };

export const criarPool = (url = process.env.DATABASE_URL) => new pg.Pool({ connectionString: url, max: 5 });

// Cada consulta roda numa transação com o papel app_api e as variáveis que as políticas RLS leem.
export async function comPerfil<T>(pool: pg.Pool, perfil: Perfil, fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query('SET LOCAL ROLE app_api');
    await c.query("SELECT set_config('app.papel', $1, true), set_config('app.vendedor_id', $2, true)", [perfil.papel, perfil.vendedorId ?? '']);
    const r = await fn(c);
    await c.query('COMMIT');
    return r;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}
