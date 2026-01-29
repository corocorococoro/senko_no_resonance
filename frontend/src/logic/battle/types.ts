export type ScriptEventType =
    | 'WAIT' | 'BARRIER'
    | 'CAMERA_FOCUS' | 'SHAKE' | 'FLASH_SCREEN' | 'CUT_IN_START' | 'CUT_IN_END' | 'TRAIT_TRIGGER'
    | 'ANIMATION' | 'VFX_PLAY' | 'DAMAGE_POPUP' | 'UPDATE_GAUGE' | 'LOG_MESSAGE' | 'UPDATE_STATE';

export interface ScriptEvent {
    type: ScriptEventType;
    // Common
    actorId?: number;
    targetId?: number;
    // Timing
    ms?: number;
    duration?: number;
    // Visuals
    name?: string; // For Cut-in or Anim name
    color?: string;
    intensity?: number;
    text?: string;
    style?: string; // 'INFO' | 'RES' | 'CRIT'
    // Values
    value?: number;
    isResonance?: boolean;
    gauge?: 'HP' | 'BP';
    // Extras
    participants?: number[];
    location?: { x: number, y: number };
}

export interface TurnRecord {
    turnId: number;
    timestamp: number;
    inputs: any[]; // Relaxed generic for now
    rngSeed: number;
    finalScript: ScriptEvent[];
    stateDiff: any[]; // Identify changes for debugging
}

export interface BattleStateV2 {
    // Simplified stub for solver visibility
    party: any[];
    enemy: any;
    // ...
}
