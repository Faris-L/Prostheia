import { cadObjectId, type CadObjectMetadata } from "../types";

export const demoObjects: CadObjectMetadata[] = [
  { id: cadObjectId("demo-prepared-tooth"), name: "Demo preparation", role: "prepared_tooth", editable: true, transform: { position: [-8, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }, visible: true, opacity: 1 },
  { id: cadObjectId("demo-crown"), name: "Demo restoration", role: "crown", editable: true, transform: { position: [8, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }, visible: true, opacity: 1 },
  { id: cadObjectId("demo-reference"), name: "Demo reference", role: "reference", editable: false, transform: { position: [0, 0, -8], rotation: [0, 0, 0], scale: [1, 1, 1] }, visible: true, opacity: 0.45 },
  { id: cadObjectId("demo-synthetic-scan"), name: "Synthetic scan exercise · open patch", role: "other", editable: true, syntheticMesh: true, transform: { position: [0, 0, 17], rotation: [0, 0, 0], scale: [1, 1, 1] }, visible: true, opacity: 1 },
];
