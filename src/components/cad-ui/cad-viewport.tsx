"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, TransformControls } from "@react-three/drei";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { getStandardView } from "@/cad/camera/standard-views";
import type { ViewportApi } from "@/cad/camera/types";
import { degreesToRadians } from "@/cad/transform/units";
import type { CadObjectId, CadObjectMetadata, ViewPreset } from "@/cad/types";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";

type Props = { apiRef: React.MutableRefObject<ViewportApi | null>; dark: boolean };
type CameraRig = { perspective: THREE.PerspectiveCamera | null; orthographic: THREE.OrthographicCamera | null; active: THREE.Camera | null };

function updateProjection(camera: THREE.Camera) {
  if (camera instanceof THREE.PerspectiveCamera || camera instanceof THREE.OrthographicCamera) camera.updateProjectionMatrix();
}

function CadObject({ object, register }: { object: CadObjectMetadata; register: (id: CadObjectId, object: THREE.Group | null) => void }) {
  const group = useRef<THREE.Group>(null);
  const selected = useWorkspaceStore((state) => state.selectedObjectId === object.id);
  const mode = useWorkspaceStore((state) => state.transformMode);
  const translationStep = useWorkspaceStore((state) => state.translationStep);
  const rotationStep = useWorkspaceStore((state) => state.rotationStep);
  const setTransformDragging = useWorkspaceStore((state) => state.setTransformDragging);
  const setTransform = useWorkspaceStore((state) => state.setTransform);
  const select = useWorkspaceStore((state) => state.select);
  useEffect(() => {
    register(object.id, group.current);
    return () => register(object.id, null);
  }, [object.id, register]);
  useEffect(() => {
    if (!group.current) return;
    group.current.position.set(...object.transform.position);
    group.current.rotation.set(...object.transform.rotation);
    group.current.scale.set(...object.transform.scale);
  }, [object.transform]);
  useEffect(() => {
    group.current?.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        material.transparent = object.opacity < 1;
        material.opacity = object.opacity;
        material.needsUpdate = true;
      }
    });
  }, [object.opacity]);
  const onChange = useCallback(() => {
    const current = group.current;
    if (!current) return;
    setTransform(object.id, {
      position: [current.position.x, current.position.y, current.position.z],
      rotation: [current.rotation.x, current.rotation.y, current.rotation.z],
      scale: [current.scale.x, current.scale.y, current.scale.z],
    });
  }, [object.id, setTransform]);
  const meshProps = {
    onClick: (event: { stopPropagation: () => void }) => { event.stopPropagation(); select(object.id); },
    castShadow: true,
    receiveShadow: true,
  };
  const children = object.role === "crown" ? (
    <mesh {...meshProps}><sphereGeometry args={[6, 32, 24]} /><meshStandardMaterial color="#d6b98a" roughness={0.42} metalness={0.08} emissive={selected ? "#255a58" : "#000000"} /></mesh>
  ) : object.role === "reference" ? (
    <mesh {...meshProps}><torusGeometry args={[7, 1.1, 16, 48]} /><meshStandardMaterial color="#6d8ba5" transparent opacity={object.opacity} roughness={0.7} emissive={selected ? "#255a58" : "#000000"} /></mesh>
  ) : (
    <mesh {...meshProps}><dodecahedronGeometry args={[7, 1]} /><meshStandardMaterial color="#76b5aa" roughness={0.5} emissive={selected ? "#255a58" : "#000000"} /></mesh>
  );
  if (!object.visible) return null;
  return (
    <>
      {selected && object.editable && mode !== "select" ? (
        <TransformControls mode={mode} translationSnap={translationStep === "free" ? undefined : translationStep} rotationSnap={rotationStep === "free" ? undefined : degreesToRadians(rotationStep)} onObjectChange={onChange} onMouseDown={() => setTransformDragging(true)} onMouseUp={() => setTransformDragging(false)}>
          <group ref={group}>{children}</group>
        </TransformControls>
      ) : <group ref={group}>{children}</group>}
    </>
  );
}

function CameraController({ apiRef, objectsRef }: { apiRef: Props["apiRef"]; objectsRef: React.MutableRefObject<Map<CadObjectId, THREE.Group>> }) {
  const mode = useWorkspaceStore((state) => state.cameraMode);
  const { camera, set, size } = useThree();
  const controls = useRef<THREE.EventDispatcher | null>(null);
  const transformDragging = useWorkspaceStore((state) => state.transformDragging);
  const rig = useRef<CameraRig>({ perspective: null, orthographic: null, active: null });
  const target = useRef(new THREE.Vector3(0, 0, 0));
  const [controlKey, setControlKey] = useState(0);
  const moveTo = useCallback((preset: ViewPreset) => {
    const active = rig.current.active;
    if (!active) return;
    if (preset === "reset") {
      target.current.set(0, 0, 0);
      active.position.set(38, -50, 36);
      active.up.set(0, 0, 1);
    } else {
      const distance = Math.max(active.position.distanceTo(target.current), 50);
      const view = getStandardView(preset, distance);
      active.position.set(target.current.x + view.position[0], target.current.y + view.position[1], target.current.z + view.position[2]);
      active.up.set(...view.up);
    }
    active.lookAt(target.current);
    updateProjection(active);
    const orbit = controls.current as (THREE.EventDispatcher & { target: THREE.Vector3; update: () => void }) | null;
    orbit?.target.copy(target.current);
    orbit?.update();
  }, []);
  const frameSelected = useCallback((id: CadObjectId | null) => {
    if (!id) return;
    const targetObject = objectsRef.current.get(id);
    if (!targetObject) return;
    targetObject.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(targetObject);
    if (bounds.isEmpty()) return;
    bounds.getCenter(target.current);
    const radius = Math.max(bounds.getBoundingSphere(new THREE.Sphere()).radius, 8);
    const active = rig.current.active;
    if (!active) return;
    const direction = active.position.clone().sub(target.current).normalize();
    const distance = radius * (active instanceof THREE.PerspectiveCamera ? 2.8 : 3.2);
    active.position.copy(target.current).addScaledVector(direction, distance);
    if (active instanceof THREE.OrthographicCamera) active.zoom = Math.min(size.width, size.height) / (radius * 3.6);
    active.lookAt(target.current);
    updateProjection(active);
    const orbit = controls.current as (THREE.EventDispatcher & { target: THREE.Vector3; update: () => void }) | null;
    orbit?.target.copy(target.current);
    orbit?.update();
  }, [objectsRef, size.height, size.width]);
  useEffect(() => {
    const current = camera as THREE.PerspectiveCamera | THREE.OrthographicCamera;
    rig.current.orthographic = new THREE.OrthographicCamera(-size.width / 2, size.width / 2, size.height / 2, -size.height / 2, 0.1, 5000);
    rig.current.orthographic.up.set(0, 0, 1);
    if (current instanceof THREE.PerspectiveCamera) rig.current.perspective = current;
    rig.current.active = current;
  // Create the second camera once. It is owned by this viewport and swapped through R3F's root state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const current = rig.current.active;
    const next = mode === "perspective" ? rig.current.perspective : rig.current.orthographic;
    if (!current || !next || current === next) return;
    next.position.copy(current.position);
    next.quaternion.copy(current.quaternion);
    next.up.copy(current.up);
    if (next instanceof THREE.OrthographicCamera && current instanceof THREE.PerspectiveCamera) {
      const height = 2 * current.position.distanceTo(target.current) * Math.tan(THREE.MathUtils.degToRad(current.fov / 2));
      const aspect = size.width / Math.max(size.height, 1);
      next.left = (-height * aspect) / 2; next.right = (height * aspect) / 2; next.top = height / 2; next.bottom = -height / 2; next.zoom = 1;
    } else if (next instanceof THREE.PerspectiveCamera && current instanceof THREE.OrthographicCamera) {
      const height = (current.top - current.bottom) / Math.max(current.zoom, 0.01);
      next.fov = THREE.MathUtils.radToDeg(2 * Math.atan(height / (2 * current.position.distanceTo(target.current))));
    }
    next.updateProjectionMatrix();
    rig.current.active = next;
    set({ camera: next });
    setControlKey((key) => key + 1);
  }, [mode, set, size.height, size.width]);
  useEffect(() => {
    const camera = rig.current.orthographic;
    if (!camera) return;
    const height = camera.top - camera.bottom;
    const aspect = size.width / Math.max(size.height, 1);
    camera.left = (-height * aspect) / 2;
    camera.right = (height * aspect) / 2;
    updateProjection(camera);
  }, [size.height, size.width]);
  useEffect(() => {
    apiRef.current = { setView: moveTo, frameSelected };
    return () => { apiRef.current = null; };
  }, [apiRef, frameSelected, moveTo]);
  return (
    <>
      <OrbitControls key={controlKey} ref={controls as never} makeDefault enabled={!transformDragging} enableDamping={false} mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }} />
    </>
  );
}

function Grid({ dark }: { dark: boolean }) {
  const grid = useMemo(() => {
    const object = new THREE.GridHelper(160, 32, dark ? 0x52636e : 0x9baab1, dark ? 0x34404a : 0xcbd3d7);
    object.rotation.x = Math.PI / 2;
    object.position.z = -13;
    return object;
  }, [dark]);
  useEffect(() => () => { grid.geometry.dispose(); for (const material of Array.isArray(grid.material) ? grid.material : [grid.material]) material.dispose(); }, [grid]);
  return <primitive object={grid} />;
}

export function CadViewport({ apiRef, dark }: Props) {
  const objects = useWorkspaceStore((state) => state.objects);
  const select = useWorkspaceStore((state) => state.select);
  const objectsRef = useRef(new Map<CadObjectId, THREE.Group>());
  const register = useCallback((id: CadObjectId, object: THREE.Group | null) => { if (object) objectsRef.current.set(id, object); else objectsRef.current.delete(id); }, []);
  return (
    <Canvas shadows dpr={[1, 1.5]} camera={{ position: [38, -50, 36], up: [0, 0, 1], fov: 40, near: 0.1, far: 5000 }} onPointerMissed={() => select(null)}>
      <color attach="background" args={[dark ? "#161b21" : "#e9eef0"]} />
      <ambientLight intensity={dark ? 1.1 : 1.6} />
      <directionalLight position={[35, -25, 48]} intensity={dark ? 2.2 : 2.8} castShadow />
      <directionalLight position={[-25, 18, 12]} intensity={dark ? 0.65 : 0.9} />
      <Grid dark={dark} />
      <CameraController apiRef={apiRef} objectsRef={objectsRef} />
      {objects.map((object) => <CadObject key={object.id} object={object} register={register} />)}
    </Canvas>
  );
}
