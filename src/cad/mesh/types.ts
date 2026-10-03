export type MeshBounds = { min: [number, number, number]; max: [number, number, number]; center: [number, number, number]; radius: number };
export type MeshData = { positions: Float32Array; indices: Uint32Array; normals?: Float32Array; colors?: Float32Array; colorItemSize?: number; bounds?: MeshBounds };
export type MeshOperationKind = "delete" | "trim" | "smooth" | "fill-hole" | "cleanup" | "mirror";
export type MeshOperationRequest = { kind: MeshOperationKind; mesh: MeshData; selectedFaces?: number[]; parameters?: Record<string, number | string> };
export type MeshOperationResult = { ok: true; mesh: MeshData } | { ok: false; message: string };
