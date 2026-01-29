import { ScriptBuilder } from '../ScriptBuilder';

export class SkillService {
    static calculate(_command: any, _target: any, _modifiers: any) {
        return {
            damage: 100, // Stub
            hits: 1,
            isCrit: false
        };
    }

    static getTemplate(_skillId: string) {
        // Stub: Return a builder function
        return (actorId: number, targetId: number, result: any) => {
            const sb = new ScriptBuilder();
            sb.animation(actorId, 'ATTACK');
            sb.damagePopup(targetId, result.damage, false);
            return sb.build();
        };
    }
}
