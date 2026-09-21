import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const tempProfile = path.join(os.tmpdir(), "edge_cdp_test_" + Date.now());

const edgeProc = spawn(edgePath, [
  "--remote-debugging-port=9223",
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
    const res = await fetch("http://127.0.0.1:9223/json/version");
    const json = await res.json();
    console.log("CDP Connected successfully:", json.Browser);
    console.log("WebSocket URL:", json.webSocketDebuggerUrl);
  } catch (err) {
    console.error("CDP connection failed:", err);
  } finally {
    edgeProc.kill("SIGKILL");
    await sleep(500);
    try {
      fs.rmSync(tempProfile, { recursive: true, force: true });
    } catch {}
  }
}

test();

