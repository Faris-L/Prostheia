import { afterEach, describe, expect, it } from "vitest";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { cadObjectId } from "@/cad/types";
import { serializeGeometry } from "@/cad/persistence/cloud-cases";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

afterEach(() => geometryRegistry.clear());

describe("cloud geometry snapshots", () => {
  it("round trips indexed geometry and hierarchy through the internal GLB snapshot", async () => {
    const root = new THREE.Group();
    root.name = "upper_scan";
    const sourceParent = new THREE.Group();
    sourceParent.name = "import hierarchy";
    const source = new THREE.BufferGeometry();
    source.setAttribute("position", new THREE.Float32BufferAttribute([0,0,0, 2,0,0, 0,3,0], 3));
    source.setIndex([0,1,2]);
    const mesh = new THREE.Mesh(source, new THREE.MeshStandardMaterial({ color: 0xcccccc }));
    mesh.name = "mesh-child-0";
    mesh.position.set(4,5,6);
    sourceParent.add(mesh);
    root.add(sourceParent);
    geometryRegistry.register({ id: cadObjectId("stable_upper_scan"), role: "maxilla", name: "Upper scan", object: root, ownsResources: true });

    const snapshot = await serializeGeometry("stable_upper_scan", "Upper scan");
    expect(snapshot.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(snapshot.triangleCount).toBe(1);
    const reloaded = await new GLTFLoader().parseAsync(await snapshot.blob.arrayBuffer(), "");
    const reloadedMeshes: THREE.Mesh[] = [];
    reloaded.scene.traverse((child) => { if (child instanceof THREE.Mesh) reloadedMeshes.push(child); });
    expect(reloadedMeshes).toHaveLength(1);
    expect(reloadedMeshes[0].parent?.name).toBe("import_hierarchy");
    expect(reloadedMeshes[0].position.toArray()).toEqual([4,5,6]);
    expect([...reloadedMeshes[0].geometry.getAttribute("position").array]).toEqual([0,0,0,2,0,0,0,3,0]);
    expect([...reloadedMeshes[0].geometry.index!.array]).toEqual([0,1,2]);
  });

  it("rejects non-finite coordinates before a snapshot can be uploaded", async () => {
    const root = new THREE.Group();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([0,0,0, Number.NaN,1,0, 0,1,0], 3));
    root.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial()));
    geometryRegistry.register({ id: cadObjectId("invalid_mesh"), role: "scan", name: "Invalid", object: root, ownsResources: true });
    await expect(serializeGeometry("invalid_mesh", "Invalid")).rejects.toThrow(/invalid coordinates/i);
  });
});

describe("revision database contract", () => {
  it("locks the case and rejects a stale expected head before inserting a new revision", () => {
    const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260927150000_phase_13_cloud_case_revisions.sql"), "utf8");
    expect(migration).toMatch(/for update;\s*if not found then raise exception 'case_not_found'/i);
    expect(migration).toMatch(/v_head_id is distinct from p_expected_head_id then raise exception 'case_head_conflict'/i);
    expect(migration).toMatch(/on conflict \(case_id\) do update set revision_id = excluded\.revision_id/i);
  });

  it("scopes checkpoint creation to the exact owner case and revision", () => {
    const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260927151000_phase_13_checkpoint_rls_qualification.sql"), "utf8");
    expect(migration).toMatch(/h\.case_id = case_checkpoints\.case_id/i);
    expect(migration).toMatch(/h\.revision_id = case_checkpoints\.revision_id/i);
    expect(migration).toMatch(/c\.user_id = \(select auth\.uid\(\)\)/i);
  });

  it("rejects source revisions and duplicate lineage from a different owner", () => {
    const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260927152000_phase_13_case_lineage_ownership.sql"), "utf8");
    expect(migration).toMatch(/duplicate_source_not_owned/i);
    expect(migration).toMatch(/source_revision_not_owned/i);
    expect(migration).toMatch(/set search_path = ''/i);
  });
});
