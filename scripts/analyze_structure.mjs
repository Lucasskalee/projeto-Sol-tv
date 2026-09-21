import fs from "node:fs";
import path from "node:path";

function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (["node_modules", ".git", "dist", ".gemini", ".kilo", ".vscode"].includes(file)) continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getFiles(fullPath, fileList);
    } else {
      const rel = path.relative(".", fullPath).split(path.sep).join("/");
      let lines = 0;
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        lines = content.split("\n").length;
      } catch {}
      fileList.push({ path: rel, size: stat.size, lines });
    }
  }
  return fileList;
}

const all = getFiles(".").sort((a, b) => a.path.localeCompare(b.path));
console.log("TOTAL_FILES:", all.length);

const categories = {
  ATIVO: [],
  TESTE: [],
  HOMOLOGAÇÃO: [],
  TEMPORÁRIO: [],
  LEGADO: [],
  POSSIVELMENTE_NÃO_UTILIZADO: [],
  NÃO_DETERMINADO: [],
};

const domains = {
  "Player da TV": [],
  "Admin": [],
  "MotionLab / MotionStudio": [],
  "Ofertas / Produtos / Composições": [],
  "Programação / Agendamento": [],
  "Media Cache Engine": [],
  "Supabase": [],
  "Banco / Migrations": [],
  "Segurança / Autenticação": [],
  "Testes Automatizados": [],
  "Scripts de Homologação / Diagnóstico": [],
  "Configuração / Build / Imagens": [],
};

for (const item of all) {
  const file = item.path;

  // 1. Classificação por Status
  if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) {
    categories.TESTE.push(file);
    domains["Testes Automatizados"].push(file);
    continue;
  }

  if (file.startsWith("scripts/test_") || file === "scripts/analyze_structure.mjs") {
    categories.TEMPORÁRIO.push(file);
    domains["Scripts de Homologação / Diagnóstico"].push(file);
    continue;
  }

  if (file === "scripts/run_egress_homologation.mjs" || file === "src/services/homologation_4b3.ts") {
    categories.HOMOLOGAÇÃO.push(file);
    domains["Scripts de Homologação / Diagnóstico"].push(file);
    continue;
  }

  if (file === "scripts/cdp_client.mjs" || file === "scripts/inspect_storage.test.ts") {
    categories.ATIVO.push(file);
    domains["Scripts de Homologação / Diagnóstico"].push(file);
    continue;
  }

  if (file.startsWith("database/")) {
    categories.ATIVO.push(file);
    domains["Banco / Migrations"].push(file);
    continue;
  }

  if (file.endsWith(".png") && !file.includes("/")) {
    categories.POSSIVELMENTE_NÃO_UTILIZADO.push(file);
    domains["Configuração / Build / Imagens"].push(file);
    continue;
  }

  if (file === "src/components/FireSparks.tsx") {
    categories.LEGADO.push(file);
    domains["Player da TV"].push(file);
    continue;
  }

  if (file === "src/pages/ThemePreview.tsx") {
    categories.POSSIVELMENTE_NÃO_UTILIZADO.push(file);
    domains["MotionLab / MotionStudio"].push(file);
    continue;
  }

  // Demais arquivos ativos
  categories.ATIVO.push(file);

  // 2. Classificação por Domínio
  if (file.includes("mediaCache") || file.includes("sw-media") || file.includes("mediaServiceWorker")) {
    domains["Media Cache Engine"].push(file);
  } else if (file.includes("program") || file.includes("programs")) {
    domains["Programação / Agendamento"].push(file);
  } else if (
    file.includes("motion") ||
    file.includes("Motion") ||
    file.includes("theme") ||
    file.includes("Theme") ||
    file.includes("transitions")
  ) {
    domains["MotionLab / MotionStudio"].push(file);
  } else if (
    file.includes("TvPlayer") ||
    file.includes("TvViewport") ||
    file.includes("Slide") ||
    file === "src/pages/Tv.tsx" ||
    file.includes("BlackFriday") ||
    file.includes("effects")
  ) {
    domains["Player da TV"].push(file);
  } else if (
    file.includes("compositions") ||
    file.includes("folders") ||
    file.includes("layouts") ||
    file.includes("Offer") ||
    file === "src/data.ts" ||
    file.includes("removeWhiteBackground")
  ) {
    domains["Ofertas / Produtos / Composições"].push(file);
  } else if (file.includes("Admin") || file.includes("MediaManager") || file.includes("MediaUpload")) {
    domains["Admin"].push(file);
  } else if (file.includes("Login") || file.includes("ProtectedRoute")) {
    domains["Segurança / Autenticação"].push(file);
  } else if (file.includes("supabase")) {
    domains["Supabase"].push(file);
  } else {
    domains["Configuração / Build / Imagens"].push(file);
  }
}

console.log("\n==============================");
console.log("QUANTIDADE POR CATEGORIA");
console.log("==============================");
for (const [k, v] of Object.entries(categories)) {
  console.log(`${k.padEnd(30)}: ${v.length}`);
}

console.log("\n==============================");
console.log("QUANTIDADE POR DOMÍNIO");
console.log("==============================");
for (const [k, v] of Object.entries(domains)) {
  console.log(`${k.padEnd(40)}: ${v.length}`);
}

