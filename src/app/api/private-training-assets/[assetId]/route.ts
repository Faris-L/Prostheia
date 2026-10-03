import { readFile } from "node:fs/promises";
import path from "node:path";

import { getPrivateTrainingAsset } from "@/cad/case-packages/private-asset-catalog";
import { getAuthenticatedIdentity } from "@/lib/auth/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const identity = await getAuthenticatedIdentity();
  if (!identity) return new Response("Authentication required.", { status: 401 });

  const { assetId } = await params;
  const asset = getPrivateTrainingAsset(assetId);
  if (!asset) return new Response("Private training asset not found.", { status: 404 });

  try {
    const filePath = path.join(process.cwd(), "src", "cad", "case-packages", "private-v1", "runtime", asset.runtimeFile);
    const file = await readFile(filePath);
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": "model/gltf-binary",
        "Content-Length": String(file.byteLength),
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Private training asset is unavailable.", { status: 503 });
  }
}
