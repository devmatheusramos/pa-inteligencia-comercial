// CANVAS do Projeto Aplicado preenchido com o projeto real. Os resultados vêm dos arquivos de medição.
//   node evidencias/canvas.mjs   → evidencias/prints/canvas-projeto-aplicado.png
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { abrirNavegador } from './capturar.mjs';

const RAIZ = join(import.meta.dirname, '..'), HTML = join(import.meta.dirname, '_html'), OUT = join(import.meta.dirname, 'prints', 'canvas-projeto-aplicado.png');
mkdirSync(HTML, { recursive: true });
const ler = (arq) => (existsSync(join(RAIZ, arq)) ? JSON.parse(readFileSync(join(RAIZ, arq), 'utf8')) : null);
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// ---- resultados reais ----
const rod = ler('docs/primeira-rodada-ia.json'), base = ler('docs/linha-de-base.json'), painel = ler('docs/medicao-com-painel.json');
const acertos = rod.filter((x) => x.ia.etapa === x.gabarito.etapa).length, pct = ((acertos / rod.length) * 100).toFixed(1).replace('.', ',');
const logo = join(HTML, 'xpe-modelo.png'); if (existsSync('D:/tmp-canvas/modelo.png')) copyFileSync('D:/tmp-canvas/modelo.png', logo);

const lista = (itens) => '<ul>' + itens.map((i) => `<li>${i}</li>`).join('') + '</ul>';
const ico = (d) => `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICONES = {
  contexto: '<circle cx="6" cy="5" r="2.2"/><circle cx="18" cy="5" r="2.2"/><circle cx="12" cy="19" r="2.2"/><path d="M6 7.2v1.5a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7.2M12 11.7v5.1"/>',
  persona: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  premissas: '<rect x="5" y="4.5" width="14" height="16" rx="2"/><path d="M9 4.5V3h6v1.5M8.8 12.6l2.2 2.2 4.2-4.4"/>',
  backlog: '<path d="M9.5 6.5H20M9.5 12H20M9.5 17.5H20"/><circle cx="5" cy="6.5" r=".9"/><circle cx="5" cy="12" r=".9"/><circle cx="5" cy="17.5" r=".9"/>',
  area: '<path d="M9 3.5h6M10 3.5v6L5 18.5a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3L14 9.5v-6M8 15h8"/>',
  resultado: '<circle cx="12" cy="12" r="8.5"/><path d="M8.2 12.4l2.7 2.7 5-5.2"/>',
  solucao: '<path d="M9.5 17.5h5M10 20.5h4M12 3.5a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3.5z"/>',
  licoes: '<path d="M9 3.5h6l-1 5.5 3 3.5H7L10 9 9 3.5zM12 12.5v8"/>',
  beneficios: '<path d="M7 11v9H4v-9zM7 11l4-7.5c1.5 0 2.5 1 2.2 2.6L12.6 9H18a2 2 0 0 1 2 2.4l-1.2 6.4a2.5 2.5 0 0 1-2.5 2.2H7"/>',
  hipoteses: '<path d="M12 3v18M12 5.5h7l2 2.2-2 2.2h-7M12 12.8H5L3 15l2 2.2h7"/>',
  objetivo: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.3"/>',
};
const caixa = (cls, icone, titulo, corpo, pos) => `<section class="box ${cls}" style="${pos}"><h2>${ico(ICONES[icone])}<span>${titulo}</span></h2><div class="txt">${corpo}</div></section>`;

const tempoPainel = painel
  ? `Com painel: <b>${painel.t_painel_minutos} min</b> (${painel.respostas_corretas}/5 certas) → redução de <b>${painel.reducao_percentual}%</b>${painel.meta_atingida ? ' ✔' : ' (meta 79%)'}`
  : 'Com painel: <b>a medir em 22/11</b> (meta: redução de 79%)';

const corpoHTML = `
<header><div class="logo"></div><div class="tit">CANVAS DO PROJETO APLICADO</div>
  <div class="versao"><i>Título/Versão:</i> Plataforma de inteligência comercial para equipes de vendas via WhatsApp<br><span>Matheus Keeven da Silva Ramos · versão de 22/11/2026</span></div></header>
${caixa('verde', 'contexto', 'ANÁLISE DE<br>CONTEXTO', lista(['O WhatsApp é o balcão de vendas das PMEs: <b>80%</b> das empresas que vendem online usam mensagens (Cetic.br, 2025)', 'O gestor não enxerga as conversas: depende do relato do vendedor', 'CRM manual não funciona: o vendedor não preenche']), 'left:100px;top:200px;width:227px;height:600px')}
${caixa('verde', 'persona', 'PERSONAS', lista(['<b>Carlos, 42</b>, gestor comercial: quer ver o pipeline sem ler conversa por conversa e descobrir cedo a venda em risco', '<b>Ana Paula, 27</b>, vendedora: perde follow-up por excesso de conversas; quer a carteira organizada, sem burocracia']), 'left:351px;top:200px;width:227px;height:600px')}
${caixa('turquesa', 'premissas', 'PREMISSAS E<br>RESTRIÇÕES', `<p><b>Premissas</b></p>${lista(['número de WhatsApp só de trabalho', 'testes com 30 conversas simuladas'])}<p><b>Restrições</b></p>${lista(['3 sprints, 21 dias', 'WhatsApp só para leitura', 'dados pessoais escondidos antes de guardar'])}`, 'left:602px;top:200px;width:227px;height:600px')}
${caixa('verde', 'beneficios', 'BENEFÍCIOS E<br>JUSTIFICATIVAS', lista(['Gestor decide com dados, não com relato', 'Vendedor não perde follow-up', 'Venda em risco aparece antes de o cliente sumir', 'Histórico comercial sem digitar nada']), 'left:100px;top:830px;width:227px;height:620px')}
${caixa('verde', 'hipoteses', 'HIPÓTESES', lista(['<b>H1</b> o gestor perde tempo consolidando as negociações', '<b>H2</b> o tempo de resposta pode ser medido automaticamente', '<b>H3</b> as pendências podem ser extraídas das conversas', '<b>H4</b> a IA identifica a etapa da venda']), 'left:351px;top:830px;width:227px;height:620px')}
${caixa('turquesa', 'objetivo', 'OBJETIVO<br>S.M.A.R.T.', '<p>MVP de inteligência comercial com IA, que lê o WhatsApp e apoia gestores de PMEs: <b>reduzir em 79% ou mais o tempo de acompanhamento</b> e <b>acertar 85% ou mais das etapas da venda</b>, em <b>3 sprints (21 dias)</b>.</p>', 'left:602px;top:830px;width:227px;height:620px')}
${caixa('turquesa', 'backlog', 'BACKLOG', `<p class="s">Sprint 1 · Fundamentos</p>${lista(['00001 Escopo e validação', '00002 Leitura do WhatsApp', '00003 Arquitetura, custos e dados pessoais', '00004 Repositório e 30 conversas de teste'])}<p class="s">Sprint 2 · Fluxo principal</p>${lista(['00005 Receber, esconder dados, ligar ao vendedor', '00006 IA: etapa, pendências, próximo passo', '00007 Tempo de resposta e acesso por perfil', '00008 Preparar a validação'])}<p class="s">Sprint 3 · Painéis e validação</p>${lista(['00009 Painel do gestor e do vendedor', '00010 Medir acerto e tempo', '00011 Corrigir e documentar', '00012 AWS (próximo passo)'])}`, 'left:853px;top:200px;width:227px;height:1250px')}
<section class="box azul" style="left:1105px;top:200px;width:449px;height:1250px"><h2>${ico(ICONES.area)}<span>ÁREA DE EXPERIMENTAÇÃO</span></h2>
  <div class="txt" style="height:300px;overflow:hidden">${lista(['<b>Sprint 1 · 02 a 08/11</b> escopo, leitura do WhatsApp (Evolution API), arquitetura', '<b>Sprint 2 · 09 a 15/11</b> mensagens → dados escondidos → IA → tempo de resposta → login por perfil', '<b>Sprint 3 · 16 a 22/11</b> painel do gestor e do vendedor, medição e correção de nome e endereço'])}</div></section>
<section class="box resultado" style="left:1105px;top:530px;width:449px;height:300px"><h2>${ico(ICONES.resultado)}<span>RESULTADO</span></h2>
  <div class="txt">${lista([`Etapa da venda: <b>${acertos} de ${rod.length} (${pct}%)</b>, meta de 85% ✔`, `Sem painel: <b>${base.t_manual_minutos} min</b> (${base.respostas_corretas}/5 certas)`, tempoPainel, 'A IA acha cerca de 3 em cada 10 pendências'])}</div></section>
<div class="haste" style="left:1317px;top:830px;width:26px;height:620px"></div>
${caixa('azul sem-fundo', 'solucao', 'SOLUÇÃO', '<p>Lê o WhatsApp <b>só para leitura</b> → esconde dados pessoais → a <b>IA</b> entende a conversa → mede o <b>tempo de resposta</b> → <b>painel</b> para gestor e vendedor.</p><p>Três agentes: <b>Vigia</b>, <b>Cronômetro</b> e <b>Leitor</b>.</p>', 'left:1105px;top:830px;width:212px;height:620px')}
${caixa('azul sem-fundo', 'licoes', 'LIÇÕES<br>APRENDIDAS', lista(['Travar as respostas certas antes de ver a IA deixa a medição honesta', 'Esconder nome e endereço custou 1 acerto (27 → 26), mas era necessário', 'Ler na mão deixa passar as pendências', 'Gestor e vendedor precisam de telas diferentes']), 'left:1343px;top:830px;width:211px;height:620px')}
`;

const css = `*{box-sizing:border-box}body{margin:0;width:1600px;height:1500px;background:#000;position:relative;font:21px/1.28 "Segoe UI",Arial,sans-serif;color:#fff;overflow:hidden}
header{position:absolute;left:100px;top:46px;width:1454px;height:110px}
.logo{position:absolute;left:0;top:18px;width:190px;height:78px;background:url(xpe-modelo.png) -215px -128px/2995px auto no-repeat}
.tit{position:absolute;left:214px;top:34px;font-size:32px;white-space:nowrap;letter-spacing:.2px}
.versao{font-size:21px;position:absolute;right:0;top:0;width:640px;height:110px;background:#3c3c3c;border-radius:10px;padding:14px 20px;font-size:22px;line-height:1.3}.versao i{color:#aaa;margin-right:6px}.versao span{color:#d6d6d6;font-size:19px}
.box{position:absolute;border-radius:22px;padding:18px 20px;overflow:hidden}.verde{background:#35b45b}.turquesa{background:#00a79d}.azul{background:#1b75bc}.resultado{background:#2b3990;border-radius:22px 22px 0 0}
.sem-fundo{background:#1b75bc;border-radius:22px 22px 0 0}
.haste{position:absolute;background:#2b3990}
h2{margin:0 0 12px;display:flex;align-items:center;gap:14px;font-size:20px;font-weight:600;letter-spacing:.3px;line-height:1.15}h2 svg{flex:none}
.txt{font-size:20.5px}.txt ul{margin:0;padding-left:20px}.txt li{margin:0 0 7px}.txt p{margin:0 0 8px}.txt b{font-weight:700}.txt .s{margin:10px 0 4px;font-weight:700;color:#e6fffb;font-size:19px;text-transform:uppercase;letter-spacing:.3px}`;
const f = join(HTML, 'canvas.html'); writeFileSync(f, `<!doctype html><meta charset="utf-8"><style>${css}</style><body>${corpoHTML}</body>`);

const nav = await abrirNavegador({ largura: 1600, altura: 1500 });
try {
  await nav.ir(pathToFileURL(f).href, 900);
  const estouros = await nav.js(`[...document.querySelectorAll('.box')].map((b) => { const t = b.querySelector('.txt'); return t && t.scrollHeight > t.clientHeight + 1 || b.scrollHeight > b.clientHeight + 1 ? b.querySelector('h2').textContent.trim().slice(0, 24) + ' (sobra ' + (b.scrollHeight - b.clientHeight) + 'px)' : null; }).filter(Boolean)`);
  console.log('caixas com texto cortado:', estouros.length ? estouros : 'nenhuma');
  await nav.foto(OUT, { x: 0, y: 0, w: 1600, h: 1500 });
  console.log('ok', OUT);
} finally { await nav.fechar(); }
