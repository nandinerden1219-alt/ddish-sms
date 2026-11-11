import { supabaseUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
import type { InformationImage } from "@/types";

/** Public Storage bucket for step-by-step images on information cards. */
export const IMAGE_BUCKET = "information-images";

export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

const MAX_SIDE = 1600;

export function imageUrl(path: string) {
  return `${supabaseUrl}/storage/v1/object/public/${IMAGE_BUCKET}/${path}`;
}

// crypto.randomUUID needs a secure context, which a dev server opened over the LAN isn't.
function newPath(ext: string) {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
}

// Cards load these files directly (no image optimizer), so a 4 MB phone photo
// would be a 4 MB thumbnail. Cap the long side before upload; GIFs and
// already-small files go up untouched.
async function shrink(file: File): Promise<Blob> {
  if (file.type === "image/gif" || file.size < 400_000) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85)
    );
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

/** Uploads one image and returns its bucket path. Throws on failure. */
export async function uploadImage(file: File): Promise<string> {
  const blob = await shrink(file);
  const path = newPath(blob.type.split("/")[1] ?? "jpg");
  const { error } = await createClient()
    .storage.from(IMAGE_BUCKET)
    .upload(path, blob, { contentType: blob.type, cacheControl: "31536000" });
  if (error) throw error;
  return path;
}

/** Best-effort cleanup — a leftover file only costs storage, so errors are ignored. */
export async function deleteImages(paths: string[]) {
  if (paths.length === 0) return;
  await createClient().storage.from(IMAGE_BUCKET).remove(paths);
}

/** Copies files so a duplicated item doesn't share (and later delete) the original's images. */
export async function copyImages(images: InformationImage[]): Promise<InformationImage[]> {
  const storage = createClient().storage.from(IMAGE_BUCKET);
  const copies: InformationImage[] = [];
  for (const image of images) {
    const to = newPath(image.path.split(".").pop() ?? "jpg");
    const { error } = await storage.copy(image.path, to);
    if (!error) copies.push({ path: to, name: image.name });
  }
  return copies;
}
