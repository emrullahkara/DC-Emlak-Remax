import { describe, expect, it } from "vitest";
import { isInlineUrl } from "@/components/portfoy/media";
import { friendlyDbError } from "@/data/store";
import { safeHttpUrl } from "@/lib/format";

describe("güvenlik yardımcıları", () => {
  it("yalnızca http(s) bağlantılarına izin verir", () => {
    expect(safeHttpUrl("https://www.sahibinden.com/ilan/1")).toBe("https://www.sahibinden.com/ilan/1");
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,<script>")).toBeNull();
    expect(safeHttpUrl("  ")).toBeNull();
    expect(safeHttpUrl(null)).toBeNull();
  });

  it("dış adresleri satır içi görsel saymaz (takip pikseli)", () => {
    expect(isInlineUrl("data:image/jpeg;base64,AAAA")).toBe(true);
    expect(isInlineUrl("https://kotu.example/pixel.gif")).toBe(false);
    expect(isInlineUrl("data:image/svg+xml;base64,AAAA")).toBe(false);
    expect(isInlineUrl("blob:https://x/1")).toBe(false);
  });

  it("veritabanı iç ayrıntılarını kullanıcıya göstermez", () => {
    expect(friendlyDbError({ code: "42501", message: 'new row violates row-level security policy for table "person"' }).message).toBe("Bu işlem için yetkiniz yok.");
    expect(friendlyDbError({ code: "23505", message: 'duplicate key value violates unique constraint "x_pkey"' }).message).toBe("Bu kayıt zaten var.");
    expect(friendlyDbError({ code: "42501", message: "İmzalanmış belge değiştirilemez" }).message).toBe("İmzalanmış belge değiştirilemez");
    expect(friendlyDbError({ code: "XX000", message: 'relation "secret_table" does not exist' }).message).not.toMatch(/secret_table/);
  });
});
