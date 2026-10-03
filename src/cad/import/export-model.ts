import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { STLExporter } from "three/addons/exporters/STLExporter.js";
import { OBJExporter } from "three/addons/exporters/OBJExporter.js";
import type { CadObjectId } from "../types";
import { geometryRegistry } from "../scene/geometry-registry";

export async function exportObjectGlb(id: CadObjectId, fileName: string) {
  await exportCadObject(id, fileName, "glb");
}

export async function exportCadObject(id: CadObjectId, fileName: string, format: "stl" | "obj" | "glb") {
  const runtime = geometryRegistry.get(id);
  if (!runtime) throw new Error("Select an imported object before exporting its geometry.");
  if (!geometryRegistry.getMeshes(id).length) throw new Error("The selected object does not contain supported mesh geometry.");
  const clone = runtime.object.clone(true);
  const overlays: THREE.Object3D[] = [];
  clone.traverse((child) => { if (child.userData.prostheiaSelectionOverlay) overlays.push(child); });
  for (const overlay of overlays) overlay.parent?.remove(overlay);
  clone.updateMatrixWorld(true);
  let blob: Blob;
  if (format === "glb") {
    const exported = await new GLTFExporter().parseAsync(clone, { binary: true, onlyVisible: false, forceIndices: true });
    if (!(exported instanceof ArrayBuffer) || !exported.byteLength) throw new Error("The GLB exporter returned an invalid file.");
    blob = new Blob([exported], { type: "model/gltf-binary" });
  } else if (format === "stl") {
    const exported = new STLExporter().parse(clone, { binary: true });
    if (!exported.byteLength) throw new Error("The STL exporter returned an empty file.");
    blob = new Blob([exported], { type: "model/stl" });
  } else {
    const exported = new OBJExporter().parse(clone);
    if (!exported.trim()) throw new Error("The OBJ exporter returned an empty file.");
    blob = new Blob([exported], { type: "text/plain" });
  }
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
  anchor.href = url; anchor.download = `${safeFileName(fileName)}.${format}`; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFileName(value: string) { return value.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/\s+/g, "-") || "prostheia-mesh"; }
