"use client";

import { useEffect, type MutableRefObject } from "react";
import * as THREE from "three";
import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import type { CadObjectId, CadObjectMetadata } from "@/cad/types";

export function useViewportObjectRegistration({
  id,
  name,
  role,
  usesRegisteredGeometry,
  objectRef,
}: {
  id: CadObjectId;
  name: string;
  role: CadObjectMetadata["role"];
  usesRegisteredGeometry: boolean;
  objectRef: MutableRefObject<THREE.Group | null>;
}) {
  useEffect(() => {
    const runtime = objectRef.current;
    if (!runtime) return;
    // Package/import loaders own registered objects. React Strict Mode runs
    // effect cleanup during its development remount, so the viewport must not
    // remove objects that it did not register.
    if (usesRegisteredGeometry) return;
    geometryRegistry.register({ id, name, role, object: runtime, ownsResources: false });
    useWorkspaceStore.getState().setGeometryStats(id, geometryRegistry.stats(id));
    return () => geometryRegistry.remove(id);
  }, [id, name, objectRef, role, usesRegisteredGeometry]);
}
