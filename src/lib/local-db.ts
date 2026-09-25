import Dexie, { type EntityTable } from "dexie";

export interface RecoveryMetadata {
  key: string;
  savedAt: number;
}

class ProstheiaLocalDatabase extends Dexie {
  recoveryMetadata!: EntityTable<RecoveryMetadata, "key">;

  constructor() {
    super("prostheia-local");
    this.version(1).stores({ recoveryMetadata: "key,savedAt" });
    this.recoveryMetadata = this.table("recoveryMetadata");
  }
}

export const localDb = new ProstheiaLocalDatabase();
