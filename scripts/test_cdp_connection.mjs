import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const tempProfile = path.join(os.tmpdir(), "chrome_cdp_test_" + Date.now());

const chromeProc = spawn(chromePath, [
  "--remote-debugging-port=9222",
  `--user-data-dir=${tempProfile}`,
  "--no-first-run",
  "--no-default-browser-check",
  "--headless=new",
  "about:blank",
]);

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function test() {
  await sleep(1500);
  try {
    const res = await fetch("http://127.0.0.1:9222/json/version");
    const json = await res.json();
    console.log("CDP Connected successfully:", json.Browser);
    console.log("WebSocket URL:", json.webSocketDebuggerUrl);
  } catch (err) {
    console.error("CDP connection failed:", err);
  } finally {
    chromeProc.kill("SIGKILL");
    await sleep(500);
    try {
      fs.rmSync(tempProfile, { recursive: true, force: true });
    } catch {}
  }
}

test();

