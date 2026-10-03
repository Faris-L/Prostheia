import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { CameraSnapshot } from "@/cad/camera/types";
import { MAX_SCREENSHOT_BYTES, validateAnnotations, type ScreenshotAnnotation } from "./model";

const bucket = "screenshots";

export type SavedScreenshot = {
  id: string;
  case_id: string;
  revision_id: string | null;
  asset_id: string;
  camera_state: Record<string, unknown>;
  created_at: string;
  asset: { object_path: string; mime_type: string | null; byte_size: number | null };
  annotations: ScreenshotAnnotation[];
};

function sha256(bytes: ArrayBuffer) {
  return crypto.subtle.digest("SHA-256", bytes).then((digest) => [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join(""));
}

export async function listCaseScreenshots(caseId: string): Promise<SavedScreenshot[]> {
  const client = createBrowserSupabaseClient();
  const { data, error } = await client.from("case_screenshots")
    .select("id,case_id,revision_id,asset_id,camera_state,created_at,assets!inner(object_path,mime_type,byte_size),screenshot_annotations(id,annotation_type,payload,created_at)")
    .eq("case_id", caseId).order("created_at", { ascending: false }).limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const asset = Array.isArray(row.assets) ? row.assets[0] : row.assets;
    return {
      id: row.id, case_id: row.case_id, revision_id: row.revision_id, asset_id: row.asset_id,
      camera_state: row.camera_state as Record<string, unknown>, created_at: row.created_at,
      asset: asset!, annotations: row.screenshot_annotations.map((annotation) => ({
        id: annotation.id, type: annotation.annotation_type, payload: annotation.payload as ScreenshotAnnotation["payload"], createdAt: annotation.created_at,
      })),
    };
  });
}

export async function loadScreenshotImage(path: string) {
  const { data, error } = await createBrowserSupabaseClient().storage.from(bucket).download(path);
  if (error || !data || data.type !== "image/webp" || data.size > MAX_SCREENSHOT_BYTES) throw new Error(error?.message ?? "The saved screenshot image is invalid.");
  return data;
}

export async function saveScreenshot(input: {
  caseId: string;
  revisionId: string | null;
  id: string;
  blob: Blob;
  width: number;
  height: number;
  camera: CameraSnapshot;
  annotations: ScreenshotAnnotation[];
}) {
  if (input.blob.type !== "image/webp" || input.blob.size > MAX_SCREENSHOT_BYTES || input.width < 1 || input.height < 1 || input.width > 8192 || input.height > 8192) throw new Error("Screenshot image type, size, or dimensions are invalid.");
  validateAnnotations(input.annotations);
  const client = createBrowserSupabaseClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) throw new Error("Sign in again before saving this screenshot.");
  const path = `${auth.user.id}/${input.id}/${input.id}.webp`;
  const bytes = await input.blob.arrayBuffer();
  const digest = await sha256(bytes);
  const uploaded = await client.storage.from(bucket).upload(path, input.blob, { contentType: "image/webp", upsert: false, cacheControl: "31536000" });
  if (uploaded.error) throw new Error(`Screenshot upload failed: ${uploaded.error.message}`);
  let assetId: string | undefined;
  try {
    const assetResult = await client.from("assets").insert({
      scope: "user", visibility: "private", owner_user_id: auth.user.id, created_by: auth.user.id,
      kind: "screenshot", bucket_id: bucket, object_path: path, original_filename: `${input.id}.webp`,
      mime_type: "image/webp", byte_size: input.blob.size, sha256: digest, status: "ready",
    }).select("id").single();
    if (assetResult.error || !assetResult.data) throw new Error(assetResult.error?.message ?? "Screenshot metadata could not be saved.");
    assetId = assetResult.data.id;
    const screenshotResult = await client.from("case_screenshots").insert({
      id: input.id, user_id: auth.user.id, case_id: input.caseId, revision_id: input.revisionId,
      asset_id: assetId, camera_state: { width: input.width, height: input.height, ...input.camera } as never,
    });
    if (screenshotResult.error) throw new Error(screenshotResult.error.message);
    if (input.annotations.length) {
      const annotationResult = await client.from("screenshot_annotations").insert(input.annotations.map((annotation, sort_order) => ({
        id: annotation.id, screenshot_id: input.id, annotation_type: annotation.type, payload: annotation.payload as never, sort_order,
      })));
      if (annotationResult.error) throw new Error(annotationResult.error.message);
    }
    return { id: input.id, path, assetId };
  } catch (error) {
    if (assetId) await client.from("assets").delete().eq("id", assetId);
    await client.storage.from(bucket).remove([path]);
    throw error;
  }
}

export async function replaceScreenshotAnnotations(screenshotId: string, annotations: ScreenshotAnnotation[]) {
  validateAnnotations(annotations);
  const client = createBrowserSupabaseClient();
  if (annotations.length) {
    const updated = await client.from("screenshot_annotations").upsert(annotations.map((annotation, sort_order) => ({
      id: annotation.id, screenshot_id: screenshotId, annotation_type: annotation.type, payload: annotation.payload as never, sort_order,
    })), { onConflict: "id" });
    if (updated.error) throw new Error(updated.error.message);
  }
  let removal = client.from("screenshot_annotations").delete().eq("screenshot_id", screenshotId);
  if (annotations.length) removal = removal.not("id", "in", `(${annotations.map((annotation) => `"${annotation.id}"`).join(",")})`);
  const removed = await removal;
  if (removed.error) throw new Error(removed.error.message);
}
