import { create } from "zustand";
import { SCULPT_CONFIG, type SculptTool } from "../sculpt/brush";

type UiState = {
  helpOpen: boolean; setHelpOpen: (open: boolean) => void;
  sculptTool: SculptTool | null; brushRadiusMm: number; brushStrength: number;
  setSculptTool: (tool: SculptTool | null) => void;
  setBrushRadiusMm: (radius: number) => void;
  setBrushStrength: (strength: number) => void;
};
export const useCadUiStore = create<UiState>((set) => ({
  helpOpen: false, setHelpOpen: (helpOpen) => set({ helpOpen }),
  sculptTool: null, brushRadiusMm: SCULPT_CONFIG.defaultRadiusMm, brushStrength: SCULPT_CONFIG.defaultStrength,
  setSculptTool: (sculptTool) => set({ sculptTool }),
  setBrushRadiusMm: (brushRadiusMm) => set({ brushRadiusMm: Number.isFinite(brushRadiusMm) ? Math.max(SCULPT_CONFIG.minRadiusMm, Math.min(SCULPT_CONFIG.maxRadiusMm, brushRadiusMm)) : SCULPT_CONFIG.minRadiusMm }),
  setBrushStrength: (brushStrength) => set({ brushStrength: Number.isFinite(brushStrength) ? Math.max(0, Math.min(SCULPT_CONFIG.maxStrength, brushStrength)) : 0 }),
}));
