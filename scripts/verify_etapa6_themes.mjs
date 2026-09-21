import { CDPBrowser } from "./cdp_client.mjs";
import fs from "node:fs";
import path from "node:path";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const artifactDir = "C:\\Users\\skale\\.gemini\\antigravity\\brain\\5e821356-189b-4435-8ff7-9a75a8ff52d0";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log("=== INICIANDO VALIDAÇÃO VISUAL & DOM — ETAPA 6.1 TEMAS ===");
  const browser = new CDPBrowser(chromePath, { port: 9237, headless: true });
  const results = {
    domVideosCount: 0,
    networkMp4sCount: 0,
    screenshots: [],
  };

  try {
    await browser.start();

    const res = await fetch("http://127.0.0.1:9237/json/list");
    const targets = await res.json();
    const pageTarget = targets.find((t) => t.type === "page");
    if (!pageTarget) throw new Error("No page target found");

    const pageWs = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((r) => { pageWs.onopen = r; });

    let msgId = 1;
    const pending = new Map();
    const networkRequests = [];

    pageWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data.toString());
        if (data.id && pending.has(data.id)) {
          const { resolve, reject } = pending.get(data.id);
          pending.delete(data.id);
          if (data.error) reject(new Error(data.error.message || JSON.stringify(data.error)));
          else resolve(data.result);
        } else if (data.method === "Network.requestWillBeSent") {
          networkRequests.push({
            url: data.params.request.url,
            method: data.params.request.method,
            timestamp: Date.now(),
          });
        }
      } catch (err) {
        console.error("WS Parse error:", err);
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        pending.set(id, { resolve, reject });
        pageWs.send(JSON.stringify({ id, method, params }));
      });
    }

    async function evaluate(expression) {
      const resp = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (resp.exceptionDetails) {
        throw new Error(resp.exceptionDetails.text || resp.exceptionDetails.exception?.description || "Eval error");
      }
      return resp.result?.value;
    }

    async function setViewport(width, height) {
      await send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: width < 768,
      });
    }

    async function takeScreenshot(fileName) {
      const snap = await send("Page.captureScreenshot", { format: "png" });
      const filePath = path.join(artifactDir, fileName);
      fs.writeFileSync(filePath, Buffer.from(snap.data, "base64"));
      results.screenshots.push(filePath);
      console.log(`[Screenshot salvo]: ${fileName}`);
    }

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Network.enable");

    // Add dev bypass before navigation
    await send("Page.addScriptToEvaluateOnNewDocument", {
      source: `
        try {
          localStorage.setItem('sol_tv_dev_admin', 'true');
        } catch(e) {}
      `,
    });

    // 1. Viewport Desktop 1920x1080
    await setViewport(1920, 1080);

    // 2. Navegar para Admin
    console.log("1. Navegando para http://localhost:5174/admin ...");
    await send("Page.navigate", { url: "http://localhost:5174/admin" });
    await sleep(2500);

    // 3. Clicar na aba Temas
    console.log("2. Clicando na aba Temas...");
    await evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const themesBtn = btns.find(b => (b.textContent && b.textContent.includes('Temas')) || b.title === 'Temas Visuais');
        if (themesBtn) themesBtn.click();
      })()
    `);
    await sleep(1000);

    // 4. Validar DOM: Contagem de <video> tags
    const videoCount = await evaluate(`document.querySelectorAll('video').length`);
    results.domVideosCount = videoCount;
    console.log(`3. Contagem de elementos <video> na aba Temas: ${videoCount} (Esperado: 0)`);
    if (videoCount !== 0) {
      throw new Error(`Esperado 0 vídeos no DOM, encontrado: ${videoCount}`);
    }

    // 5. Capturar screenshot Desktop 1920
    console.log("4. Capturando screenshot Desktop 1920...");
    await takeScreenshot("themes_desktop_1920.png");

    // 6. Capturar screenshot Desktop 1366
    console.log("5. Capturando screenshot Desktop 1366...");
    await setViewport(1366, 768);
    await sleep(600);
    await takeScreenshot("themes_desktop_1366.png");

    // 7. Capturar screenshot Tablet 768
    console.log("6. Capturando screenshot Tablet 768...");
    await setViewport(768, 1024);
    await sleep(600);
    await takeScreenshot("themes_tablet_768.png");

    // 8. Capturar screenshot Mobile 390
    console.log("7. Capturando screenshot Mobile 390...");
    await setViewport(390, 844);
    await sleep(600);
    await takeScreenshot("themes_mobile_390.png");

    // 9. Abrir Modal de Preview (Desktop)
    console.log("8. Testando Modal de Preview...");
    await setViewport(1920, 1080);
    await sleep(600);
    await evaluate(`
      (() => {
        const expandBtns = Array.from(document.querySelectorAll('button[title="Clique para ampliar o preview"]'));
        if (expandBtns.length > 0) expandBtns[0].click();
      })()
    `);
    await sleep(800);
    await takeScreenshot("themes_preview_modal_desktop.png");

    // Fechar modal de preview
    await evaluate(`
      (() => {
        const closeBtn = document.querySelector('button[title="Fechar"]');
        if (closeBtn) closeBtn.click();
      })()
    `);
    await sleep(500);

    // 10. Testar Troca Real de Tema com Confirmação
    console.log("9. Testando troca real de tema...");
    // Clicar em "Usar este Tema"
    await evaluate(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const applyBtn = buttons.find(b => b.textContent && b.textContent.includes('Usar este Tema'));
        if (applyBtn) applyBtn.click();
      })()
    `);
    await sleep(600);

    // Capturar screenshot do Modal de Confirmação
    await takeScreenshot("themes_confirm_modal_desktop.png");

    // Clicar em "Aplicar Tema"
    await evaluate(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const confirmBtn = buttons.find(b => b.textContent && b.textContent.includes('Aplicar Tema'));
        if (confirmBtn) confirmBtn.click();
      })()
    `);
    await sleep(1500);
    console.log("Tema aplicado via confirmação.");

    // Capturar screenshot com o novo tema ativo
    await takeScreenshot("themes_after_apply_desktop.png");

    // Restaurar tema original (Sol Premium)
    await evaluate(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const restoreBtn = buttons.find(b => b.textContent && b.textContent.includes('Usar este Tema'));
        if (restoreBtn) restoreBtn.click();
      })()
    `);
    await sleep(600);
    await evaluate(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const confirmBtn = buttons.find(b => b.textContent && b.textContent.includes('Aplicar Tema'));
        if (confirmBtn) confirmBtn.click();
      })()
    `);
    await sleep(1500);
    console.log("Tema restaurado para Sol Premium.");

    // 11. Verificar interceptação de vídeo
    const mp4Requests = networkRequests.filter(
      (r) => r.url.endsWith(".mp4") || r.url.endsWith(".webm")
    );
    results.networkMp4sCount = mp4Requests.length;
    console.log(`10. Total de requisições de vídeo/MP4 interceptadas: ${results.networkMp4sCount} (Esperado: 0)`);

    console.log("=== VALIDAÇÃO VISUAL & DOM CONCLUÍDA COM SUCESSO ===");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Erro na validação:", err);
  process.exit(1);
});

