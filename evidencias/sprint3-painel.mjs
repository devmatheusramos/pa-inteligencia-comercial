// Prints do ticket 00009 (painel do gestor e visão do vendedor): cada um recortado, com o trecho importante marcado.
//   node evidencias/sprint3-painel.mjs [http://localhost:3005]
import { join } from 'node:path';
import { abrirNavegador } from './capturar.mjs';

const BASE = process.argv[2] ?? 'http://localhost:3005';
const OUT = join(import.meta.dirname, 'prints', 'sprint3');
const q = (perfil, extra = '') => `${BASE}/?perfil=${perfil}&tema=claro&tour=0${extra}`;
const nav = await abrirNavegador({ largura: 1360, altura: 1000 });
const feitos = [];
const tira = async (nome, seletores, opcoes) => { const ret = await nav.marcar(seletores, opcoes); feitos.push(await nav.foto(join(OUT, nome), ret)); console.log('ok', nome); };

try {
  // 1) Indicadores do gestor
  await nav.ir(q('gestor'));
  await tira('s3-01-gestor-indicadores.png', ['.kpis6'], { margem: 14 });

  // 2) Funil + resumo do que é urgente
  await tira('s3-02-gestor-funil-e-urgentes.png', ['.fbars', '.carta.p0'], { incluir: ['.heroi'] });

  // 3) Conversas em cada etapa (quadro): canal e resumo em cada cartão
  await nav.js(`document.querySelector('.quadro').scrollIntoView({block:'start'})`);
  await tira('s3-03-gestor-conversas-por-etapa.png', ['.quadro .col:nth-child(4) h3', '.quadro .col:nth-child(4) .cartao'], { incluir: ['.quadro .col:nth-child(1) h3', '.quadro .col:nth-child(3) .cartao:nth-of-type(1)', '.quadro .col:nth-child(5) .cartao:nth-of-type(1)'] });

  // 4) Abrir uma conversa: resumo, próximo passo e dados pessoais mascarados
  await nav.ir(q('gestor'));
  const id = await nav.js(`(async () => { const m = dados.conversas.find((c) => c.ultimas && c.etapa === 'fechado_ganho'); return m ? m.id : dados.conversas[0].id; })()`);
  const idCpf = await nav.js(`(async () => { for (const c of dados.conversas) { const r = await api('/api/conversas/' + c.id + '/mensagens'); if (r.mensagens.some((m) => /\\[CPF\\]/.test(m.texto_mascarado))) return c.id; } return null; })()`);
  await nav.tamanho(1360, 1900);
  await nav.js(`abrir('${idCpf || id}')`); await nav.esperar(1400);
  await nav.js(`(() => { const g = document.querySelector('#gaveta'); g.querySelectorAll('.bal').forEach((b) => { if (/\\[CPF\\]/.test(b.textContent)) b.id = 'alvo-cpf'; }); g.querySelector('.corpo > p').id = 'alvo-resumo'; })()`);
  await tira('s3-04-conversa-aberta.png', ['#alvo-resumo', '#gaveta .destaque', '#alvo-cpf'], { incluir: ['#gaveta .cab', '#gaveta .bal:last-of-type'] });

  await nav.tamanho(1360, 1000);

  // 5) Tempo de resposta por vendedor (Agente Cronômetro)
  await nav.ir(q('gestor', '&abre=cronometro'), 2600);
  await tira('s3-05-gestor-desempenho-por-vendedor.png', ['.eqtab'], { margem: 14, incluir: ['#cab-cronometro'] });

  // 6) Visão da vendedora: o que fazer hoje
  await nav.ir(q('v1'));
  await tira('s3-06-vendedora-hoje.png', ['.kpis6', '.todo'], { incluir: ['.heroi'] });

  // 7) A vendedora só enxerga a própria carteira
  await tira('s3-07-vendedora-so-a-dela.png', ['#perfil', '#negociacoes'], { incluir: ['.kpis6'] });
} finally { await nav.fechar(); }
console.log(`\n${feitos.length} prints em ${OUT}`);
