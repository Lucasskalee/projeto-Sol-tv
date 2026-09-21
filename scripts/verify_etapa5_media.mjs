import { CDPBrowser } from "./cdp_client.mjs";
import fs from "node:fs";
import path from "node:path";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const artifactDir = "C:\\Users\\skale\\.gemini\\antigravity\\brain\\5e821356-189b-4435-8ff7-9a75a8ff52d0";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const dbMediaRows = [
  {
    id: "55555555-5555-4555-8555-555555555555",
    title: "Avisos e Ofertas Especiais",
    type: "image",
    media_url: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80",
    storage_path: "acougue/images/1789674815641-d04ecc41.png",
    sector: "acougue",
    duration_seconds: 10,
    position: 1,
    active: true,
    starts_at: "2026-09-21T00:00:00Z",
    ends_at: "2026-10-21T23:59:59Z",
    created_at: "2026-09-21T07:00:00Z",
    updated_at: "2026-09-21T07:00:00Z",
  },
  {
    id: "66666666-6666-4666-8666-666666666666",
    title: "Institucional Carnes Nobres Sol",
    type: "video",
    media_url: "https://cdn.coverr.co/videos/coverr-a-chef-preparing-meat-1577/1080p.mp4",
    storage_path: "acougue/videos/1789674815641-d04ecc42.mp4",
    sector: "acougue",
    duration_seconds: 15,
    position: 2,
    active: true,
    starts_at: "2026-09-21T00:00:00Z",
    ends_at: "2026-10-21T23:59:59Z",
    created_at: "2026-09-21T07:00:00Z",
    updated_at: "2026-09-21T07:00:00Z",
  },
  {
    id: "77777777-7777-4777-8777-777777777777",
    title: "Cortes Selecionados da Semana",
    type: "image",
    media_url: "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=1200&q=80",
    storage_path: "acougue/images/1789674815641-d04ecc43.png",
    sector: "acougue",
    duration_seconds: 8,
    position: 3,
    active: true,
    starts_at: "2026-09-21T00:00:00Z",
    ends_at: "2026-10-21T23:59:59Z",
    created_at: "2026-09-21T07:00:00Z",
    updated_at: "2026-09-21T07:00:00Z",
  },
  {
    id: "88888888-8888-4888-8888-888888888888",
    title: "Campanha Fim de Semana (Pausada)",
    type: "video",
    media_url: "https://cdn.coverr.co/videos/coverr-a-chef-preparing-meat-1577/1080p.mp4",
    storage_path: "acougue/videos/1789674815641-d04ecc44.mp4",
    sector: "acougue",
    duration_seconds: 12,
    position: 4,
    active: false,
    starts_at: "2026-09-21T00:00:00Z",
    ends_at: "2026-10-21T23:59:59Z",
    created_at: "2026-09-21T07:00:00Z",
    updated_at: "2026-09-21T07:00:00Z",
  },
];

async function run() {
  const browser = new CDPBrowser(chromePath, { port: 9235, headless: true });
  const results = {
    domVideosGrid: null,
    domVideosPreviewOpen: null,
    domVideosPreviewClosed: null,
    networkMp4sOnGrid: [],
    networkMp4sOnFilter: [],
    networkMp4sOnSearch: [],
    networkMp4sOnPreview: [],
    screenshots: [],
  };

  try {
    console.log("Iniciando navegador Chrome CDP...");
    await browser.start();

    const res = await fetch("http://127.0.0.1:9235/json/list");
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

    // Add script to set dev bypass and mock Supabase sol_tv_media responses
    await send("Page.addScriptToEvaluateOnNewDocument", {
      source: `
        try {
          localStorage.setItem('sol_tv_dev_admin', 'true');
          const mockData = ${JSON.stringify(dbMediaRows)};
          const origFetch = window.fetch;
          window.fetch = async function(...args) {
            const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
            if (url.includes('sol_tv_media') && (!args[1] || !args[1].method || args[1].method.toUpperCase() === 'GET')) {
              return new Response(JSON.stringify(mockData), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              });
            }
            return origFetch.apply(this, args);
          };
        } catch(e) {}
      `,
    });

    // 1. Set Desktop 1920x1080 Viewport
    await setViewport(1920, 1080);

    // 2. Navigate to Admin
    console.log("Navegando para http://localhost:5174/admin ...");
    await send("Page.navigate", { url: "http://localhost:5174/admin" });
    await sleep(2500);

    // Switch to Mídias Tab
    console.log("Alternando para a aba Mídias...");
    await evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const mediaBtn = btns.find(b => b.textContent && b.textContent.includes('Mídias'));
        if (mediaBtn) mediaBtn.click();
      })()
    `);
    await sleep(1500);

    // 4. TESTE DE DOM 1: Grid sem preview
    const videoCountGrid = await evaluate(`document.querySelectorAll('video').length`);
    results.domVideosGrid = videoCountGrid;
    console.log(`>>> [DOM TEST 1] <video> elements on grid: ${videoCountGrid} (Expected: 0)`);

    // 5. TESTE DE REDE A: Verificar se MP4 foi solicitado apenas na abertura do grid
    const mp4RequestsGrid = networkRequests.filter(r => r.url.toLowerCase().includes('.mp4'));
    results.networkMp4sOnGrid = mp4RequestsGrid.map(r => r.url);
    console.log(`>>> [NETWORK TEST A] MP4 requests on grid load: ${mp4RequestsGrid.length} (Expected: 0)`);

    // 6. TESTE DE FILTROS & BUSCA
    // Search
    await evaluate(`
      (() => {
        const input = document.querySelector('.admin-media-search-input');
        if (input) {
          input.value = 'Carnes Nobres';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()
    `);
    await sleep(600);
    const mp4RequestsSearch = networkRequests.filter(r => r.url.toLowerCase().includes('.mp4'));
    results.networkMp4sOnSearch = mp4RequestsSearch.map(r => r.url);
    console.log(`>>> [NETWORK TEST B] MP4 requests after search: ${mp4RequestsSearch.length} (Expected: 0)`);

    // Clear search & Switch Filter Pills: Todas -> Vídeos -> Ativas -> Todas
    await evaluate(`
      (() => {
        const clearBtn = document.querySelector('.admin-media-search-clear');
        if (clearBtn) clearBtn.click();
        const pills = Array.from(document.querySelectorAll('.admin-filter-pill'));
        const videosPill = pills.find(p => p.textContent.includes('Vídeos'));
        if (videosPill) videosPill.click();
      })()
    `);
    await sleep(600);

    await evaluate(`
      (() => {
        const pills = Array.from(document.querySelectorAll('.admin-filter-pill'));
        const activePill = pills.find(p => p.textContent.includes('Ativas'));
        if (activePill) activePill.click();
      })()
    `);
    await sleep(600);

    await evaluate(`
      (() => {
        const pills = Array.from(document.querySelectorAll('.admin-filter-pill'));
        const allPill = pills.find(p => p.textContent.includes('Todas'));
        if (allPill) allPill.click();
      })()
    `);
    await sleep(800);

    const mp4RequestsFilter = networkRequests.filter(r => r.url.toLowerCase().includes('.mp4'));
    results.networkMp4sOnFilter = mp4RequestsFilter.map(r => r.url);
    console.log(`>>> [NETWORK TEST C] MP4 requests after filter switching: ${mp4RequestsFilter.length} (Expected: 0)`);

    // Capture Desktop Media Library
    await takeScreenshot("media_library_desktop_1920.png");

    // 7. TESTE DE PREVIEW MODAL (VÍDEO)
    console.log("Abrindo preview de vídeo...");
    // Find video card and click
    await evaluate(`
      (() => {
        const cards = Array.from(document.querySelectorAll('.admin-media-card'));
        const videoCard = cards.find(c => c.textContent.includes('VÍDEO')) || cards[0];
        if (videoCard) videoCard.click();
      })()
    `);
    await sleep(80);

    // TESTE DE DOM 2: Preview aberto
    const videoCountPreviewOpen = await evaluate(`document.querySelectorAll('video').length`);
    results.domVideosPreviewOpen = videoCountPreviewOpen;
    console.log(`>>> [DOM TEST 2] <video> elements with Preview Modal OPEN: ${videoCountPreviewOpen} (Expected: 1)`);

    // Capture Desktop Preview Modal
    await takeScreenshot("media_preview_modal_desktop.png");

    // TESTE DE REDE D: MP4 carregado durante preview
    const mp4RequestsPreview = networkRequests.filter(r => r.url.toLowerCase().includes('.mp4'));
    results.networkMp4sOnPreview = mp4RequestsPreview.map(r => r.url);
    console.log(`>>> [NETWORK TEST D] MP4 requests during preview: ${mp4RequestsPreview.length} (Expected: >= 1)`);

    // Fechar Preview Modal
    console.log("Fechando preview modal...");
    await evaluate(`
      (() => {
        const closeBtn = document.querySelector('.admin-modal-close-btn');
        if (closeBtn) closeBtn.click();
      })()
    `);
    await sleep(600);

    // TESTE DE DOM 3: Preview fechado
    const videoCountPreviewClosed = await evaluate(`document.querySelectorAll('video').length`);
    results.domVideosPreviewClosed = videoCountPreviewClosed;
    console.log(`>>> [DOM TEST 3] <video> elements with Preview Modal CLOSED: ${videoCountPreviewClosed} (Expected: 0)`);

    // 8. TESTE DO PREVIEW DE IMAGEM
    console.log("Abrindo preview de imagem...");
    await evaluate(`
      (() => {
        const cards = Array.from(document.querySelectorAll('.admin-media-card'));
        const imageCard = cards.find(c => c.textContent.includes('IMAGEM')) || cards[0];
        if (imageCard) imageCard.click();
      })()
    `);
    await sleep(800);
    await takeScreenshot("media_preview_image_desktop.png");

    // Fechar Preview de Imagem
    await evaluate(`
      (() => {
        const closeBtn = document.querySelector('.admin-modal-close-btn');
        if (closeBtn) closeBtn.click();
      })()
    `);
    await sleep(600);

    // 9. TESTE DO DRAWER (EDIÇÃO E NOVA MÍDIA)
    console.log("Abrindo Drawer para Editar Mídia...");
    // Click edit on first card menu
    await evaluate(`
      (() => {
        const menuBtn = document.querySelector('.admin-media-menu-trigger');
        if (menuBtn) menuBtn.click();
      })()
    `);
    await sleep(400);
    await evaluate(`
      (() => {
        const editBtn = Array.from(document.querySelectorAll('.admin-context-menu-item')).find(b => b.textContent.includes('Editar'));
        if (editBtn) editBtn.click();
      })()
    `);
    await sleep(1000);
    await takeScreenshot("media_drawer_edit_desktop.png");

    // Fechar Drawer
    await evaluate(`
      (() => {
        const closeBtn = document.querySelector('.admin-drawer-close-btn');
        if (closeBtn) closeBtn.click();
      })()
    `);
    await sleep(600);

    // Abrir Drawer de Nova Mídia
    console.log("Abrindo Drawer de Nova Mídia...");
    await evaluate(`
      (() => {
        const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Adicionar Mídia'));
        if (addBtn) addBtn.click();
      })()
    `);
    await sleep(1000);
    await takeScreenshot("media_drawer_desktop.png");

    // Fechar Drawer
    await evaluate(`
      (() => {
        const closeBtn = document.querySelector('.admin-drawer-close-btn');
        if (closeBtn) closeBtn.click();
      })()
    `);
    await sleep(600);

    // 10. RESPONSIVIDADE: TABLET 768x1024
    console.log("Testando Tablet 768x1024...");
    await setViewport(768, 1024);
    await sleep(800);
    await takeScreenshot("media_library_tablet_768.png");

    // 11. RESPONSIVIDADE: MOBILE 390x844
    console.log("Testando Mobile 390x844...");
    await setViewport(390, 844);
    await sleep(800);
    await takeScreenshot("media_library_mobile_390.png");

    // Abrir Drawer no Mobile
    await evaluate(`
      (() => {
        const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Adicionar Mídia'));
        if (addBtn) addBtn.click();
      })()
    `);
    await sleep(1000);
    await takeScreenshot("media_drawer_mobile_390.png");

    // Fechar Drawer no Mobile
    await evaluate(`
      (() => {
        const closeBtn = document.querySelector('.admin-drawer-close-btn');
        if (closeBtn) closeBtn.click();
      })()
    `);
    await sleep(600);

    // 12. RESPONSIVIDADE: DESKTOP 1366x768
    console.log("Testando Desktop 1366x768...");
    await setViewport(1366, 768);
    await sleep(800);
    await takeScreenshot("media_library_desktop_1366.png");

    console.log("\n=======================================================");
    console.log("RELATÓRIO DE VALIDAÇÃO DE DOM E REDE — ETAPA 5.1");
    console.log("=======================================================");
    console.log(`DOM 1 (Grid sem Preview): <video> = ${results.domVideosGrid} (PASS: ${results.domVideosGrid === 0})`);
    console.log(`DOM 2 (Preview Aberto):   <video> = ${results.domVideosPreviewOpen} (PASS: ${results.domVideosPreviewOpen === 1})`);
    console.log(`DOM 3 (Preview Fechado):  <video> = ${results.domVideosPreviewClosed} (PASS: ${results.domVideosPreviewClosed === 0})`);
    console.log(`REDE (MP4 no Grid):       requests = ${results.networkMp4sOnGrid.length} (PASS: ${results.networkMp4sOnGrid.length === 0})`);
    console.log(`REDE (MP4 no Filtro):     requests = ${results.networkMp4sOnFilter.length} (PASS: ${results.networkMp4sOnFilter.length === 0})`);
    console.log(`REDE (MP4 na Busca):      requests = ${results.networkMp4sOnSearch.length} (PASS: ${results.networkMp4sOnSearch.length === 0})`);
    console.log(`REDE (MP4 no Preview):    requests = ${results.networkMp4sOnPreview.length} (PASS: ${results.networkMp4sOnPreview.length > 0})`);
    console.log("=======================================================\n");

    pageWs.close();
  } catch (err) {
    console.error("Erro na verificação:", err);
  } finally {
    await browser.close();
  }
}

run();

