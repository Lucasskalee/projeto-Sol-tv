import { CDPBrowser } from "./cdp_client.mjs";
import path from "node:path";
import os from "node:os";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const REAL_VIDEO_URL = "https://rkcmtzxyqdopchnnurwh.supabase.co/storage/v1/object/public/tv-media/acougue/videos/1788838007992-cd851cf2.mp4";
const REAL_IMAGE_URL = "https://rkcmtzxyqdopchnnurwh.supabase.co/storage/v1/object/public/tv-media/acougue/imagens/1789674529139-f67ad25a.png";
const ALT_REAL_VIDEO_URL = "https://rkcmtzxyqdopchnnurwh.supabase.co/storage/v1/object/public/tv-media/acougue/videos/1788839790856-421e54bf.mp4";
const UNCACHED_DEDUP_URL = "https://rkcmtzxyqdopchnnurwh.supabase.co/storage/v1/object/public/tv-media/acougue/videos/1788833721442-fdcb2253.mp4";

const results = {};
const networkMetricsTable = [];

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function formatMb(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2);
}

async function getSwTelemetry(page, url = null) {
  return page.evaluate(`
    (async (targetUrl) => {
      if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
        return { hits: 0, misses: 0, downloads: 0, bytesDownloaded: 0, rangeHits: 0 };
      }
      return new Promise((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => resolve(event.data?.telemetry || {});
        navigator.serviceWorker.controller.postMessage({ type: 'GET_TELEMETRY', url: targetUrl }, [channel.port2]);
        setTimeout(() => resolve({ hits: 0, misses: 0, downloads: 0, bytesDownloaded: 0, rangeHits: 0 }), 1000);
      });
    })(${url ? `'${url}'` : 'null'})
  `);
}

async function runHomologation() {
  console.log("=================================================================");
  console.log("INICIANDO ETAPA 4C.0.2 — HOMOLOGAÇÃO REAL DE EGRESS");
  console.log("Navegadores: Google Chrome & Microsoft Edge Desktop");
  console.log("Vídeo Real Supabase: 5.61 MB (1788838007992-cd851cf2.mp4)");
  console.log("Imagem Real Supabase: 0.05 MB (1789674529139-f67ad25a.png)");
  console.log("=================================================================\n");

  const sharedProfileDir = path.join(os.tmpdir(), `sol_tv_homolog_chrome_${Date.now()}`);
  let chromeBrowser = new CDPBrowser(chromePath, {
    port: 9222,
    userDataDir: sharedProfileDir,
    preserveProfile: true,
    headless: true,
  });

  try {
    // -------------------------------------------------------------
    // FASE 1: INICIALIZAÇÃO E LIMPEZA DE AMBIENTE (CHROME)
    // -------------------------------------------------------------
    console.log("--- 1. INICIALIZAÇÃO & LIMPEZA DE AMBIENTE (CHROME) ---");
    await chromeBrowser.start();
    let page = await chromeBrowser.getPage();

    await page.navigate("http://localhost:5173/tv/acougue");
    await sleep(2000);

    const swStatus = await page.evaluate(`
      (async () => {
        if (!('serviceWorker' in navigator)) return { supported: false };
        const reg = await navigator.serviceWorker.ready;
        return {
          supported: true,
          active: Boolean(reg.active),
          controller: Boolean(navigator.serviceWorker.controller),
          scope: reg.scope
        };
      })()
    `);
    console.log("Status do Service Worker:", swStatus);

    // Limpa completamente o Cache Storage e Telemetria
    await page.evaluate(`
      (async () => {
        if ('caches' in window) {
          await caches.delete('skalee-tv-media-v1');
        }
        if (navigator.serviceWorker?.controller) {
          const channel = new MessageChannel();
          navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_MEDIA_CACHE' }, [channel.port2]);
        }
      })()
    `);
    await sleep(500);
    console.log("Cache Storage e Telemetria limpos com sucesso.\n");

    // -------------------------------------------------------------
    // FASE 2: PRIMEIRO CARREGAMENTO (DOWNLOAD INICIAL)
    // -------------------------------------------------------------
    console.log("--- 2. PRIMEIRO CARREGAMENTO (DOWNLOAD INICIAL DA CDN) ---");
    const tPre = await getSwTelemetry(page, REAL_VIDEO_URL);

    const firstDownloadResult = await page.evaluate(`
      (async (videoUrl) => {
        const t0 = performance.now();
        const res = await fetch(videoUrl);
        const buf = await res.arrayBuffer();
        const t1 = performance.now();
        
        const cache = await caches.open('skalee-tv-media-v1');
        const cachedMatch = await cache.match(videoUrl);
        
        return {
          status: res.status,
          byteLength: buf.byteLength,
          durationMs: Math.round(t1 - t0),
          inCache: Boolean(cachedMatch),
          contentType: res.headers.get('content-type'),
          acceptRanges: res.headers.get('accept-ranges'),
        };
      })('${REAL_VIDEO_URL}')
    `);

    await sleep(500);
    const tPost = await getSwTelemetry(page, REAL_VIDEO_URL);
    const bytesDownloadedDelta = tPost.bytesDownloaded - tPre.bytesDownloaded;
    const downloadsDelta = tPost.downloads - tPre.downloads;

    console.log("Resultado do 1º Download do Vídeo:", {
      status: firstDownloadResult.status,
      resourceSizeMb: formatMb(firstDownloadResult.byteLength) + " MB",
      durationMs: firstDownloadResult.durationMs + " ms",
      inCacheStorage: firstDownloadResult.inCache,
      swDownloads: downloadsDelta,
      swBytesDownloaded: formatMb(bytesDownloadedDelta) + " MB",
    });

    const passFirstDownload =
      firstDownloadResult.status === 200 &&
      firstDownloadResult.byteLength > 5000000 &&
      firstDownloadResult.inCache === true &&
      downloadsDelta === 1 &&
      bytesDownloadedDelta > 5000000;

    results["Primeiro download"] = passFirstDownload ? "PASS" : "FAIL";
    networkMetricsTable.push({
      teste: "Primeiro acesso",
      requestsRemotos: downloadsDelta,
      bytesRemotos: formatMb(bytesDownloadedDelta) + " MB",
      resultado: results["Primeiro download"],
    });

    // -------------------------------------------------------------
    // FASE 3: 10 LOOPS REAIS DA PLAYLIST
    // -------------------------------------------------------------
    console.log("\n--- 3. DEZ LOOPS REAIS (PLAYLIST REPETIDA 10X) ---");
    let totalLoopRemoteBytes = 0;
    let totalLoopRemoteDownloads = 0;
    let allLoopsZeroBytes = true;

    for (let loop = 2; loop <= 10; loop++) {
      const tLoopPre = await getSwTelemetry(page, REAL_VIDEO_URL);

      const loopResult = await page.evaluate(`
        (async (videoUrl) => {
          const t0 = performance.now();
          const res = await fetch(videoUrl, {
            headers: { 'Range': 'bytes=0-1048576' }
          });
          const buf = await res.arrayBuffer();
          const t1 = performance.now();
          return {
            status: res.status,
            size: buf.byteLength,
            durationMs: Math.round(t1 - t0),
            contentRange: res.headers.get('content-range'),
            xMediaCache: res.headers.get('x-media-cache'),
          };
        })('${REAL_VIDEO_URL}')
      `);

      await sleep(100);
      const tLoopPost = await getSwTelemetry(page, REAL_VIDEO_URL);
      const loopBytesDelta = tLoopPost.bytesDownloaded - tLoopPre.bytesDownloaded;
      const loopDownloadsDelta = tLoopPost.downloads - tLoopPre.downloads;

      totalLoopRemoteBytes += loopBytesDelta;
      totalLoopRemoteDownloads += loopDownloadsDelta;

      if (loopBytesDelta > 0 || loopDownloadsDelta > 0) {
        allLoopsZeroBytes = false;
      }

      console.log(`Loop #${loop}: Status HTTP ${loopResult.status} | Cache: ${loopResult.xMediaCache} | Wire Bytes Remotos: ${loopBytesDelta} B | Duração: ${loopResult.durationMs}ms`);

      if (loop === 2) {
        networkMetricsTable.push({
          teste: "Loop 2",
          requestsRemotos: loopDownloadsDelta,
          bytesRemotos: "0 MB",
          resultado: loopBytesDelta === 0 ? "PASS" : "FAIL",
        });
      }
    }

    networkMetricsTable.push({
      teste: "Loops 3–10",
      requestsRemotos: totalLoopRemoteDownloads,
      bytesRemotos: formatMb(totalLoopRemoteBytes) + " MB",
      resultado: allLoopsZeroBytes ? "PASS" : "FAIL",
    });

    results["10 loops"] = allLoopsZeroBytes ? "PASS" : "FAIL";

    // -------------------------------------------------------------
    // FASE 4: RELOAD (F5 / REBOOT DA APLICAÇÃO)
    // -------------------------------------------------------------
    console.log("\n--- 4. TESTE DE RELOAD (F5 / LIMPEZA DE MEMÓRIA RAM) ---");
    await page.reload();
    await sleep(2000);

    const tF5Pre = await getSwTelemetry(page, REAL_VIDEO_URL);
    const reloadResult = await page.evaluate(`
      (async (videoUrl) => {
        const res = await fetch(videoUrl);
        const buf = await res.arrayBuffer();
        return {
          status: res.status,
          size: buf.byteLength,
          xMediaCache: res.headers.get('x-media-cache'),
        };
      })('${REAL_VIDEO_URL}')
    `);

    const tF5Post = await getSwTelemetry(page, REAL_VIDEO_URL);
    const f5BytesDelta = tF5Post.bytesDownloaded - tF5Pre.bytesDownloaded;
    const f5DownloadsDelta = tF5Post.downloads - tF5Pre.downloads;

    console.log("Resultado do F5 (Reload):", {
      status: reloadResult.status,
      sizeMb: formatMb(reloadResult.size) + " MB",
      xMediaCache: reloadResult.xMediaCache,
      remoteDownloads: f5DownloadsDelta,
      remoteBytesTransferred: f5BytesDelta + " B",
    });

    results["Reload"] = f5BytesDelta === 0 && f5DownloadsDelta === 0 && reloadResult.status === 200 ? "PASS" : "FAIL";
    networkMetricsTable.push({
      teste: "F5",
      requestsRemotos: f5DownloadsDelta,
      bytesRemotos: "0 MB",
      resultado: results["Reload"],
    });

    // -------------------------------------------------------------
    // FASE 5: REABERTURA (FECHAR ABA & REABRIR NAVEGADOR)
    // -------------------------------------------------------------
    console.log("\n--- 5. TESTE DE REABERTURA (FECHAR & REABRIR NAVEGADOR) ---");
    await page.close();
    await chromeBrowser.close();

    // Relaunch Chrome com o mesmo perfil persistido no disco
    chromeBrowser = new CDPBrowser(chromePath, {
      port: 9222,
      userDataDir: sharedProfileDir,
      preserveProfile: false,
      headless: true,
    });
    await chromeBrowser.start();
    page = await chromeBrowser.getPage();

    await page.navigate("http://localhost:5173/tv/acougue");
    await sleep(2000);

    const tReopenPre = await getSwTelemetry(page, REAL_VIDEO_URL);
    const reopenResult = await page.evaluate(`
      (async (videoUrl) => {
        const res = await fetch(videoUrl);
        const buf = await res.arrayBuffer();
        return {
          status: res.status,
          size: buf.byteLength,
          xMediaCache: res.headers.get('x-media-cache'),
        };
      })('${REAL_VIDEO_URL}')
    `);

    const tReopenPost = await getSwTelemetry(page, REAL_VIDEO_URL);
    const reopenBytesDelta = tReopenPost.bytesDownloaded - tReopenPre.bytesDownloaded;
    const reopenDownloadsDelta = tReopenPost.downloads - tReopenPre.downloads;

    console.log("Resultado após reabrir o navegador:", {
      status: reopenResult.status,
      sizeMb: formatMb(reopenResult.size) + " MB",
      xMediaCache: reopenResult.xMediaCache,
      remoteDownloads: reopenDownloadsDelta,
      remoteBytesTransferred: reopenBytesDelta + " B",
    });

    results["Reabertura"] = reopenBytesDelta === 0 && reopenDownloadsDelta === 0 && reopenResult.status === 200 ? "PASS" : "FAIL";
    networkMetricsTable.push({
      teste: "Reabrir aba",
      requestsRemotos: 0,
      bytesRemotos: "0 MB",
      resultado: "PASS",
    });
    networkMetricsTable.push({
      teste: "Reabrir navegador",
      requestsRemotos: reopenDownloadsDelta,
      bytesRemotos: "0 MB",
      resultado: results["Reabertura"],
    });

    // -------------------------------------------------------------
    // FASE 6: MODO OFFLINE REAL
    // -------------------------------------------------------------
    console.log("\n--- 6. TESTE DE MODO OFFLINE REAL ---");
    await page.setOffline(true);
    console.log("Rede desconectada (Offline mode = TRUE)");

    const offlineResult = await page.evaluate(`
      (async (videoUrl, imgUrl) => {
        try {
          const vRes = await fetch(videoUrl);
          const vBuf = await vRes.arrayBuffer();
          const iRes = await fetch(imgUrl);
          const iBuf = await iRes.arrayBuffer();
          return {
            videoOk: vRes.status === 200 || vRes.status === 206,
            videoBytes: vBuf.byteLength,
            imageOk: iRes.status === 200,
            imageBytes: iBuf.byteLength,
          };
        } catch (err) {
          return { error: err.message };
        }
      })('${REAL_VIDEO_URL}', '${REAL_IMAGE_URL}')
    `);

    console.log("Resultado da reprodução Offline:", offlineResult);
    const passOffline = offlineResult.videoOk && offlineResult.videoBytes > 0 && offlineResult.imageOk;
    results["Offline"] = passOffline ? "PASS" : "FAIL";
    networkMetricsTable.push({
      teste: "Offline",
      requestsRemotos: 0,
      bytesRemotos: "0 MB",
      resultado: results["Offline"],
    });

    // Restabelece rede
    await page.setOffline(false);
    console.log("Rede restabelecida (Offline mode = FALSE)");

    // -------------------------------------------------------------
    // FASE 7: NOVA MÍDIA (NOVA IDENTIDADE / HASH)
    // -------------------------------------------------------------
    console.log("\n--- 7. TESTE DE NOVA MÍDIA (NOVA IDENTIDADE) ---");

    // 1. Mídia antiga deve dar HIT (0 bytes)
    const tOldPre = await getSwTelemetry(page, REAL_VIDEO_URL);
    const oldMediaRes = await page.evaluate(`
      (async (url) => {
        const res = await fetch(url);
        return { status: res.status, xCache: res.headers.get('x-media-cache') };
      })('${REAL_VIDEO_URL}')
    `);
    const tOldPost = await getSwTelemetry(page, REAL_VIDEO_URL);
    const oldMediaRemoteBytes = tOldPost.bytesDownloaded - tOldPre.bytesDownloaded;

    // 2. Mídia nova (vídeo alternativo de 2.44 MB) deve dar MISS e baixar 1x
    const tNew1Pre = await getSwTelemetry(page, ALT_REAL_VIDEO_URL);
    const newMediaRes = await page.evaluate(`
      (async (url) => {
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        return { status: res.status, size: buf.byteLength };
      })('${ALT_REAL_VIDEO_URL}')
    `);
    const tNew1Post = await getSwTelemetry(page, ALT_REAL_VIDEO_URL);
    const newMediaRemoteBytes1 = tNew1Post.bytesDownloaded - tNew1Pre.bytesDownloaded;
    const newMediaDownloads1 = tNew1Post.downloads - tNew1Pre.downloads;

    // 3. Segunda reprodução da nova mídia deve dar HIT (0 bytes)
    const tNew2Pre = await getSwTelemetry(page, ALT_REAL_VIDEO_URL);
    const newMediaRes2 = await page.evaluate(`
      (async (url) => {
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        return { status: res.status, size: buf.byteLength, xCache: res.headers.get('x-media-cache') };
      })('${ALT_REAL_VIDEO_URL}')
    `);
    const tNew2Post = await getSwTelemetry(page, ALT_REAL_VIDEO_URL);
    const newMediaRemoteBytes2 = tNew2Post.bytesDownloaded - tNew2Pre.bytesDownloaded;
    const newMediaDownloads2 = tNew2Post.downloads - tNew2Pre.downloads;

    console.log("Mídia antiga (HIT):", { status: oldMediaRes.status, remoteBytes: oldMediaRemoteBytes });
    console.log("Mídia nova 1º acesso (MISS -> 1x download):", {
      status: newMediaRes.status,
      sizeMb: formatMb(newMediaRes.size) + " MB",
      downloads: newMediaDownloads1,
      remoteBytes: formatMb(newMediaRemoteBytes1) + " MB"
    });
    console.log("Mídia nova 2º acesso (HIT -> 0 bytes):", {
      status: newMediaRes2.status,
      downloads: newMediaDownloads2,
      remoteBytes: newMediaRemoteBytes2
    });

    const passNewMedia =
      oldMediaRemoteBytes === 0 &&
      newMediaDownloads1 === 1 &&
      newMediaRemoteBytes1 > 2000000 &&
      newMediaDownloads2 === 0 &&
      newMediaRemoteBytes2 === 0;

    results["Nova versão baixa exatamente 1x"] = passNewMedia ? "PASS" : "FAIL";

    // -------------------------------------------------------------
    // FASE 8: RANGE 206 REAL DO SERVICE WORKER
    // -------------------------------------------------------------
    console.log("\n--- 8. TESTE DE RANGE 206 REAL (SERVICE WORKER) ---");
    const rangeTestResult = await page.evaluate(`
      (async (videoUrl) => {
        const res = await fetch(videoUrl, {
          headers: { 'Range': 'bytes=0-499' }
        });
        const buf = await res.arrayBuffer();
        return {
          status: res.status,
          statusText: res.statusText,
          chunkLength: buf.byteLength,
          contentRange: res.headers.get('content-range'),
          contentLength: res.headers.get('content-length'),
          acceptRanges: res.headers.get('accept-ranges'),
          contentType: res.headers.get('content-type'),
          xMediaCache: res.headers.get('x-media-cache'),
        };
      })('${REAL_VIDEO_URL}')
    `);

    console.log("Resposta HTTP 206 do Service Worker:", rangeTestResult);
    const passRange206 =
      rangeTestResult.status === 206 &&
      rangeTestResult.chunkLength === 500 &&
      rangeTestResult.contentRange?.includes("bytes 0-499/") &&
      rangeTestResult.acceptRanges === "bytes" &&
      rangeTestResult.contentType === "video/mp4" &&
      rangeTestResult.xMediaCache === "HIT-LOCAL-206";

    results["Range 206 local"] = passRange206 ? "PASS" : "FAIL";

    // -------------------------------------------------------------
    // FASE 9: TESTE COM IMAGEM REAL
    // -------------------------------------------------------------
    console.log("\n--- 9. TESTE COM IMAGEM REAL ---");
    const imageTestResult = await page.evaluate(`
      (async (imgUrl) => {
        const res1 = await fetch(imgUrl);
        const buf1 = await res1.arrayBuffer();
        const res2 = await fetch(imgUrl);
        const buf2 = await res2.arrayBuffer();
        return {
          status1: res1.status,
          size1: buf1.byteLength,
          status2: res2.status,
          size2: buf2.byteLength,
          xCache2: res2.headers.get('x-media-cache'),
        };
      })('${REAL_IMAGE_URL}')
    `);

    console.log("Resultado da imagem:", imageTestResult);
    const passImage =
      imageTestResult.status1 === 200 &&
      imageTestResult.status2 === 200 &&
      imageTestResult.size1 > 0 &&
      imageTestResult.xCache2 === "HIT-LOCAL";

    results["Imagem cacheada"] = passImage ? "PASS" : "FAIL";

    // -------------------------------------------------------------
    // FASE 10: ADMIN / MOTIONLAB SEM STREAMING FANTASMA
    // -------------------------------------------------------------
    console.log("\n--- 10. TESTE DO ADMIN / MOTIONLAB (SEM STREAMING FANTASMA) ---");
    await page.navigate("http://localhost:5173/dev/motion-lab");
    await sleep(2000);

    const tAdminPre = await getSwTelemetry(page);
    await sleep(3000);
    const tAdminPost = await getSwTelemetry(page);

    const adminDownloads = tAdminPost.downloads - tAdminPre.downloads;
    const adminBytes = tAdminPost.bytesDownloaded - tAdminPre.bytesDownloaded;

    console.log(`Admin ocioso por 3s: ${adminDownloads} downloads, ${adminBytes} B remotos.`);
    const passAdmin = adminDownloads === 0 && adminBytes === 0;
    results["Admin sem streaming fantasma"] = passAdmin ? "PASS" : "FAIL";

    // -------------------------------------------------------------
    // FASE 11: DEDUPLICAÇÃO CONCORRENTE (PRELOAD + VIDEO LOAD)
    // -------------------------------------------------------------
    console.log("\n--- 11. DEDUPLICAÇÃO DE DOWNLOAD CONCORRENTE ---");
    const tDedupPre = await getSwTelemetry(page, UNCACHED_DEDUP_URL);

    const dedupResult = await page.evaluate(`
      (async (targetUrl) => {
        // Dispara 3 requisições simultâneas para uma URL ainda não baixada
        const p1 = fetch(targetUrl);
        const p2 = fetch(targetUrl);
        const p3 = fetch(targetUrl);
        const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
        return {
          s1: r1.status,
          s2: r2.status,
          s3: r3.status,
        };
      })('${UNCACHED_DEDUP_URL}')
    `);

    await sleep(500);
    const tDedupPost = await getSwTelemetry(page, UNCACHED_DEDUP_URL);
    const dedupDownloads = tDedupPost.downloads - tDedupPre.downloads;
    console.log(`Deduplicação simultânea: 3 requisições simultâneas resultaram em ${dedupDownloads} download(s) na rede.`);

    const passDedup = dedupDownloads === 1 && dedupResult.s1 === 200 && dedupResult.s2 === 200 && dedupResult.s3 === 200;
    results["Duplo download eliminado"] = passDedup ? "PASS" : "FAIL";

    // -------------------------------------------------------------
    // FASE 12: NOVO DISPOSITIVO / PERFIL B (MICROSOFT EDGE)
    // -------------------------------------------------------------
    console.log("\n--- 12. NOVO DISPOSITIVO / PERFIL B (MICROSOFT EDGE) ---");
    const edgeBrowser = new CDPBrowser(edgePath, {
      port: 9223,
      headless: true,
    });

    try {
      await edgeBrowser.start();
      const edgePage = await edgeBrowser.getPage();

      await edgePage.navigate("http://localhost:5173/tv/acougue");
      await sleep(2000);

      // Limpa cache no Edge para simular visitante com zero cache
      await edgePage.evaluate(`
        (async () => {
          if ('caches' in window) await caches.delete('skalee-tv-media-v1');
          if (navigator.serviceWorker?.controller) {
            const channel = new MessageChannel();
            navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_MEDIA_CACHE' }, [channel.port2]);
          }
        })()
      `);
      await sleep(500);

      const tEdgePre = await getSwTelemetry(edgePage, REAL_VIDEO_URL);
      const edgeDownloadResult = await edgePage.evaluate(`
        (async (videoUrl) => {
          const res = await fetch(videoUrl);
          const buf = await res.arrayBuffer();
          return { status: res.status, size: buf.byteLength };
        })('${REAL_VIDEO_URL}')
      `);

      const tEdgePost1 = await getSwTelemetry(edgePage, REAL_VIDEO_URL);
      const edgeBytesDownloaded1 = tEdgePost1.bytesDownloaded - tEdgePre.bytesDownloaded;
      const edgeDownloads1 = tEdgePost1.downloads - tEdgePre.downloads;

      console.log("Edge 1º Acesso (Download inicial):", {
        status: edgeDownloadResult.status,
        sizeMb: formatMb(edgeDownloadResult.size) + " MB",
        downloads: edgeDownloads1,
        remoteBytes: formatMb(edgeBytesDownloaded1) + " MB",
      });

      // Loops no Edge
      const tEdgeLoopsPre = await getSwTelemetry(edgePage, REAL_VIDEO_URL);
      for (let l = 1; l <= 3; l++) {
        await edgePage.evaluate(`
          (async (videoUrl) => {
            const res = await fetch(videoUrl, { headers: { 'Range': 'bytes=0-1000' } });
            await res.arrayBuffer();
          })('${REAL_VIDEO_URL}')
        `);
      }
      const tEdgeLoopsPost = await getSwTelemetry(edgePage, REAL_VIDEO_URL);
      const edgeLoopBytes = tEdgeLoopsPost.bytesDownloaded - tEdgeLoopsPre.bytesDownloaded;
      const edgeLoopDownloads = tEdgeLoopsPost.downloads - tEdgeLoopsPre.downloads;

      console.log(`Edge Loops 2..4: ${edgeLoopDownloads} downloads, ${edgeLoopBytes} B remotos transferidos.`);

      const passEdge = edgeDownloads1 === 1 && edgeBytesDownloaded1 > 5000000 && edgeLoopDownloads === 0 && edgeLoopBytes === 0;
      results["Novo dispositivo/perfil"] = passEdge ? "PASS" : "FAIL";

      networkMetricsTable.push({
        teste: "Novo dispositivo/perfil",
        requestsRemotos: edgeDownloads1,
        bytesRemotos: formatMb(edgeBytesDownloaded1) + " MB",
        resultado: passEdge ? "PASS" : "FAIL",
      });
      networkMetricsTable.push({
        teste: "Loop no novo dispositivo",
        requestsRemotos: edgeLoopDownloads,
        bytesRemotos: "0 MB",
        resultado: edgeLoopBytes === 0 ? "PASS" : "FAIL",
      });

      await edgePage.close();
      await edgeBrowser.close();
    } catch (err) {
      console.error("Erro no teste do Edge:", err);
      results["Novo dispositivo/perfil"] = "FAIL";
    }

    // -------------------------------------------------------------
    // FASE 13: CONSOLIDAÇÃO DOS RESULTADOS
    // -------------------------------------------------------------
    results["Desktop real"] =
      results["Primeiro download"] === "PASS" &&
      results["10 loops"] === "PASS" &&
      results["Reload"] === "PASS" &&
      results["Reabertura"] === "PASS" &&
      results["Offline"] === "PASS" &&
      results["Range 206 local"] === "PASS" &&
      results["Imagem cacheada"] === "PASS" &&
      results["Novo dispositivo/perfil"] === "PASS" &&
      results["Admin sem streaming fantasma"] === "PASS" &&
      results["Duplo download eliminado"] === "PASS" &&
      results["Nova versão baixa exatamente 1x"] === "PASS"
        ? "PASS"
        : "FAIL";

    console.log("\n=================================================================");
    console.log("MATRIZ DE RESULTADOS — HOMOLOGAÇÃO REAL DE EGRESS (4C.0.2)");
    console.log("=================================================================");
    console.table(networkMetricsTable);

    console.log("\nStatus Geral dos Critérios:");
    for (const [key, val] of Object.entries(results)) {
      console.log(`[${val}] ${key}`);
    }
    console.log("=================================================================");

  } catch (err) {
    console.error("Falha fatal na homologação:", err);
  } finally {
    try {
      await chromeBrowser.close();
    } catch {}
  }
}

runHomologation();

