import type { ScriptEvent } from './types';

export class ScriptBuilder {
    private events: ScriptEvent[] = [];

    add(event: ScriptEvent) {
        this.events.push(event);
        return this;
    }

    wait(ms: number) {
        return this.add({ type: 'WAIT', ms });
    }

    log(text: string, style: 'INFO' | 'RES' | 'CRIT' = 'INFO') {
        return this.add({ type: 'LOG_MESSAGE', text, style });
    }

    // Cinematic
    cutInStart(name: string, participants: number[] = []) {
        return this.add({ type: 'CUT_IN_START', name, participants });
    }

    cutInEnd() {
        return this.add({ type: 'CUT_IN_END' });
    }

    shake(intensity: number, duration: number) {
        return this.add({ type: 'SHAKE', intensity, duration });
    }

    flashScreen(color: string = '#FFFFFF') {
        return this.add({ type: 'FLASH_SCREEN', color });
    }

    // Action
    animation(actorId: number, animName: string) {
        return this.add({ type: 'ANIMATION', actorId, name: animName });
    }

    damagePopup(targetId: number, value: number, isResonance: boolean) {
        return this.add({ type: 'DAMAGE_POPUP', targetId, value, isResonance });
    }

    build() {
        return this.events;
    }
}
