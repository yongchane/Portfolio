const base='http://127.0.0.1:3000';
const target=await fetch('http://127.0.0.1:9222/json/new?'+encodeURIComponent(base+'/ops'),{method:'PUT'}).then(r=>r.json());
const ws=new WebSocket(target.webSocketDebuggerUrl); const pending=new Map(); let id=0;
ws.addEventListener('message', e=>{const m=JSON.parse(e.data); if(m.id&&pending.has(m.id)){const p=pending.get(m.id); pending.delete(m.id); m.error?p.reject(m.error):p.resolve(m.result)}});
await new Promise(r=>ws.addEventListener('open',r,{once:true}));
function cdp(method,params={}){ws.send(JSON.stringify({id:++id,method,params})); return new Promise((resolve,reject)=>pending.set(id,{resolve,reject}));}
await cdp('Page.enable'); await cdp('Runtime.enable'); await new Promise(r=>setTimeout(r,1000));
let res=await cdp('Runtime.evaluate',{expression:`fetch('/api/ops/auth').then(r=>r.json())`, awaitPromise:true, returnByValue:true}); console.log('GET',res.result.value);
res=await cdp('Runtime.evaluate',{expression:`fetch('/api/ops/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessCode:'hy-ops-0408'})}).then(async r=>({status:r.status, body: await r.text()}))`, awaitPromise:true, returnByValue:true}); console.log('POST',res.result.value);
res=await cdp('Runtime.evaluate',{expression:`document.cookie`, returnByValue:true}); console.log('cookie-visible',res.result.value);
await cdp('Page.navigate',{url:base+'/ops'}); await new Promise(r=>setTimeout(r,2500));
res=await cdp('Runtime.evaluate',{expression:`document.body.innerText.slice(0,500)`, returnByValue:true}); console.log('body',res.result.value);
ws.close();
