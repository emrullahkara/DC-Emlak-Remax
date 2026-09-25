"use client";

/**
 * Portföy medyası: tarayıcıda küçültme ve depolama.
 *  - Demo modu: küçültülmüş JPEG data: URL olarak `media.storage_path`'e yazılır.
 *  - Supabase modu: Storage `media` kovasına `<office_id>/<portfolio_id>/<uuid>.jpg`
 *    yoluna yüklenir, `storage_path` bu yolu tutar; gösterimde imzalı URL üretilir.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import { newId, type DataStore } from "@/data/store";
import type { Media, MediaType } from "@/data/types";

export const MEDIA_BUCKET = "media";
export const MAX_EDGE = 1280;
export const JPEG_QUALITY = 0.8;

export const MEDIA_TUR_LABEL: Record<MediaType, string> = {
  foto: "Fotoğraf",
  kat_plani: "Kat planı",
  sanal_mobilya: "Sanal mobilya",
  video: "Video",
  tur360: "360° tur",
};

export function isInlineUrl(path: string) {
  return path.startsWith("data:") || path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:");
}

/** Görseli en uzun kenar 1280 px olacak şekilde küçültüp JPEG'e çevirir */
export async function downscaleImage(file: File, maxEdge = MAX_EDGE, quality = JPEG_QUALITY): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name}: yalnızca görsel dosyaları yüklenebilir`);
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Tarayıcı görsel işlemeyi desteklemiyor");
  // Saydam PNG'ler siyah olmasın
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap.source, 0, 0, width, height);
  bitmap.close?.();
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Görsel dönüştürülemedi"))), "image/jpeg", quality));
  return { blob, dataUrl, width, height };
}

async function loadBitmap(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close?: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const b = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: b, width: b.width, height: b.height, close: () => b.close() };
    } catch {
      // HEIC vb. desteklenmiyorsa <img> ile dene
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight };
  } catch {
    throw new Error(`${file.name}: görsel okunamadı (desteklenmeyen biçim)`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** LocalStore sessizce kaydedemediyse (kota) satır tarayıcı deposunda yoktur */
function persistedInLocalStorage(id: string): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && localStorage.getItem(k)?.includes(id)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function uploadMedia(input: {
  store: DataStore;
  supabase: SupabaseClient | null;
  officeId: string;
  portfolioId: string;
  file: File;
  tur: MediaType;
  sira: number;
}): Promise<Media> {
  const { store, supabase, officeId, portfolioId, file, tur, sira } = input;
  const img = await downscaleImage(file);
  const temsili = tur === "sanal_mobilya";
  if (store.mode === "supabase" && supabase) {
    const path = `${officeId}/${portfolioId}/${newId()}.jpg`;
    const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, img.blob, { contentType: "image/jpeg", upsert: false });
    if (error) throw new Error(`Yükleme başarısız: ${error.message}`);
    try {
      return await store.insert("media", { portfolio_id: portfolioId, tur, storage_path: path, sira, temsili });
    } catch (e) {
      await supabase.storage.from(MEDIA_BUCKET).remove([path]);
      throw e;
    }
  }
  const row = await store.insert("media", { id: newId(), portfolio_id: portfolioId, tur, storage_path: img.dataUrl, sira, temsili });
  if (!persistedInLocalStorage(row.id)) {
    await store.remove("media", row.id);
    throw new Error("Demo modunda tarayıcı depolama alanı doldu. Bazı fotoğrafları silin ya da Supabase bağlayın.");
  }
  return row;
}

export async function deleteMedia(store: DataStore, supabase: SupabaseClient | null, m: Media) {
  await store.remove("media", m.id);
  if (store.mode === "supabase" && supabase && !isInlineUrl(m.storage_path)) {
    // Satır silindi; depolama nesnesi silinemezse yetim kalır ama erişilemez
    await supabase.storage.from(MEDIA_BUCKET).remove([m.storage_path]).catch(() => undefined);
  }
}

/** storage_path → gösterilebilir URL (Supabase'de 1 saatlik imzalı bağlantı) */
export function useMediaUrls(media: Pick<Media, "id" | "storage_path">[], supabase: SupabaseClient | null): Record<string, string> {
  const [signed, setSigned] = useState<Record<string, string>>({});
  const remote = useMemo(() => media.filter((m) => !isInlineUrl(m.storage_path)), [media]);
  const key = remote.map((m) => m.storage_path).join("|");

  useEffect(() => {
    if (!supabase || !key) return;
    let alive = true;
    const paths = key.split("|");
    supabase.storage
      .from(MEDIA_BUCKET)
      .createSignedUrls(paths, 3600)
      .then(({ data }) => {
        if (!alive || !data) return;
        const byPath: Record<string, string> = {};
        data.forEach((d) => {
          if (d.path && d.signedUrl) byPath[d.path] = d.signedUrl;
        });
        setSigned(byPath);
      });
    return () => {
      alive = false;
    };
  }, [supabase, key]);

  return useMemo(() => {
    const out: Record<string, string> = {};
    for (const m of media) {
      if (isInlineUrl(m.storage_path)) out[m.id] = m.storage_path;
      else if (signed[m.storage_path]) out[m.id] = signed[m.storage_path]!;
    }
    return out;
  }, [media, signed]);
}
