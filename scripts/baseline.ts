// Ticket 00008: linha de base do tempo de acompanhamento SEM o MVP (docs/escopo-e-validacao.md §4.2).
// O cronômetro é humano: quem mede lê as 30 conversas como chat e responde as 5 perguntas.
//   1) node scripts/baseline.ts preparar
//        gera evidencias/baseline/conversas-para-leitura.txt e modelo-respostas.json
//   2) Disparar o cronômetro, ler o .txt, preencher o modelo-respostas.json, parar o cronômetro.
//   3) node scripts/baseline.ts conferir evidencias/baseline/respostas.json <minutos>
//        confere com o gabarito congelado. Registra o tempo e quantas das 5 respostas ficaram certas.
//   4) node scripts/baseline.ts conferir <respostas-painel.json> <minutos> --painel
//        rodada com o painel: mesmas perguntas; calcula a redução de tempo contra a rodada sem o painel.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { calcularIndicadores } from '../src/indicadores.ts';

const raiz = join(import.meta.dirname, '..');
const dir = join(raiz, 'fixtures', 'conversas');
const saida = join(raiz, 'evidencias', 'baseline');
const conversas = readdirSync(dir).filter((f) => /^c\d+\.json$/.test(f)).sort().map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));

// Chave de resposta: gabarito congelado + indicadores calculados pelas regras do §3 (sem IA).
function gabaritoDasPerguntas() {
  const tmr: Record<string, number[]> = {};
  const semResposta: string[] = [];
  for (const c of conversas) {
    const i = calcularIndicadores(c.mensagens);
    if (i.tmrMinutos !== null) (tmr[c.vendedor.nome] ??= []).push(i.tmrMinutos);
    // Só conta negociação aberta: "ok, obrigado" depois de fechar ou perder não é cliente esperando retorno.
    if (i.semResposta > 0 && !['fechado_ganho', 'perdido'].includes(c.gabarito.etapa)) semResposta.push(c.id);
  }
  const media = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  const piorVendedor = Object.entries(tmr).sort((a, b) => media(b[1]) - media(a[1]))[0][0];
  return {
    q1_etapas: Object.fromEntries(conversas.map((c) => [c.id, c.gabarito.etapa])),
    q2_em_negociacao: conversas.filter((c) => c.gabarito.etapa === 'negociacao').map((c) => c.id),
    q3_com_pendencia_do_vendedor: conversas.filter((c) => c.gabarito.pendencias.some((p: any) => p.responsavel === 'vendedor')).map((c) => c.id),
    q4_vendedor_maior_tmr: piorVendedor,
    q5_sem_resposta_do_vendedor: semResposta,
  };
}

const modo = process.argv[2];
if (modo === 'preparar') {
  mkdirSync(saida, { recursive: true });
  const texto = conversas.map((c) =>
    `===== ${c.id} | vendedor: ${c.vendedor.nome} | ${c.segmento} =====\n` +
    c.mensagens.map((m: any) => `${m.em.slice(5, 16).replace('T', ' ')}  ${m.de === 'cliente' ? 'CLIENTE ' : 'VENDEDOR'}: ${m.texto}`).join('\n')).join('\n\n');
  writeFileSync(join(saida, 'conversas-para-leitura.txt'), texto + '\n');
  writeFileSync(join(saida, 'modelo-respostas.json'), JSON.stringify({
    q1_etapas: Object.fromEntries(conversas.map((c) => [c.id, ''])),
    q2_em_negociacao: [], q3_com_pendencia_do_vendedor: [], q4_vendedor_maior_tmr: '', q5_sem_resposta_do_vendedor: [],
    _etapas_validas: ['prospeccao', 'qualificacao', 'proposta', 'negociacao', 'fechado_ganho', 'perdido'],
  }, null, 2));
  console.log(`pronto: ${join(saida, 'conversas-para-leitura.txt')} e modelo-respostas.json`);
} else if (modo === 'conferir') {
  execFileSync('node', [join(import.meta.dirname, 'congelar-gabarito.ts'), '--verificar'], { stdio: 'inherit' });
  const args = process.argv.slice(3), flags = args.filter((x) => x.startsWith('--')), [arquivo, minutos] = args.filter((x) => !x.startsWith('--'));
  const painel = flags.includes('--painel');
  const r = JSON.parse(readFileSync(arquivo, 'utf8'));
  const respondeu = Object.values(r.q1_etapas ?? {}).some(Boolean) || (r.q2_em_negociacao?.length ?? 0) + (r.q3_com_pendencia_do_vendedor?.length ?? 0) + (r.q5_sem_resposta_do_vendedor?.length ?? 0) > 0 || r.q4_vendedor_maior_tmr;
  if (!respondeu) { console.error('O arquivo de respostas está em branco. Preencha as 5 respostas, cronometre e rode de novo.'); process.exit(1); }
  if (!Number.isFinite(Number(minutos)) || Number(minutos) <= 0) { console.error('Informe os minutos medidos (número maior que zero).'); process.exit(1); }
  const g = gabaritoDasPerguntas();
  const mesmo = (a: string[], b: string[]) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  const acertosQ1 = Object.entries(g.q1_etapas).filter(([id, e]) => r.q1_etapas?.[id] === e).length;
  const certas = {
    'Q1 etapa de cada negociação (>= 26/30)': acertosQ1 >= 26,
    'Q2 negociações em "negociacao"': mesmo(r.q2_em_negociacao ?? [], g.q2_em_negociacao),
    'Q3 pendências abertas do vendedor': mesmo(r.q3_com_pendencia_do_vendedor ?? [], g.q3_com_pendencia_do_vendedor),
    'Q4 vendedor com maior tempo de resposta': r.q4_vendedor_maior_tmr === g.q4_vendedor_maior_tmr,
    'Q5 sem resposta do vendedor': mesmo(r.q5_sem_resposta_do_vendedor ?? [], g.q5_sem_resposta_do_vendedor),
  };
  const n = Object.values(certas).filter(Boolean).length;
  for (const [k, v] of Object.entries(certas)) console.log((v ? 'OK ' : 'ERR') + '  ' + k);
  console.log('\nQ1: ' + acertosQ1 + '/30 etapas certas | respostas corretas: ' + n + '/5 | tempo: ' + minutos + ' min');
  const detalhe = { q1_acertos: acertosQ1, respostas: certas };
  const arq = (nome: string) => join(raiz, 'docs', nome);

  if (!painel) {
    // Rodada na mão (sem o painel): registra o tempo e quantas das 5 respostas ficaram certas.
    writeFileSync(arq('linha-de-base.json'), JSON.stringify({ t_manual_minutos: Number(minutos), respostas_corretas: n, ...detalhe, medido_em: new Date().toISOString() }, null, 2));
    console.log('Registrado: sem o painel, ' + minutos + ' min e ' + n + ' de 5 certas.');
  } else {
    // Rodada com o painel: mesmas perguntas; compara tempo e acertos com a rodada na mão.
    let base; try { base = JSON.parse(readFileSync(arq('linha-de-base.json'), 'utf8')); } catch { console.error('Falta a rodada sem o painel (docs/linha-de-base.json).'); process.exit(1); }
    const reducao = (base.t_manual_minutos - Number(minutos)) / base.t_manual_minutos * 100;
    const horas = Math.round((Date.now() - Date.parse(base.medido_em)) / 3600_000);
    if (horas < 48) console.log('Atenção: só se passaram ' + horas + ' h desde a rodada sem o painel (o plano prevê 48 h para você não lembrar das respostas).');
    console.log('\nSem o painel: ' + base.t_manual_minutos + ' min, ' + base.respostas_corretas + ' de 5 certas  |  Com o painel: ' + minutos + ' min, ' + n + ' de 5 certas');
    console.log('Redução de tempo: ' + reducao.toFixed(0) + '% (meta: 79%) -> ' + (reducao >= 79 ? 'meta atingida' : 'meta não atingida'));
    writeFileSync(arq('medicao-com-painel.json'), JSON.stringify({ t_painel_minutos: Number(minutos), respostas_corretas: n, ...detalhe, t_manual_minutos: base.t_manual_minutos, respostas_corretas_manual: base.respostas_corretas, horas_desde_a_rodada_sem_painel: horas, reducao_percentual: Math.round(reducao), meta_atingida: reducao >= 79, medido_em: new Date().toISOString() }, null, 2));
  }
} else if (modo === 'chave') {
  console.log(JSON.stringify(gabaritoDasPerguntas(), null, 2));
} else console.error('uso: baseline.ts preparar | conferir <respostas.json> <minutos>');
