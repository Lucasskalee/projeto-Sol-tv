import { CDPBrowser } from "./cdp_client.mjs";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function run() {
  const browser = new CDPBrowser(chromePath, { port: 9222, headless: true });
  try {
    await browser.start();
    console.log("Browser started");

    // Get list of targets
    const res = await fetch("http://127.0.0.1:9222/json/list");
    const targets = await res.json();
    console.log("Targets found:", targets.length);

    const pageTarget = targets.find((t) => t.type === "page");
    console.log("Page target ws:", pageTarget?.webSocketDebuggerUrl);

    // Connect directly to page WebSocket
    const pageWs = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((r) => { pageWs.onopen = r; });
    console.log("Page WS connected");

    let msgId = 1;
    function sendPage(method, params = {}) {
      return new Promise((resolve) => {
        const id = msgId++;
        const handler = (event) => {
          const data = JSON.parse(event.data);
          if (data.id === id) {
            pageWs.removeEventListener("message", handler);
            resolve(data.result);
          }
        };
        pageWs.addEventListener("message", handler);
        pageWs.send(JSON.stringify({ id, method, params }));
      });
    }

    await sendPage("Page.enable");
    await sendPage("Runtime.enable");
    await sendPage("Page.navigate", { url: "http://localhost:5173/tv/acougue" });
    console.log("Navigated to TV");

    await new Promise((r) => setTimeout(r, 2000));
    const title = await sendPage("Runtime.evaluate", { expression: "document.title", returnByValue: true });
    console.log("Page title:", title);

    pageWs.close();
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await browser.close();
  }
}

run();

