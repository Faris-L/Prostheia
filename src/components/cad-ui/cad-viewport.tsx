"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, TransformControls } from "@react-three/drei";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { getStandardView } from "@/cad/camera/standard-views";
import type { CameraSnapshot, ViewportApi } from "@/cad/camera/types";
import { degreesToRadians } from "@/cad/transform/units";
import type { CadObjectId, CadObjectMetadata, CadTransform, ViewPreset } from "@/cad/types";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { markPreviewDirty, recordAppliedTransform } from "@/cad/engine/cad-actions";
import { cloneTransform } from "@/cad/engine/commands";
import { useMeshSelectionStore } from "@/cad/mesh/selection-store";
import { useCadUiStore } from "@/cad/engine/ui-store";
import { applySculptPoint, beginSculptStroke, cancelSculptStroke, commitSculptStroke, type SculptStroke } from "@/cad/sculpt/stroke";
import { toast } from "sonner";
import type { MeasurePoint, SectionSettings } from "./analysis-controls";
import type { AnalysisResult } from "@/cad/analysis/types";
import { createSyntheticDentalArch, createSyntheticScanExercise, createSyntheticTooth } from "@/cad/scene/synthetic-dental-geometry";
import { useCurveStore } from "@/cad/curves/store";
import { useArticulatorStore } from "@/cad/articulator/store";
import { evaluateJawPose, poseMatrix } from "@/cad/articulator/kinematics";
import { ImplantAxisVisual } from "./implant-workflow-panel";
import { useInterfaceCopy } from "@/lib/i18n";
import { useViewportObjectRegistration } from "./viewport-runtime";

type Props = { apiRef: React.MutableRefObject<ViewportApi | null>; dark: boolean; measureActive: boolean; marginActive: boolean; measurePoints: MeasurePoint[]; section: SectionSettings; scalar: Extract<AnalysisResult, { values: Float32Array }> | null; referenceMode?: "off" | "outline" | "transparent" | "full"; editableTargetIds?: string[]; practiceReferenceObjectId?: string; practiceReferencePosition?: [number, number, number] };
type CameraRig = { perspective: THREE.PerspectiveCamera | null; orthographic: THREE.OrthographicCamera | null; active: THREE.Camera | null };

function updateProjection(camera: THREE.Camera) {
  if (camera instanceof THREE.PerspectiveCamera || camera instanceof THREE.OrthographicCamera) camera.updateProjectionMatrix();
}

function CadObject({ object, measureActive, marginActive, referenceMode, editableTargetIds }: { object: CadObjectMetadata; measureActive: boolean; marginActive: boolean; referenceMode?: Props["referenceMode"]; editableTargetIds?: string[] }) {
  const group = useRef<THREE.Group>(null);
  const articulatorMotion = useArticulatorStore((state) => object.articulatorArch === "lower" ? state.motion : "open_close");
  const articulatorT = useArticulatorStore((state) => object.articulatorArch === "lower" ? state.t : 0);
  const articulatorConfig = useArticulatorStore((state) => state.config);
  const jawMatrix = useMemo(() => object.articulatorArch === "lower" ? poseMatrix(evaluateJawPose(articulatorMotion, articulatorT, articulatorConfig)) : new THREE.Matrix4(), [object.articulatorArch, articulatorConfig, articulatorMotion, articulatorT]);
  const registeredObject = geometryRegistry.get(object.id)?.object as THREE.Group | undefined;
  const usesRegisteredGeometry = Boolean(object.importSource || (object.syntheticMesh && object.id !== "demo-synthetic-scan"));
  const imported = usesRegisteredGeometry ? registeredObject : undefined;
  const selected = useWorkspaceStore((state) => state.selectedObjectId === object.id);
  const sculptActive = useCadUiStore((state) => state.sculptTool !== null);
  const transformAllowed = !editableTargetIds || editableTargetIds.includes(object.id);
  const mode = useWorkspaceStore((state) => state.transformMode);
  const translationStep = useWorkspaceStore((state) => state.translationStep);
  const rotationStep = useWorkspaceStore((state) => state.rotationStep);
  const previewTransform = useWorkspaceStore((state) => state.previewTransform);
  const beginTransformOperation = useWorkspaceStore((state) => state.beginTransformOperation);
  const finishTransformOperation = useWorkspaceStore((state) => state.finishTransformOperation);
  const select = useWorkspaceStore((state) => state.select);
  const meshMode = useMeshSelectionStore((state) => state.mode);
  const selectedMeshKey = useMeshSelectionStore((state) => state.meshKey);
  const selectedFaces = useMeshSelectionStore((state) => state.faceIndices);
  const selectMesh = useMeshSelectionStore((state) => state.selectMesh);
  const selectFace = useMeshSelectionStore((state) => state.selectFace);
  const clearFaceSelection = useMeshSelectionStore((state) => state.clearSelection);
  const synthetic = useMemo(() => usesRegisteredGeometry ? null : object.id === "demo-synthetic-scan" ? createSyntheticScanExercise() : object.role === "prepared_tooth" ? createSyntheticTooth("preparation") : object.role === "crown" ? createSyntheticTooth("restoration") : createSyntheticDentalArch(true), [object.id, object.role, usesRegisteredGeometry]);
  useViewportObjectRegistration({ id: object.id, name: object.name, role: object.role, usesRegisteredGeometry, objectRef: group });
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
        const opacity = object.role === "reference" && referenceMode === "transparent" ? 0.18 : object.role === "reference" && referenceMode === "full" ? 0.9 : object.opacity;
        material.transparent = opacity < 1;
        material.opacity = opacity;
        if ("wireframe" in material && typeof material.wireframe === "boolean") material.wireframe = object.role === "reference" && referenceMode === "outline";
        material.needsUpdate = true;
      }
    });
  }, [object.opacity, object.role, referenceMode]);
  useEffect(() => {
    if (!imported || !selected || meshMode !== "face" || !selectedMeshKey || !selectedFaces.length) return;
    const target = geometryRegistry.getMeshes(object.id).find((entry) => entry.key === selectedMeshKey)?.mesh;
    if (!target?.parent) return;
    const source = target.geometry;
    const overlayGeometry = new THREE.BufferGeometry();
    overlayGeometry.setAttribute("position", source.getAttribute("position"));
    const ids = selectedFaces.flatMap((face) => {
      const start = face * 3;
      if (start + 2 >= (source.index?.count ?? source.getAttribute("position").count)) return [];
      return source.index ? [source.index.getX(start), source.index.getX(start + 1), source.index.getX(start + 2)] : [start, start + 1, start + 2];
    });
    if (!ids.length) return;
    overlayGeometry.setIndex(ids);
    const overlay = new THREE.Mesh(overlayGeometry, new THREE.MeshBasicMaterial({ color: "#00b8a9", transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    overlay.renderOrder = 20; overlay.userData.prostheiaSelectionOverlay = true;
    target.add(overlay);
    return () => { target.remove(overlay); overlayGeometry.dispose(); (overlay.material as THREE.Material).dispose(); };
  }, [imported, meshMode, object.geometryStats?.revision, object.id, selected, selectedFaces, selectedMeshKey]);
  const onChange = useCallback(() => {
    const current = group.current;
    if (!current) return;
    previewTransform(object.id, {
      position: [current.position.x, current.position.y, current.position.z],
      rotation: [current.rotation.x, current.rotation.y, current.rotation.z],
      scale: [current.scale.x, current.scale.y, current.scale.z],
    });
    markPreviewDirty();
  }, [object.id, previewTransform]);
  const startTransform = useCallback(() => {
    const current = group.current;
    if (!current) return;
    beginTransformOperation(object.id, readTransform(current));
  }, [beginTransformOperation, object.id]);
  const commitTransform = useCallback(() => {
    const operation = finishTransformOperation();
    const current = group.current;
    if (!operation || !current) return;
    recordAppliedTransform(operation.id, operation.before, cloneTransform(readTransform(current)));
  }, [finishTransformOperation]);
  const onSyntheticClick = (event: { stopPropagation: () => void; object?: THREE.Object3D; point?: THREE.Vector3; faceIndex?: number; shiftKey?: boolean }) => { event.stopPropagation(); if (event.point && measureActive) { window.dispatchEvent(new CustomEvent("cad-analysis-point", { detail: { position: event.point.toArray(), objectId: object.id, meshId: "synthetic-dental-mesh" } })); return; } if (event.point && marginActive) { window.dispatchEvent(new CustomEvent("cad-margin-pick", { detail: { position: event.point.toArray(), objectId: object.id } })); return; } const changedObject = useWorkspaceStore.getState().selectedObjectId !== object.id; select(object.id); if (changedObject) { clearFaceSelection(); selectMesh(null); } if (object.syntheticMesh && meshMode === "face" && event.object instanceof THREE.Mesh && Number.isInteger(event.faceIndex)) { const key = String(event.object.userData.prostheiaMeshId ?? "mesh-0"); selectMesh(key); selectFace(key, event.faceIndex!, Boolean(event.shiftKey)); } };
  const renderObject = imported
    ? <primitive object={imported} ref={group} visible={object.visible} onClick={(event: { stopPropagation: () => void; object: THREE.Object3D; point: THREE.Vector3; faceIndex?: number; shiftKey?: boolean }) => { event.stopPropagation(); if (measureActive && event.object instanceof THREE.Mesh) { const key = String(event.object.userData.prostheiaMeshId ?? "mesh-0"); window.dispatchEvent(new CustomEvent("cad-analysis-point", { detail: { position: event.point.toArray(), objectId: object.id, meshId: key } })); return; } if (marginActive && event.object instanceof THREE.Mesh) { window.dispatchEvent(new CustomEvent("cad-margin-pick", { detail: { position: event.point.toArray(), objectId: object.id } })); return; } const changedObject = useWorkspaceStore.getState().selectedObjectId !== object.id; select(object.id); if (changedObject) { clearFaceSelection(); selectMesh(null); } if (meshMode === "face" && event.object instanceof THREE.Mesh && Number.isInteger(event.faceIndex)) { const key = String(event.object.userData.prostheiaMeshId ?? "mesh-0"); selectMesh(key); selectFace(key, event.faceIndex!, Boolean(event.shiftKey)); } }} castShadow receiveShadow />
    : synthetic
      ? <primitive object={synthetic} ref={group} visible={object.visible} onClick={onSyntheticClick} />
      : null;
  const jawMounted = <group matrix={jawMatrix} matrixAutoUpdate={false}>{renderObject}<group position={object.transform.position} rotation={object.transform.rotation} scale={object.transform.scale}><ImplantAxisVisual object={object} /></group></group>;
  return (
    <>
      {selected && object.editable && transformAllowed && mode !== "select" && !sculptActive ? (
        <TransformControls mode={mode} translationSnap={translationStep === "free" ? undefined : translationStep} rotationSnap={rotationStep === "free" ? undefined : degreesToRadians(rotationStep)} onObjectChange={onChange} onMouseDown={startTransform} onMouseUp={commitTransform}>
          {jawMounted}
        </TransformControls>
      ) : jawMounted}
    </>
  );
}

function AnalysisVisuals({ section, scalar }: { section: SectionSettings; scalar: Extract<AnalysisResult, { values: Float32Array }> | null }) {
  const { scene } = useThree();
  useEffect(() => {
    const plane = new THREE.Plane(section.axis === "x" ? new THREE.Vector3(1, 0, 0) : section.axis === "y" ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1), -section.offset);
    const restore: { material: THREE.Material; planes: THREE.Plane[] | null }[] = [];
    if (section.enabled) scene.traverse((object) => { if (!(object instanceof THREE.Mesh) || object.userData.prostheiaSelectionOverlay || object.userData.prostheiaAnalysisOverlay) return; const materials = Array.isArray(object.material) ? object.material : [object.material]; for (const material of materials) { restore.push({ material, planes: material.clippingPlanes ?? null }); material.clippingPlanes = [plane]; material.needsUpdate = true; } });
    return () => { for (const { material, planes } of restore) { material.clippingPlanes = planes; material.needsUpdate = true; } };
  }, [scene, section]);
  useEffect(() => {
    if (!scalar) return;
    const runtime = geometryRegistry.get(scalar.targets[0].objectId);
    const entry = runtime && geometryRegistry.getMeshes(scalar.targets[0].objectId).find((mesh) => mesh.key === scalar.targets[0].meshId);
    if (!entry || scalar.values.length !== entry.geometry.getAttribute("position").count) return;
    const geometry = entry.geometry.clone();
    const colors = new Float32Array(scalar.values.length * 3);
    for (let index = 0; index < scalar.values.length; index += 1) {
      if (!scalar.valid[index]) { colors.set([0.55, 0.58, 0.6], index * 3); continue; }
      const amount = Math.max(0, Math.min(1, scalar.values[index] / scalar.thresholdMm));
      const color = new THREE.Color().setHSL(0.48 - amount * 0.43, 0.78, 0.49);
      colors[index * 3] = color.r; colors[index * 3 + 1] = color.g; colors[index * 3 + 2] = color.b;
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.86, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
    const overlay = new THREE.Mesh(geometry, material); overlay.matrixAutoUpdate = false; overlay.matrix.copy(entry.mesh.matrixWorld); overlay.matrixWorld.copy(entry.mesh.matrixWorld); overlay.frustumCulled = false; overlay.renderOrder = 18; overlay.userData.prostheiaAnalysisOverlay = true; scene.add(overlay);
    return () => { scene.remove(overlay); geometry.dispose(); material.dispose(); };
  }, [scalar, scene]);
  return null;
}

function MeasurementMarkers({ points }: { points: MeasurePoint[] }) {
  if (!points.length) return null;
  const positions = points.map((point) => new THREE.Vector3(...point.position));
  return <>
    {positions.map((point, index) => <mesh key={`${index}-${point.x}-${point.y}-${point.z}`} position={point}><sphereGeometry args={[0.35, 16, 12]} /><meshBasicMaterial color="#21d4c1" depthTest={false} /></mesh>)}
    {positions.length === 2 && <line><bufferGeometry><bufferAttribute attach="attributes-position" args={[new Float32Array([...positions[0].toArray(), ...positions[1].toArray()]), 3]} /></bufferGeometry><lineBasicMaterial color="#21d4c1" depthTest={false} /></line>}
  </>;
}

function CurveVisuals() {
  const curves = useCurveStore((state) => state.curves);
  return <>{curves.map((curve) => <CurveLine key={curve.id} id={curve.id} closed={curve.closed} objectId={curve.objectId} coordinateSpace={curve.coordinateSpace} kind={curve.kind} points={curve.points} />)}</>;
}

function CurveLine({ id, closed, objectId, coordinateSpace, kind, points }: { id: string; closed: boolean; objectId: CadObjectId; coordinateSpace?: "object-local" | "world"; kind: string; points: [number, number, number][] }) {
  const line = useMemo(() => {
    const root = geometryRegistry.get(objectId)?.object;
    root?.updateWorldMatrix(true, true);
    const worldPoints = points.map((point) => coordinateSpace === "world" ? new THREE.Vector3(...point) : root?.localToWorld(new THREE.Vector3(...point)) ?? new THREE.Vector3(...point));
    const markers = worldPoints.map((point) => point.clone());
    if (closed && worldPoints.length) worldPoints.push(worldPoints[0].clone());
    const geometry = new THREE.BufferGeometry().setFromPoints(worldPoints.map((point) => point.add(new THREE.Vector3(0, 0, 0.035))));
    const color = kind === "denture_midline" ? "#e94b72" : kind === "denture_arch_guide" ? "#54c8ba" : "#ffd34e";
    const material = new THREE.LineBasicMaterial({ color, depthTest: false, linewidth: 2 });
    return { object: new THREE.Line(geometry, material), geometry, material, markers };
  }, [closed, coordinateSpace, kind, objectId, points]);
  useEffect(() => () => { line.geometry.dispose(); line.material.dispose(); }, [line]);
  return <group renderOrder={90}><primitive object={line.object} frustumCulled={false} />{line.markers.map((point, index) => <mesh key={`${id}-${index}`} position={[point.x, point.y, point.z + 0.055]} renderOrder={91}><sphereGeometry args={[0.15, 10, 8]} /><meshBasicMaterial color="#fff1a8" depthTest={false} /></mesh>)}</group>;
}

function readTransform(group: THREE.Group): CadTransform {
  return { position: [group.position.x, group.position.y, group.position.z], rotation: [group.rotation.x, group.rotation.y, group.rotation.z], scale: [group.scale.x, group.scale.y, group.scale.z] };
}

function CameraController({ apiRef }: { apiRef: Props["apiRef"] }) {
  const mode = useWorkspaceStore((state) => state.cameraMode);
  const { camera, gl, set, size, scene } = useThree();
  const controls = useRef<THREE.EventDispatcher | null>(null);
  const transformDragging = useWorkspaceStore((state) => state.transformDragging);
  const rig = useRef<CameraRig>({ perspective: null, orthographic: null, active: null });
  const target = useRef(new THREE.Vector3(0, 0, 0));
  const standardView = useRef<CameraSnapshot["standardView"]>("reset");
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
    standardView.current = preset;
  }, []);
  const capture = useCallback(async () => {
    const active = rig.current.active;
    if (!active) throw new Error("The CAD camera is not ready yet.");
    gl.render(scene, active);
    const canvas = gl.domElement;
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Viewport image capture failed.")), "image/webp", 0.94));
    const snapshot: CameraSnapshot = {
      position: [active.position.x, active.position.y, active.position.z],
      target: target.current.toArray() as [number, number, number],
      projection: active instanceof THREE.PerspectiveCamera ? "perspective" : "orthographic",
      ...(active instanceof THREE.OrthographicCamera ? { zoom: active.zoom } : { fov: (active as THREE.PerspectiveCamera).fov }),
      standardView: standardView.current,
    };
    return { blob, width: canvas.width, height: canvas.height, camera: snapshot };
  }, [gl, scene]);
  const frameSelected = useCallback((id: CadObjectId | null) => {
    if (!id) return;
    const targetObject = geometryRegistry.get(id)?.object;
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
  }, [size.height, size.width]);
  const frameAll = useCallback(() => {
    const bounds = new THREE.Box3();
    for (const object of useWorkspaceStore.getState().objects) {
      if (!object.visible) continue;
      const runtime = geometryRegistry.get(object.id)?.object;
      if (!runtime) continue;
      runtime.updateWorldMatrix(true, true);
      bounds.union(new THREE.Box3().setFromObject(runtime));
    }
    if (bounds.isEmpty()) return;
    bounds.getCenter(target.current);
    const radius = Math.max(bounds.getBoundingSphere(new THREE.Sphere()).radius, 8);
    const active = rig.current.active;
    if (!active) return;
    const direction = active.position.clone().sub(target.current).normalize();
    active.position.copy(target.current).addScaledVector(direction, radius * (active instanceof THREE.PerspectiveCamera ? 2.8 : 3.2));
    if (active instanceof THREE.OrthographicCamera) active.zoom = Math.min(size.width, size.height) / (radius * 3.6);
    active.lookAt(target.current);
    updateProjection(active);
    const orbit = controls.current as (THREE.EventDispatcher & { target: THREE.Vector3; update: () => void }) | null;
    orbit?.target.copy(target.current);
    orbit?.update();
  }, [size.height, size.width]);
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
    const orbit = controls.current as unknown as { addEventListener: (type: string, listener: () => void) => void; removeEventListener: (type: string, listener: () => void) => void } | null;
    if (!orbit) return;
    const onOrbit = () => { standardView.current = null; };
    orbit.addEventListener("change", onOrbit);
    return () => orbit.removeEventListener("change", onOrbit);
  }, [controlKey]);
  useEffect(() => {
    apiRef.current = { setView: moveTo, frameSelected, frameAll, capture };
    return () => { apiRef.current = null; };
  }, [apiRef, capture, frameAll, frameSelected, moveTo]);
  return (
    <>
      <OrbitControls key={controlKey} ref={controls as never} makeDefault enabled={!transformDragging} enableDamping={false} mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }} />
    </>
  );
}

function SculptInteraction({ editableTargetIds }: { editableTargetIds?: string[] }) {
  const tx = useInterfaceCopy();
  const txRef = useRef(tx);
  useEffect(() => { txRef.current = tx; }, [tx]);
  const { camera, gl } = useThree();
  const selectedObjectId = useWorkspaceStore((state) => state.selectedObjectId);
  const sculptTool = useCadUiStore((state) => state.sculptTool);
  const brushRadiusMm = useCadUiStore((state) => state.brushRadiusMm);
  const brushStrength = useCadUiStore((state) => state.brushStrength);
  const meshKey = useMeshSelectionStore((state) => state.meshKey);
  const stroke = useRef<SculptStroke | null>(null);
  const lastWorld = useRef<THREE.Vector3 | null>(null);
  const cursor = useRef<THREE.Mesh>(null);
  useEffect(() => {
    const cursorMesh = cursor.current;
    if (!cursorMesh) return;
    if (!sculptTool || !selectedObjectId) { if (stroke.current) cancelSculptStroke(stroke.current); stroke.current = null; cursorMesh.visible = false; return; }
    const element = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const pickMesh = new THREE.Mesh(); pickMesh.matrixAutoUpdate = false;
    const getHit = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      const runtime = geometryRegistry.get(selectedObjectId);
      const metadata = useWorkspaceStore.getState().objects.find((entry) => entry.id === selectedObjectId);
      if (!runtime || !(metadata?.importSource || metadata?.syntheticMesh) || !metadata.editable || !metadata.visible || runtime.role === "reference" || (editableTargetIds && !editableTargetIds.includes(metadata.id))) return null;
      const entries = geometryRegistry.getMeshes(selectedObjectId);
      const entry = meshKey ? entries.find((candidate) => candidate.key === meshKey) : entries.length === 1 ? entries[0] : undefined;
      if (!entry) return null;
      entry.mesh.updateWorldMatrix(true, false);
      pickMesh.geometry = entry.geometry; pickMesh.material = entry.mesh.material; pickMesh.matrix.copy(entry.mesh.matrixWorld); pickMesh.matrixWorld.copy(entry.mesh.matrixWorld);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(pickMesh, false)[0];
      if (!hit) return null;
      const localNormal = hit.face?.normal.clone() ?? new THREE.Vector3(0, 0, 1);
      const worldNormal = localNormal.applyMatrix3(new THREE.Matrix3().getNormalMatrix(entry.mesh.matrixWorld)).normalize();
      return { entry, point: hit.point, normal: worldNormal };
    };
    const updateCursor = (point: THREE.Vector3, normal: THREE.Vector3, radius: number) => {
      const offset = point.clone().addScaledVector(normal, 0.025);
      cursorMesh.position.copy(offset); cursorMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      cursorMesh.scale.setScalar(radius); cursorMesh.visible = true;
    };
    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      event.preventDefault(); event.stopImmediatePropagation();
      try {
        const hit = getHit(event);
        if (!hit) { cursorMesh.visible = false; return; }
        stroke.current = beginSculptStroke(selectedObjectId, hit.entry.key, sculptTool, { radiusMm: brushRadiusMm, strength: brushStrength });
        lastWorld.current = hit.point.clone();
        applySculptPoint(stroke.current, hit.point, hit.normal);
        updateCursor(hit.point, hit.normal, brushRadiusMm);
        element.setPointerCapture(event.pointerId);
      } catch (error) { console.error("Unable to begin sculpt stroke.", error); finish(false); toast.error(txRef.current("Sculpt operation could not be applied to this mesh.")); }
    };
    const onMove = (event: PointerEvent) => {
      if (!stroke.current && event.buttons !== 0) return;
      const hit = getHit(event);
      if (!hit) { cursorMesh.visible = false; return; }
      updateCursor(hit.point, hit.normal, brushRadiusMm);
      if (!stroke.current) return;
      event.preventDefault(); event.stopImmediatePropagation();
      const drag = lastWorld.current ? hit.point.clone().sub(lastWorld.current) : new THREE.Vector3();
      const localMove = stroke.current.tool === "morph" ? drag : undefined;
      try { applySculptPoint(stroke.current, hit.point, hit.normal, localMove); lastWorld.current = hit.point.clone(); }
      catch (error) { console.error("Sculpt sample failed.", error); finish(false); toast.error(txRef.current("Sculpt operation could not be applied to this mesh.")); }
    };
    const finish = (commit: boolean) => {
      const active = stroke.current; stroke.current = null; lastWorld.current = null;
      if (!active) return;
      if (!commit) { cancelSculptStroke(active); return; }
      try { const revision = commitSculptStroke(active); if (revision !== null) useWorkspaceStore.getState().setGeometryStats(active.objectId, geometryRegistry.stats(active.objectId)); }
      catch (error) { console.error("Sculpt operation failed.", error); toast.error(txRef.current("Sculpt operation could not be applied to this mesh.")); }
    };
    const onUp = (event: PointerEvent) => { if (stroke.current) { event.preventDefault(); event.stopImmediatePropagation(); finish(true); } };
    const onCancel = () => finish(false);
    const onLeave = () => { if (!stroke.current) cursorMesh.visible = false; };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && stroke.current) { event.preventDefault(); finish(false); } };
    element.addEventListener("pointerdown", onDown, true); element.addEventListener("pointermove", onMove, true);
    element.addEventListener("pointerup", onUp, true); element.addEventListener("pointercancel", onCancel, true);
    element.addEventListener("pointerleave", onLeave); window.addEventListener("keydown", onKeyDown);
    return () => { finish(false); element.removeEventListener("pointerdown", onDown, true); element.removeEventListener("pointermove", onMove, true); element.removeEventListener("pointerup", onUp, true); element.removeEventListener("pointercancel", onCancel, true); element.removeEventListener("pointerleave", onLeave); window.removeEventListener("keydown", onKeyDown); };
  }, [brushRadiusMm, brushStrength, camera, gl, meshKey, sculptTool, selectedObjectId, editableTargetIds]);
  return <mesh ref={cursor} visible={false} renderOrder={100}>
    <ringGeometry args={[0.985, 1, 96]} />
    <meshBasicMaterial color="#20d7c2" depthTest transparent opacity={0.95} />
  </mesh>;
}

function Grid({ dark }: { dark: boolean }) {
  const grid = useMemo(() => {
    const object = new THREE.GridHelper(160, 32, dark ? 0x52636e : 0x71868b, dark ? 0x34464b : 0x42575c);
    object.rotation.x = Math.PI / 2;
    object.position.z = -13;
    return object;
  }, [dark]);
  useEffect(() => () => { grid.geometry.dispose(); for (const material of Array.isArray(grid.material) ? grid.material : [grid.material]) material.dispose(); }, [grid]);
  return <primitive object={grid} />;
}

export function CadViewport({ apiRef, dark, measureActive, marginActive, measurePoints, section, scalar, referenceMode, editableTargetIds, practiceReferenceObjectId, practiceReferencePosition }: Props) {
  const objects = useWorkspaceStore((state) => state.objects);
  const select = useWorkspaceStore((state) => state.select);
  return (
    <Canvas shadows dpr={[1, 2]} gl={{ localClippingEnabled: true, preserveDrawingBuffer: true }} camera={{ position: [38, -50, 36], up: [0, 0, 1], fov: 40, near: 0.1, far: 5000 }} onPointerMissed={() => select(null)}>
      <color attach="background" args={["#10191d"]} />
      <ambientLight intensity={dark ? 1.1 : 1.6} />
      <directionalLight position={[35, -25, 48]} intensity={dark ? 2.2 : 2.8} castShadow />
      <directionalLight position={[-25, 18, 12]} intensity={dark ? 0.65 : 0.9} />
      <Grid dark={dark} />
      <CameraController apiRef={apiRef} />
      <SculptInteraction editableTargetIds={editableTargetIds} />
      {objects.map((object) => <CadObject key={object.id} object={{ ...object, transform: object.id === practiceReferenceObjectId && practiceReferencePosition ? { ...object.transform, position: practiceReferencePosition } : object.transform, visible: object.id === practiceReferenceObjectId && referenceMode ? referenceMode !== "off" : object.visible }} measureActive={measureActive} marginActive={marginActive} referenceMode={referenceMode} editableTargetIds={editableTargetIds} />)}
      <AnalysisVisuals section={section} scalar={scalar} />
      <MeasurementMarkers points={measurePoints} />
      <CurveVisuals />
    </Canvas>
  );
}
