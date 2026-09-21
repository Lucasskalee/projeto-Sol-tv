import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { themeRegistry } from "../../../themes/registry";
import { normalTheme } from "../../../themes/normal";
import { blackFridayTheme } from "../../../themes/blackFriday";
import {
  ThemeStatusChip,
  ThemePaletteSwatches,
  ThemePreview16x9,
  ThemeLiveHeroCard,
  ThemeCard,
  ThemeApplyConfirmationModal,
  ThemePreviewModal,
} from "./index";
import { AdminThemesTab } from "../sections/AdminThemesTab";

describe("ETAPA 6.1 — Componentes de Temas & themeRegistry", () => {
  it("themeRegistry contém EXATAMENTE os 2 temas reais e nenhum outro", () => {
    const keys = Object.keys(themeRegistry);
    expect(keys).toEqual(["normal", "black-friday"]);
    expect(keys).not.toContain("sunburst");
    expect(keys).not.toContain("sol-sunburst");
    expect(keys).not.toContain("clean-direto");
    expect(keys).not.toContain("motion-suave");
  });

  it("ThemeStatusChip renderiza EM USO quando ativo e DISPONÍVEL quando inativo", () => {
    const activeHtml = renderToStaticMarkup(<ThemeStatusChip isActive={true} />);
    expect(activeHtml).toContain("EM USO");

    const inactiveHtml = renderToStaticMarkup(<ThemeStatusChip isActive={false} />);
    expect(inactiveHtml).toContain("DISPONÍVEL");
  });

  it("ThemePaletteSwatches renderiza as amostras baseadas nos ThemeTokens reais", () => {
    const html = renderToStaticMarkup(<ThemePaletteSwatches theme={normalTheme} />);
    expect(html).toContain("Paleta Visual");
    expect(html).toContain("Fundo");
    expect(html).toContain("Card");
    expect(html).toContain("Texto");
    expect(html).toContain("Preço");
    expect(html).toContain("Destaque");
    expect(html).toContain("Badge");
    expect(html).toContain(normalTheme.tokens.colors.background);
    expect(html).toContain(normalTheme.tokens.priceStyle.color);
  });

  it("ThemePreview16x9 renderiza sem elementos de vídeo ou erros no DOM", () => {
    const html = renderToStaticMarkup(<ThemePreview16x9 theme={normalTheme} />);
    expect(html).not.toContain("<video");
    expect(html).toContain("SUPERMERCADO SOL");
    expect(html).toContain("CONTRA FILÉ");
    expect(html).toContain("39,90");
    expect(html).toContain("OFERTA");
    expect(html).toContain("16 / 9");
  });

  it("ThemePreview16x9 renderiza estilo Black Friday corretamente", () => {
    const html = renderToStaticMarkup(<ThemePreview16x9 theme={blackFridayTheme} />);
    expect(html).not.toContain("<video");
    expect(html).toContain("BLACK FRIDAY");
    expect(html).toContain("29,90");
    expect(html).toContain("16 / 9");
  });

  it("ThemeLiveHeroCard renderiza o tema ativo do setor e link para Motion Studio", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ThemeLiveHeroCard
          activeTheme={normalTheme}
          sectorLabel="Açougue"
          onOpenPreviewModal={() => {}}
        />
      </MemoryRouter>
    );

    expect(html).toContain("Tema Ativo no Setor");
    expect(html).toContain("Sol Premium (Tema Padrão)");
    expect(html).toContain("Açougue");
    expect(html).toContain("Personalizar no Motion Studio");
    expect(html).toContain("/studio/motion");
    expect(html).toContain("EM USO");
  });

  it("ThemeCard exibe 'Tema em Exibição' para ativo e 'Usar este Tema' para inativo", () => {
    const activeHtml = renderToStaticMarkup(
      <MemoryRouter>
        <ThemeCard
          theme={normalTheme}
          isActive={true}
          onOpenPreview={() => {}}
          onRequestApply={() => {}}
        />
      </MemoryRouter>
    );

    expect(activeHtml).toContain("Tema em Exibição");

    const inactiveHtml = renderToStaticMarkup(
      <MemoryRouter>
        <ThemeCard
          theme={blackFridayTheme}
          isActive={false}
          onOpenPreview={() => {}}
          onRequestApply={() => {}}
        />
      </MemoryRouter>
    );

    expect(inactiveHtml).toContain("Usar este Tema");
    expect(inactiveHtml).toContain("DISPONÍVEL");
    expect(inactiveHtml).toContain("/studio/motion");
  });

  it("ThemeApplyConfirmationModal renderiza mensagem de confirmação do setor", () => {
    const html = renderToStaticMarkup(
      <ThemeApplyConfirmationModal
        theme={blackFridayTheme}
        sectorLabel="Açougue"
        onConfirm={() => {}}
        onClose={() => {}}
      />
    );

    expect(html).toContain("Aplicar Black Friday?");
    expect(html).toContain("Açougue");
    expect(html).toContain("Cancelar");
    expect(html).toContain("Aplicar Tema");
  });

  it("ThemePreviewModal renderiza especificações completas de tokens", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ThemePreviewModal
          theme={normalTheme}
          isActive={true}
          sectorLabel="Açougue"
          onSelectTheme={() => {}}
          onClose={() => {}}
        />
      </MemoryRouter>
    );

    expect(html).toContain("Sol Premium (Tema Padrão)");
    expect(html).toContain("Tipografia");
    expect(html).toContain("Cartão / Card");
    expect(html).toContain("Badge &amp; Preço");
    expect(html).toContain("/studio/motion");
  });

  it("AdminThemesTab integra Header, Hero, Grid de Temas Disponíveis e Rodapé Informativo", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AdminThemesTab
          currentSectorLabel="Açougue"
          tvThemeSlug="normal"
          onSelectTheme={() => {}}
        />
      </MemoryRouter>
    );

    // Header
    expect(html).toContain("Temas Visuais");
    expect(html).toContain("2 TEMAS");
    expect(html).toContain("Abrir Motion Studio");

    // Hero
    expect(html).toContain("Tema Ativo no Setor");
    expect(html).toContain("Sol Premium (Tema Padrão)");
    expect(html).toContain("Açougue");

    // Grid shows both themes
    expect(html).toContain("Temas Disponíveis");
    expect(html).toContain("Black Friday");
    expect(html).toContain("Sol Premium");

    // Zero video tags
    expect(html).not.toContain("<video");
  });
});

