import { cadObjectId, type CadObjectId } from "@/cad/types";

/** A manifest's caseId is a compact globally unique token; local ids are scoped by it. */
export function caseObjectRuntimeId(caseId: string, localObjectId: string): CadObjectId {
  if (!/^[a-z0-9]+$/.test(caseId)) throw new Error(`Invalid case identity namespace "${caseId}".`);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(localObjectId)) throw new Error(`Invalid case object identity "${localObjectId}".`);
  return cadObjectId(`${caseId}-${localObjectId}`);
}
