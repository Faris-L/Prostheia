import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { CadObjectRole } from "../types";
import type { ImportSourceMetadata, ModelFormat } from "./types";

const contentTypes: Record<ModelFormat, string> = { stl: "model/stl", obj: "model/obj", ply: "model/ply", glb: "model/gltf-binary", gltf: "model/gltf+json" };

/** Saves the untouched source file directly to its owner's private Storage path. */
export async function storeRawModel(file: File, metadata: ImportSourceMetadata, role: CadObjectRole, signal?: AbortSignal) {
  const supabase = createBrowserSupabaseClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Sign in again before saving the original model to private storage.");
  if (signal?.aborted) throw new DOMException("Import cancelled.", "AbortError");
  const assetId = crypto.randomUUID();
  const safeFileName = file.name.normalize("NFKC").replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^[._-]+|[._-]+$/g, "").slice(-180) || `model.${metadata.format}`;
  const objectPath = `${auth.user.id}/${assetId}/${safeFileName}`;
  const bucket = supabase.storage.from("user-imports");
  const upload = await bucket.upload(objectPath, file, { contentType: contentTypes[metadata.format], upsert: false, cacheControl: "3600" });
  if (upload.error) throw new Error("The original file could not be saved to private storage.");
  try {
    if (signal?.aborted) throw new DOMException("Import cancelled.", "AbortError");
    const asset = await supabase.from("assets").insert({
      id: assetId,
      scope: "user",
      visibility: "private",
      owner_user_id: auth.user.id,
      created_by: auth.user.id,
      kind: "model",
      bucket_id: "user-imports",
      object_path: objectPath,
      original_filename: file.name.slice(0, 255),
      mime_type: contentTypes[metadata.format],
      byte_size: file.size,
      status: "ready",
    });
    if (asset.error) throw asset.error;
    if (signal?.aborted) throw new DOMException("Import cancelled.", "AbortError");
    if (metadata.format !== "gltf") {
      const min = metadata.sourceBounds.min.map((value) => value * metadata.unitScale);
      const max = metadata.sourceBounds.max.map((value) => value * metadata.unitScale);
      const model = await supabase.from("model_assets").insert({
        asset_id: assetId,
        format: metadata.format,
        default_role: role,
        source_unit: metadata.sourceUnit,
        vertex_count: metadata.vertexCount,
        triangle_count: metadata.triangleCount,
        bbox_min: min,
        bbox_max: max,
        has_normals: true,
        original_to_canonical: { matrix: metadata.originalToCanonical },
        technical_metadata: { original_format: metadata.format, imported_at: new Date(metadata.importedAt).toISOString(), warnings: metadata.warnings, unit_scale: metadata.unitScale, orientation: metadata.orientation },
      });
      if (model.error) throw model.error;
    }
    if (signal?.aborted) throw new DOMException("Import cancelled.", "AbortError");
    return { assetId, bucket: "user-imports" as const, objectPath };
  } catch (error) {
    await supabase.from("assets").delete().eq("id", assetId);
    await bucket.remove([objectPath]);
    if (signal?.aborted) throw new DOMException("Import cancelled.", "AbortError");
    throw new Error("The original was uploaded but its asset metadata could not be registered.", { cause: error });
  }
}
