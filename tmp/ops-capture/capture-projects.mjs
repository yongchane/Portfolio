import fs from 'node:fs';
import path from 'node:path';

const base = 'http://127.0.0.1:3000';
const out = path.resolve('tmp/ops-capture/projects-page.png');

function readEnv() {
  const env = {};
  for (const name of ['.env.local', '.env']) {
    if (!fs.existsSync(name)) continue;
    for (const line of fs.readFileSync(name, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  }
  return env;
}

const env = readEnv();
const accessCode = process.env.PORTFOLIO_OPS_ACCESS_CODE || env.PORTFOLIO_OPS_ACCESS_CODE || 'hy-ops-0408';

async function cdp(method, params = {}) {
  const id = ++cdp.id;
  ws.send(JSON.stringify({ id, method, params }));
  return await new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
  });
}
cdp.id = 0;

const target = await fetch('http://127.0.0.1:9222/json/new?' + encodeURIComponent(base + '/ops'), { method: 'PUT' }).then((r) => r.json());
const ws = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  }
});
await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));

await cdp('Page.enable');
await cdp('Runtime.enable');
await cdp('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1800,
  deviceScaleFactor: 1,
  mobile: false,
});

await new Promise((r) => setTimeout(r, 1200));
await cdp('Runtime.evaluate', {
  expression: `fetch('/api/ops/auth', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({accessCode:${JSON.stringify(accessCode)}})}).then(r=>r.json())`,
  awaitPromise: true,
});
await cdp('Page.navigate', { url: base + '/ops' });
await new Promise((r) => setTimeout(r, 3500));
await cdp('Runtime.evaluate', {
  expression: `(() => { const btn = [...document.querySelectorAll('button')].find((b) => b.textContent && b.textContent.includes('Projects')); if (btn) btn.click(); return !!btn; })()`,
  awaitPromise: true,
});
await new Promise((r) => setTimeout(r, 1200));
await cdp('Runtime.evaluate', { expression: `window.scrollTo(0, 0)` });
await new Promise((r) => setTimeout(r, 300));
const shot = await cdp('Page.captureScreenshot', {
  format: 'png',
  fromSurface: true,
  captureBeyondViewport: true,
});
fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
console.log(out);
ws.close();
