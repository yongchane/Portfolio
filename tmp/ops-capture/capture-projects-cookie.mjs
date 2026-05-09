import fs from 'node:fs';
import path from 'node:path';
import { createHmac } from 'node:crypto';

const base = 'http://127.0.0.1:3000';
const out = path.resolve('/Users/hyeon-yongchan/.openclaw/workspace/tmp/ops-captures/projects-page.png');
const accessCode = process.env.PORTFOLIO_OPS_SESSION_SECRET || process.env.PORTFOLIO_OPS_ACCESS_CODE || 'hy-ops-0408';
const expiresAt = Date.now() + 8 * 60 * 60 * 1000;
const signature = createHmac('sha256', accessCode).update(String(expiresAt)).digest('hex');
const token = `${expiresAt}.${signature}`;

async function newTarget(url) {
  return await fetch('http://127.0.0.1:9222/json/new?' + encodeURIComponent(url), { method: 'PUT' }).then((r) => r.json());
}

const target = await newTarget('about:blank');
const ws = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let id = 0;
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const p = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) p.reject(new Error(JSON.stringify(msg.error)));
    else p.resolve(msg.result);
  }
});
await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));
function cdp(method, params = {}) {
  ws.send(JSON.stringify({ id: ++id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}
await cdp('Page.enable');
await cdp('Runtime.enable');
await cdp('Network.enable');
await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1800, deviceScaleFactor: 1, mobile: false });
await cdp('Network.setCookie', {
  name: 'portfolio_ops_session',
  value: token,
  url: base,
  path: '/',
  httpOnly: true,
  sameSite: 'Lax',
  expires: Math.floor(expiresAt / 1000),
});
await cdp('Page.navigate', { url: base + '/ops' });
await new Promise((r) => setTimeout(r, 3500));
await cdp('Runtime.evaluate', {
  expression: `(() => { const btn = [...document.querySelectorAll('button')].find((b) => b.textContent && b.textContent.includes('Projects')); if (btn) btn.click(); return document.body.innerText.slice(0, 300); })()`,
  awaitPromise: true,
});
await new Promise((r) => setTimeout(r, 1500));
await cdp('Runtime.evaluate', { expression: `window.scrollTo(0, 0)` });
await new Promise((r) => setTimeout(r, 300));
const shot = await cdp('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true });
fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
console.log(out);
ws.close();
