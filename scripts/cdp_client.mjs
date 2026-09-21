import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export class CDPPage {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 1;
    this.pending = new Map();
    this.events = new Map();
    this.networkRequests = new Map();
    this.networkLogs = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data.toString());
          if (data.id && this.pending.has(data.id)) {
            const { resolve, reject } = this.pending.get(data.id);
            this.pending.delete(data.id);
            if (data.error) {
              reject(new Error(data.error.message || JSON.stringify(data.error)));
            } else {
              resolve(data.result);
            }
          } else if (data.method) {
            this._handleEvent(data.method, data.params);
          }
        } catch (err) {
          console.error("Error parsing CDP message:", err);
        }
      };
    });
  }

  _handleEvent(method, params) {
    if (method === "Network.requestWillBeSent") {
      const entry = {
        requestId: params.requestId,
        url: params.request.url,
        method: params.request.method,
        headers: params.request.headers,
        hasRange: Boolean(params.request.headers?.Range || params.request.headers?.range),
        rangeHeader: params.request.headers?.Range || params.request.headers?.range || null,
        timestamp: params.timestamp,
        status: null,
        responseHeaders: null,
        fromServiceWorker: false,
        fromDiskCache: false,
        encodedDataLength: 0,
        resourceSize: 0,
        mimeType: null,
        finished: false,
      };
      this.networkRequests.set(params.requestId, entry);
      this.networkLogs.push(entry);
    } else if (method === "Network.responseReceived") {
      const entry = this.networkRequests.get(params.requestId);
      if (entry) {
        entry.status = params.response.status;
        entry.responseHeaders = params.response.headers;
        entry.fromServiceWorker = Boolean(params.response.fromServiceWorker);
        entry.fromDiskCache = Boolean(params.response.fromDiskCache);
        entry.mimeType = params.response.mimeType;
        entry.serviceWorkerResponseSource = params.response.serviceWorkerResponseSource;
        if (params.response.encodedDataLength !== undefined) {
          entry.encodedDataLength = params.response.encodedDataLength;
        }
      }
    } else if (method === "Network.dataReceived") {
      const entry = this.networkRequests.get(params.requestId);
      if (entry) {
        entry.encodedDataLength += params.encodedDataLength || 0;
        entry.resourceSize += params.dataLength || 0;
      }
    } else if (method === "Network.loadingFinished") {
      const entry = this.networkRequests.get(params.requestId);
      if (entry) {
        entry.finished = true;
        if (params.encodedDataLength !== undefined && params.encodedDataLength > 0) {
          entry.encodedDataLength = params.encodedDataLength;
        }
      }
    }

    const listeners = this.events.get(method) || [];
    for (const l of listeners) {
      try {
        l(params);
      } catch (e) {
        console.error("Event listener error:", e);
      }
    }
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.msgId++;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, callback) {
    if (!this.events.has(method)) {
      this.events.set(method, []);
    }
    this.events.get(method).push(callback);
  }

  async enableNetwork() {
    await this.send("Network.enable", {
      maxTotalBufferSize: 100000000,
      maxResourceBufferSize: 50000000,
    });
  }

  async enablePage() {
    await this.send("Page.enable");
  }

  async enableRuntime() {
    await this.send("Runtime.enable");
  }

  async navigate(url) {
    await this.send("Page.navigate", { url });
    // Wait for load event or settle
    await new Promise((r) => setTimeout(r, 1500));
  }

  async reload(ignoreCache = false) {
    await this.send("Page.reload", { ignoreCache });
    await new Promise((r) => setTimeout(r, 1500));
  }

  async setOffline(offline) {
    await this.send("Network.emulateNetworkConditions", {
      offline,
      latency: 0,
      downloadThroughput: offline ? 0 : -1,
      uploadThroughput: offline ? 0 : -1,
    });
  }

  async evaluate(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.text || res.exceptionDetails.exception?.description || "Eval error");
    }
    return res.result?.value;
  }

  resetNetworkTracker() {
    this.networkRequests.clear();
    this.networkLogs = [];
  }

  getMediaNetworkLogs(filterSubstring = "/storage/v1/object/public/tv-media/") {
    return this.networkLogs.filter((log) => log.url.includes(filterSubstring));
  }

  getMediaRemoteBytesTransferred(filterSubstring = "/storage/v1/object/public/tv-media/") {
    const mediaLogs = this.getMediaNetworkLogs(filterSubstring);
    return mediaLogs
      .filter((l) => !l.fromServiceWorker && !l.fromDiskCache && l.status >= 200 && l.status < 400)
      .reduce((sum, l) => sum + (l.encodedDataLength || 0), 0);
  }

  async close() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
    }
  }
}

export class CDPBrowser {
  constructor(browserPath, options = {}) {
    this.browserPath = browserPath;
    this.port = options.port || 9222;
    this.userDataDir = options.userDataDir || path.join(os.tmpdir(), `cdp_profile_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
    this.headless = options.headless !== undefined ? options.headless : true;
    this.preserveProfile = options.preserveProfile || false;
    this.proc = null;
  }

  async start() {
    const args = [
      `--remote-debugging-port=${this.port}`,
      `--user-data-dir=${this.userDataDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-networking",
      "--disable-default-apps",
      "--disable-sync",
      "--disable-translate",
      this.headless ? "--headless=new" : "--window-size=1280,720",
      "about:blank",
    ];

    this.proc = spawn(this.browserPath, args, { stdio: "ignore" });

    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${this.port}/json/version`);
        if (res.ok) {
          return;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 200));
    }

    throw new Error(`Failed to start browser on port ${this.port}`);
  }

  async getPage() {
    const res = await fetch(`http://127.0.0.1:${this.port}/json/list`);
    const targets = await res.json();
    const pageTarget = targets.find((t) => t.type === "page");
    if (!pageTarget) {
      throw new Error("No page target found");
    }
    const page = new CDPPage(pageTarget.webSocketDebuggerUrl);
    await page.connect();
    await page.enableNetwork();
    await page.enablePage();
    await page.enableRuntime();
    return page;
  }

  async close() {
    if (this.proc) {
      try {
        this.proc.kill("SIGKILL");
      } catch {}
    }
    await new Promise((r) => setTimeout(r, 500));
    if (!this.preserveProfile) {
      try {
        fs.rmSync(this.userDataDir, { recursive: true, force: true });
      } catch {}
    }
  }
}

