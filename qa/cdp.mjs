// Captura real (sin tiempo virtual) con Chrome sin cabeza vía CDP.
// Uso: node qa/cdp.mjs URL ANCHO ALTO salida.png [segundos] [js-antes-de-capturar]
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const [url, W, H, out, secs = "12", js = ""] = process.argv.slice(2);
const port = 9333 + Math.floor(Math.random() * 500);
const prof = mkdtempSync(join(tmpdir(), "cdp-"));
const ch = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", "--enable-unsafe-swiftshader", "--use-angle=swiftshader", `--remote-debugging-port=${port}`,
  `--user-data-dir=${prof}`, `--window-size=${W},${H}`, "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tabs;
for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(250); } }
const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Emulation.setDeviceMetricsOverride", { width: +W, height: +H, deviceScaleFactor: 1, mobile: +W < 600 });
await send("Page.navigate", { url });
await sleep(+secs * 1000);
if (js) { const r = await send("Runtime.evaluate", { expression: `(async()=>{${js}})()`, awaitPromise: true, returnByValue: true }); console.log(JSON.stringify(r.result?.result?.value ?? r.result)); await sleep(2500); }
const probe = await send("Runtime.evaluate", { expression: `(()=>{const m=window.__map;if(!m)return 'sin mapa';const c=document.createElement('canvas');c.width=c.height=120;const x=c.getContext('2d');x.drawImage(m.getCanvas(),0,0,120,120);const d=x.getImageData(0,0,120,120).data;const s=new Set();for(let i=0;i<d.length;i+=4)s.add(d[i]>>3<<10|d[i+1]>>3<<5|d[i+2]>>3);return JSON.stringify({colores:s.size,agentes:m.getSource('agentes')?._data?.features?.length,sw:document.documentElement.scrollWidth,w:innerWidth})})()`, returnByValue: true });
console.log(probe.result?.result?.value);
const shot = await send("Page.captureScreenshot", { format: "png" });
writeFileSync(out, Buffer.from(shot.result.data, "base64"));
ws.close(); ch.kill();
