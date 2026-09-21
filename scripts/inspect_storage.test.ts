import { createClient } from "@supabase/supabase-js";
import { describe, it } from "vitest";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://rkcmtzxyqdopchnnurwh.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_I354jSKr85t2OGQ9x7N80A__nAI066P";

const supabase = createClient(supabaseUrl, supabaseKey);

describe("Auditoria de Storage & Egress", () => {
  it("lista e analisa todos os objetos no bucket tv-media", async () => {
    console.log("=== INSPECIONANDO BUCKET tv-media ===");
    
    // Lista pastas na raiz
    const { data: rootItems, error: rootError } = await supabase.storage
      .from("tv-media")
      .list("", { limit: 100 });

    if (rootError) {
      console.error("Erro ao listar raiz:", rootError);
      return;
    }

    console.log("Pastas/Arquivos na raiz:", rootItems);

    const allFiles: {
      name: string;
      fullPath: string;
      id?: string;
      updated_at?: string;
      created_at?: string;
      sizeBytes: number;
      sizeMb: number;
      mimeType?: string;
      metadata?: any;
    }[] = [];

    // Função recursiva para varrer pastas
    async function scanFolder(folder: string) {
      const { data, error } = await supabase.storage
        .from("tv-media")
        .list(folder, { limit: 100 });

      if (error) {
        console.error(`Erro ao listar pasta ${folder}:`, error);
        return;
      }

      for (const item of data || []) {
        const itemPath = folder ? `${folder}/${item.name}` : item.name;
        if (item.id === null || (!item.metadata && !item.updated_at)) {
          // É uma subpasta
          await scanFolder(itemPath);
        } else {
          const size = item.metadata?.size || 0;
          allFiles.push({
            name: item.name,
            fullPath: itemPath,
            id: item.id,
            updated_at: item.updated_at,
            created_at: item.created_at,
            sizeBytes: size,
            sizeMb: Number((size / (1024 * 1024)).toFixed(3)),
            mimeType: item.metadata?.mimetype,
            metadata: item.metadata,
          });
        }
      }
    }

    await scanFolder("");

    console.log(`\nTOTAL DE ARQUIVOS ENCONTRADOS: ${allFiles.length}`);
    let totalBytes = 0;
    for (const f of allFiles) {
      totalBytes += f.sizeBytes;
      console.log(`- ${f.fullPath} | ${(f.sizeBytes / (1024 * 1024)).toFixed(2)} MB | MIME: ${f.mimeType || "n/d"} | Updated: ${f.updated_at || "n/d"}`);
      console.log(`  Metadata:`, f.metadata);
    }

    console.log(`\nTAMANHO TOTAL NO STORAGE: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB (${(totalBytes / (1024 * 1024 * 1024)).toFixed(4)} GB)`);

    // Consulta também tabelas de sol_tv_media e sol_tv_offers para ver as URLs usadas
    const { data: mediaRows } = await supabase.from("sol_tv_media").select("*");
    console.log(`\n=== REGISTROS EM sol_tv_media (${mediaRows?.length || 0}) ===`);
    for (const m of mediaRows || []) {
      console.log(`[Media] ID: ${m.id} | Tipo: ${m.type} | Ativo: ${m.active} | Setor: ${m.sector} | URL: ${m.media_url}`);
    }

    const { data: offerRows } = await supabase.from("sol_tv_offers").select("*");
    console.log(`\n=== REGISTROS EM sol_tv_offers (${offerRows?.length || 0}) ===`);
    for (const o of offerRows || []) {
      console.log(`[Offer] ID: ${o.id} | Nome: ${o.name} | Ativo: ${o.active} | Image: ${o.image_url} | Video: ${o.video_url}`);
    }
  }, 30000);
});

