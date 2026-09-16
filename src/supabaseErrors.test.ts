import { describe, expect, it } from "vitest";
import { getErrorMessage, SkaleeDatabaseError } from "./supabase";

describe("getErrorMessage and SkaleeDatabaseError", () => {
  it("formats PostgREST error with code, message, details and hint", () => {
    const error = {
      code: "23503",
      message: 'insert or update on table "sol_tv_composition_items" violates foreign key constraint',
      details: 'Key (offer_id)=(123) is not present in table "sol_tv_offers".',
      hint: "Check that the offer exists before adding.",
    };

    const formatted = getErrorMessage(error, "sol_tv_composition_items INSERT");
    expect(formatted).toContain("Operação: sol_tv_composition_items INSERT");
    expect(formatted).toContain("Código: 23503");
    expect(formatted).toContain('Mensagem: insert or update on table "sol_tv_composition_items" violates foreign key constraint');
    expect(formatted).toContain('Detalhes: Key (offer_id)=(123) is not present in table "sol_tv_offers".');
    expect(formatted).toContain("Hint: Check that the offer exists before adding.");
  });

  it("formats RLS error with code and message", () => {
    const error = {
      code: "42501",
      message: 'new row violates row-level security policy for table "sol_tv_compositions"',
    };

    const formatted = getErrorMessage(error);
    expect(formatted).toContain("Código: 42501");
    expect(formatted).toContain('Mensagem: new row violates row-level security policy for table "sol_tv_compositions"');
  });

  it("handles standard Error instances", () => {
    const error = new Error("Network timeout");
    expect(getErrorMessage(error)).toBe("Network timeout");
  });

  it("handles SkaleeDatabaseError with nested details", () => {
    const dbErr = new SkaleeDatabaseError("Falha na operação", {
      code: "22P02",
      message: "invalid input syntax for type uuid",
      operation: "sol_tv_compositions INSERT/UPDATE (upsert)",
    });

    const formatted = getErrorMessage(dbErr);
    expect(formatted).toContain("Operação: sol_tv_compositions INSERT/UPDATE (upsert)");
    expect(formatted).toContain("Código: 22P02");
    expect(formatted).toContain("Mensagem: invalid input syntax for type uuid");
  });

  it("handles plain string error", () => {
    expect(getErrorMessage("Conexão recusada")).toBe("Conexão recusada");
  });

  it("handles null / undefined safely", () => {
    expect(getErrorMessage(null)).toBe("Erro desconhecido.");
    expect(getErrorMessage(undefined)).toBe("Erro desconhecido.");
  });
});

