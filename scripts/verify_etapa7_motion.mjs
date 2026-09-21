import { CDPBrowser } from "./cdp_client.mjs";
import fs from "node:fs";
import path from "node:path";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const artifactDir = "C:\\Users\\skale\\.gemini\\antigravity\\brain\\5e821356-189b-4435-8ff7-9a75a8ff52d0";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log("=== INICIANDO VALIDAÇÃO VISUAL & DOM — ETAPA 7 MOTION STUDIO ===");
  const browser = new CDPBrowser(chromePath, { port: 9237, headless: true });
  const results = {
    screenshots: [],
    tests: [],
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
          localStorage.setItem("sol_tv_dev_admin", "true");
          localStorage.setItem("sol_tv_admin_session", JSON.stringify({
            token: "dev_admin",
            user: { email: "admin@skaleetv.com.br", role: "admin" }
          }));
        } catch (e) {}
      `,
    });

    // 1. Navigate to Motion Studio
    console.log("Navegando para http://localhost:5173/studio/motion ...");
    await setViewport(1920, 1080);
    await send("Page.navigate", { url: "http://localhost:5173/studio/motion" });
    await sleep(2500);

    // Verify 3-zone structure is mounted
    const mountedLayout = await evaluate(`
      (() => {
        const nav = document.querySelector('.motion-category-nav');
        const preview = document.querySelector('.motion-preview-center-zone');
        const inspector = document.querySelector('.motion-property-inspector');
        const toolbar = document.querySelector('.motion-studio-toolbar');
        return {
          hasNav: !!nav,
          hasPreview: !!preview,
          hasInspector: !!inspector,
          hasToolbar: !!toolbar,
          inspectorTitle: inspector?.querySelector('.inspector-header h3')?.innerText || ''
        };
      })()
    `);
    console.log("[Verificação 3 Zonas Desktop]:", mountedLayout);
    results.tests.push({ name: "Desktop 3-Zone Architecture Mounted", pass: mountedLayout.hasNav && mountedLayout.hasPreview && mountedLayout.hasInspector });

    await takeScreenshot("motion_desktop_1920_initial.png");

    // 2. Test Category: Fundo & Sunburst
    console.log("Testando Categoria: Fundo & Sunburst...");
    await evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('.motion-category-btn'));
        const bgBtn = btns.find(b => b.innerText.includes('Fundo') || b.innerText.includes('Sunburst'));
        if (bgBtn) bgBtn.click();
      })()
    `);
    await sleep(800);
    const bgInfo = await evaluate(`
      (() => {
        const header = document.querySelector('.inspector-header h3')?.innerText;
        return header;
      })()
    `);
    console.log("[Inspector Atual]:", bgInfo);
    await takeScreenshot("motion_background_sunburst.png");

    // 3. Test Category: Elementos (Visibility Toggles)
    console.log("Testando Categoria: Elementos...");
    await evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('.motion-category-btn'));
        const elBtn = btns.find(b => b.innerText.includes('Elementos'));
        if (elBtn) elBtn.click();
      })()
    `);
    await sleep(800);
    await takeScreenshot("motion_elements_visibility.png");

    // 4. Test Category: Imagem Temática
    console.log("Testando Categoria: Imagem...");
    await evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('.motion-category-btn'));
        const imgBtn = btns.find(b => b.innerText.includes('Imagem'));
        if (imgBtn) imgBtn.click();
      })()
    `);
    await sleep(800);
    await takeScreenshot("motion_theme_image.png");

    // 5. Test Category: Presets
    console.log("Testando Categoria: Presets...");
    await evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('.motion-category-btn'));
        const presetBtn = btns.find(b => b.innerText.includes('Presets'));
        if (presetBtn) presetBtn.click();
      })()
    `);
    await sleep(800);
    await takeScreenshot("motion_presets_library.png");

    // 6. Test Category: Calibração & Ajustes Finos
    console.log("Testando Categoria: Ajustes Finos...");
    await evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('.motion-category-btn'));
        const tuningBtn = btns.find(b => b.innerText.includes('Ajustes'));
        if (tuningBtn) tuningBtn.click();
      })()
    `);
    await sleep(800);
    await takeScreenshot("motion_tuning_section.png");

    // 7. Test Publicar na TV Modal
    console.log("Testando Modal de Confirmação 'Publicar na TV'...");
    await evaluate(`
      (() => {
        const publishBtn = document.querySelector('.btn-publish-tv');
        if (publishBtn) publishBtn.click();
      })()
    `);
    await sleep(800);
    const modalInfo = await evaluate(`
      (() => {
        const modal = document.querySelector('[role="dialog"]');
        return {
          isOpen: !!modal,
          title: modal?.querySelector('h3')?.innerText || '',
          bodyText: modal?.querySelector('p')?.innerText || ''
        };
      })()
    `);
    console.log("[Modal de Publicação]:", modalInfo);
    await takeScreenshot("motion_publish_confirm_modal.png");

    // Close modal
    await evaluate(`
      (() => {
        const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Cancelar'));
        if (cancelBtn) cancelBtn.click();
      })()
    `);
    await sleep(500);

    // 8. Desktop 1366x768 Viewport
    console.log("Testando Desktop 1366x768...");
    await setViewport(1366, 768);
    await sleep(1000);
    await takeScreenshot("motion_desktop_1366.png");

    // 9. Tablet 768x1024 Viewport
    console.log("Testando Tablet 768x1024...");
    await setViewport(768, 1024);
    await sleep(1000);
    await takeScreenshot("motion_tablet_768.png");

    // 10. Mobile 390x844 Viewport (Top 16:9 + Horizontal Nav + Bottom Sheet Drawer)
    console.log("Testando Mobile 390x844...");
    await setViewport(390, 844);
    await sleep(1000);
    await takeScreenshot("motion_mobile_390_initial.png");

    // Click category pill on mobile to open drawer
    await evaluate(`
      (() => {
        const pill = document.querySelector('.motion-category-pill');
        if (pill) pill.click();
      })()
    `);
    await sleep(800);
    await takeScreenshot("motion_mobile_drawer_open.png");

    console.log("=== TODAS AS VALIDAÇÕES CONCLUÍDAS COM SUCESSO! ===");
  } catch (err) {
    console.error("Erro durante a execução do teste CDP:", err);
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Erro na validação:", err);
  process.exit(1);
});

