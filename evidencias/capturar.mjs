// Tira prints recortados do sistema rodando, com o trecho importante marcado e numerado.
// Usa o Edge sem janela (protocolo de depuração) — nada é montado à mão: o que aparece é a tela real.
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORTA = 9333;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

export async function abrirNavegador({ largura = 1360, altura = 900 } = {}) {
  const pasta = mkdtempSync(join(tmpdir(), 'edge-prints-'));
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${PORTA}`, `--user-data-dir=${pasta}`, `--window-size=${largura},${altura}`, 'about:blank'], { stdio: 'ignore' });
  let alvo;
  for (let i = 0; i < 60 && !alvo; i++) { await espera(250); try { alvo = (await (await fetch(`http://localhost:${PORTA}/json`)).json()).find((t) => t.type === 'page'); } catch {} }
  if (!alvo) throw new Error('Edge não abriu');
  const ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((ok) => (ws.onopen = ok));
  let n = 0; const pend = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  const enviar = (method, params = {}) => new Promise((ok, erro) => { const id = ++n; pend.set(id, (d) => (d.error ? erro(new Error(d.error.message)) : ok(d.result))); ws.send(JSON.stringify({ id, method, params })); });
  await enviar('Page.enable');
  await enviar('Emulation.setDeviceMetricsOverride', { width: largura, height: altura, deviceScaleFactor: 1.5, mobile: false });

  const api = {
    async ir(url, aguardar = 1800) { await enviar('Page.navigate', { url }); await espera(aguardar); },
    async js(expr) { const r = await enviar('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'erro no script'); return r.result.value; },
    async esperar(ms) { await espera(ms); },
    async tamanho(w, h) { await enviar('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1.5, mobile: false }); await espera(400); },
    // Marca elementos com uma caixa vermelha e um número; devolve o retângulo que reúne tudo (para recortar).
    async marcar(seletores, { margem = 10, incluir = [] } = {}) {
      return api.js(`(() => {
        document.querySelectorAll('.marca-print').forEach((e) => e.remove());
        if (!document.getElementById('estilo-print')) { const st = document.createElement('style'); st.id = 'estilo-print'; st.textContent = 'header{position:static!important}'; document.head.appendChild(st); }
        const caixas = []; const sel = ${JSON.stringify(seletores)}; const inc = ${JSON.stringify(incluir)};
        const primeiro = document.querySelector(sel[0]); if (primeiro && !primeiro.closest('#gaveta')) primeiro.scrollIntoView({ block: 'center' });
        sel.forEach((s, i) => { const el = document.querySelector(s); if (!el) return; const r = el.getBoundingClientRect(); caixas.push([r.left + scrollX, r.top + scrollY, r.width, r.height, i + 1]); });
        const todos = [...caixas]; inc.forEach((s) => { const el = document.querySelector(s); if (el) { const r = el.getBoundingClientRect(); todos.push([r.left + scrollX, r.top + scrollY, r.width, r.height]); } });
        caixas.forEach(([x, y, w, h, n]) => {
          const d = document.createElement('div'); d.className = 'marca-print';
          d.style.cssText = 'position:absolute;left:' + (x - 6) + 'px;top:' + (y - 6) + 'px;width:' + (w + 12) + 'px;height:' + (h + 12) + 'px;border:3px solid #e11d48;border-radius:10px;pointer-events:none;z-index:99999;box-shadow:0 0 0 3px #fff8';
          const b = document.createElement('div'); b.textContent = n;
          b.style.cssText = 'position:absolute;left:-14px;top:-14px;width:28px;height:28px;border-radius:50%;background:#e11d48;color:#fff;font:700 15px/28px system-ui;text-align:center;box-shadow:0 0 0 3px #fff';
          d.appendChild(b); document.body.appendChild(d); });
        const x0 = Math.min(...todos.map((t) => t[0])), y0 = Math.min(...todos.map((t) => t[1])), x1 = Math.max(...todos.map((t) => t[0] + t[2])), y1 = Math.max(...todos.map((t) => t[1] + t[3]));
        return { x: Math.max(0, x0 - ${margem} - 14), y: Math.max(0, y0 - ${margem} - 14), w: x1 - x0 + ${margem} * 2 + 28, h: y1 - y0 + ${margem} * 2 + 28 };
      })()`);
    },
    async foto(arquivo, ret) {
      const r = ret || (await api.js('({ x: 0, y: 0, w: innerWidth, h: innerHeight })'));
      const { data } = await enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: r.x, y: r.y, width: r.w, height: r.h, scale: 1 } });
      mkdirSync(join(arquivo, '..'), { recursive: true }); writeFileSync(arquivo, Buffer.from(data, 'base64')); return arquivo;
    },
    async fechar() { try { ws.close(); } catch {} proc.kill(); },
  };
  return api;
}
