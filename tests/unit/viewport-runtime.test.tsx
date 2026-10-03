import * as THREE from "three";
import { StrictMode, useRef } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { caseObjectRuntimeId } from "@/cad/case-packages/identity";
import { loadCasePackage } from "@/cad/case-packages/loader";
import { fixedInlay36R3Package } from "@/cad/case-packages/definitions/fixed-prosthetics-r3";
import type { ResolvedCaseAsset } from "@/cad/case-packages/asset-registry";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import type { CadObjectId } from "@/cad/types";
import { useViewportObjectRegistration } from "@/components/cad-ui/viewport-runtime";

afterEach(() => {
  cleanup();
  geometryRegistry.clear();
  useWorkspaceStore.getState().resetDemo();
});

function RuntimeObject({ id }: { id: CadObjectId }) {
  const metadata = useWorkspaceStore((state) => state.objects.find((object) => object.id === id));
  const selected = useWorkspaceStore((state) => state.selectedObjectId === id);
  const select = useWorkspaceStore((state) => state.select);
  const runtime = geometryRegistry.get(id)?.object as THREE.Group | undefined;
  const objectRef = useRef<THREE.Group | null>(runtime ?? null);
  const usesRegisteredGeometry = Boolean(metadata?.importSource || (metadata?.syntheticMesh && metadata.id !== "demo-synthetic-scan"));
  useViewportObjectRegistration({
    id,
    name: metadata?.name ?? String(id),
    role: metadata?.role ?? "other",
    usesRegisteredGeometry,
    objectRef,
  });
  if (!metadata) return null;
  return <button type="button" aria-pressed={selected} data-registered={runtime ? "true" : "false"} onClick={() => select(id)}>{metadata.caseRole}</button>;
}

describe("viewport runtime registration", () => {
  it("keeps package SOURCE and DESIGN objects registered and intact through selection", async () => {
    const manifest = structuredClone(fixedInlay36R3Package);
    manifest.packageId = "viewport-selection-regression-v1";
    manifest.caseId = "viewportruntime1";
    manifest.slug = "viewport-selection-regression";
    const source = manifest.objects.find((object) => object.id === "preparation")!;
    const design = manifest.objects.find((object) => object.id === "restoration")!;
    design.visible = true;

    const createAssetObject = (position: [number, number, number]) => {
      const root = new THREE.Group();
      root.position.set(...position);
      root.rotation.set(0.1, 0.2, 0.3);
      root.scale.set(0.8, 0.9, 1.1);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
      geometry.setIndex([0, 1, 2]);
      const material = new THREE.MeshStandardMaterial();
      const mesh = new THREE.Mesh(geometry, material);
      root.add(mesh);
      return { root, geometry, material, mesh };
    };
    const runtimeAssets = new Map<string, ReturnType<typeof createAssetObject>>();
    const importSource = {} as ResolvedCaseAsset["importSource"];
    await loadCasePackage(manifest, {
      mode: "practice",
      resolveAsset: async (reference) => {
        const position: [number, number, number] = reference.id === "prep36" ? [1, 2, 3] : reference.id === "design36" ? [-2, 1, 4] : [0, 0, 0];
        const asset = createAssetObject(position);
        runtimeAssets.set(reference.id, asset);
        return {
          object: asset.root,
          importSource,
          metadata: {} as ResolvedCaseAsset["metadata"],
          masterAssetId: null,
          runtimeAssetId: reference.assetId!,
          originalToCanonical: Array.from(new THREE.Matrix4().identity().toArray()),
          normalizationState: "source",
        };
      },
    });

    const sourceId = caseObjectRuntimeId(manifest.caseId, source.id);
    const designId = caseObjectRuntimeId(manifest.caseId, design.id);
    const sourceAsset = runtimeAssets.get("prep36")!;
    const designAsset = runtimeAssets.get("design36")!;
    const sourceRuntime = geometryRegistry.get(sourceId)!;
    const sourceGeometry = geometryRegistry.getMeshes(sourceId)[0].geometry;
    const sourceMesh = geometryRegistry.getMeshes(sourceId)[0].mesh;
    const sourceDispose = vi.spyOn(sourceGeometry, "dispose");
    const materialDispose = vi.spyOn(sourceAsset.material, "dispose");
    const sourceParent = sourceRuntime.object.parent;
    const sourceLayers = sourceRuntime.object.layers.mask;
    const toothLayers = sourceAsset.mesh.layers.mask;
    const sourceVisibility = sourceRuntime.object.visible;
    const sourceTransform = {
      position: sourceRuntime.object.position.toArray(),
      rotation: sourceRuntime.object.rotation.toArray(),
      scale: sourceRuntime.object.scale.toArray(),
    };
    const designRuntime = geometryRegistry.get(designId)!;
    const designVisibility = designRuntime.object.visible;
    const designMesh = geometryRegistry.getMeshes(designId)[0];
    const designGeometry = designMesh.geometry;
    const designGeometryDispose = vi.spyOn(designGeometry, "dispose");
    const designMaterialDispose = vi.spyOn(designAsset.material, "dispose");
    expect(useWorkspaceStore.getState().objects.find((object) => object.id === sourceId)?.editable).toBe(false);
    expect(useWorkspaceStore.getState().objects.find((object) => object.id === designId)?.editable).toBe(true);

    render(<StrictMode>{[sourceId, designId].map((id) => <RuntimeObject key={id} id={id} />)}</StrictMode>);
    fireEvent.click(screen.getByRole("button", { name: "SOURCE" }));
    expect(useWorkspaceStore.getState().selectedObjectId).toBe(sourceId);
    expect(screen.getByRole("button", { name: "SOURCE" }).getAttribute("data-registered")).toBe("true");
    expect(geometryRegistry.get(sourceId)).toBe(sourceRuntime);
    expect(geometryRegistry.getMeshes(sourceId)[0].geometry).toBe(sourceGeometry);

    fireEvent.click(screen.getByRole("button", { name: "DESIGN" }));
    expect(useWorkspaceStore.getState().selectedObjectId).toBe(designId);
    expect(screen.getByRole("button", { name: "SOURCE" }).getAttribute("data-registered")).toBe("true");
    expect(screen.getByRole("button", { name: "DESIGN" }).getAttribute("data-registered")).toBe("true");
    expect(geometryRegistry.get(sourceId)).toBe(sourceRuntime);
    expect(geometryRegistry.get(designId)).toBe(designRuntime);
    expect(sourceRuntime.object.position.toArray()).toEqual(sourceTransform.position);
    expect(sourceRuntime.object.rotation.toArray()).toEqual(sourceTransform.rotation);
    expect(sourceRuntime.object.scale.toArray()).toEqual(sourceTransform.scale);
    expect(sourceRuntime.object.visible).toBe(sourceVisibility);
    expect(designRuntime.object.visible).toBe(designVisibility);
    expect(sourceRuntime.object.parent).toBe(sourceParent);
    expect(sourceRuntime.object.layers.mask).toBe(sourceLayers);
    expect(sourceMesh.layers.mask).toBe(toothLayers);
    expect(sourceMesh.geometry).toBe(sourceGeometry);
    expect(sourceMesh.material).toBe(sourceAsset.material);
    expect(sourceGeometry.attributes.position.count).toBe(3);
    expect(sourceDispose).not.toHaveBeenCalled();
    expect(materialDispose).not.toHaveBeenCalled();
    expect(geometryRegistry.getMeshes(designId)[0].geometry).toBe(designGeometry);
    expect(designGeometryDispose).not.toHaveBeenCalled();
    expect(designMaterialDispose).not.toHaveBeenCalled();
  });
});
