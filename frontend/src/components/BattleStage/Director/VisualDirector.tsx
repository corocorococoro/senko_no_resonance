import React, { useEffect } from 'react';
import type { ScriptEvent } from '../../../logic/battle/types';
import { Text, Graphics } from 'pixi.js';
import { ParticleSystem } from './ParticleSystem';

interface VisualDirectorProps {
    currentEvent: ScriptEvent | null;
    onEventComplete: () => void;
    pixi: any;
}

export const VisualDirector: React.FC<VisualDirectorProps> = ({ currentEvent, onEventComplete, pixi }) => {

    useEffect(() => {
        if (!pixi.isReady) return;

        const { app, layers } = pixi;

        // Initialize Particle System
        const particleSystem = new ParticleSystem(app, layers.vfx);

        // Add particle update loop
        const updateParticles = () => particleSystem.update();
        app.ticker.add(updateParticles);

        if (currentEvent) {
            console.log(`[VisualDirector] Processing: ${currentEvent.type}`, currentEvent);

            const handleVisuals = () => {
                switch (currentEvent.type) {
                    case 'CUT_IN_START': {
                        // SILENT MODE: React Overlay handles the visuals.
                        // We just wait here to keep the sequence timing in sync.
                        console.log("[VisualDirector] CUT_IN_START (Silent Wait)");
                        setTimeout(onEventComplete, 2200);
                        break;
                    }

                    case 'CUT_IN_END': {
                        // Nothing to clean up
                        onEventComplete();
                        break;
                    }

                    case 'DAMAGE_POPUP': {
                        const isResonance = currentEvent.isResonance || false;
                        const fontSize = isResonance ? 80 : 56;

                        // NEW: Spawn Particles
                        particleSystem.spawn(
                            app.screen.width / 2 + (Math.random() - 0.5) * 50,
                            app.screen.height / 2 - 50,
                            isResonance ? 'RESONANCE_SPARK' : 'HIT_SPARK'
                        );

                        const text = new Text({
                            text: currentEvent.value?.toString() || "0",
                            style: {
                                fontFamily: 'Arial Black, Arial',
                                fontSize,
                                fill: isResonance ? '#00FFFF' : '#FFFFFF',
                                fontWeight: 'bold',
                                stroke: { color: isResonance ? '#0066AA' : '#333333', width: isResonance ? 6 : 4 },
                                dropShadow: isResonance ? { color: '#00FFFF', blur: 12, distance: 0, alpha: 0.6 } : undefined
                            }
                        });
                        text.anchor.set(0.5);
                        text.x = app.screen.width / 2 + (Math.random() - 0.5) * 80;
                        text.y = app.screen.height / 2 - 30;
                        text.scale.set(0.3);
                        layers.vfx.addChild(text);

                        // Bounce + Float Animation
                        let frame = 0;
                        const totalFrames = isResonance ? 90 : 70;
                        const animatePopup = () => {
                            frame++;
                            const progress = frame / totalFrames;

                            if (progress < 0.2) {
                                const t = progress / 0.2;
                                text.scale.set(t * 1.2);
                            } else if (progress < 0.35) {
                                const t = (progress - 0.2) / 0.15;
                                text.scale.set(1.2 - 0.2 * t);
                            } else {
                                text.scale.set(1);
                            }

                            text.y -= isResonance ? 1.5 : 1;
                            if (progress > 0.6) {
                                text.alpha = 1 - (progress - 0.6) / 0.4;
                            }

                            if (frame >= totalFrames) {
                                layers.vfx.removeChild(text);
                                text.destroy();
                                app.ticker.remove(animatePopup);
                            }
                        };
                        app.ticker.add(animatePopup);
                        onEventComplete();
                        break;
                    }

                    case 'ANIMATION': {
                        // DISABLED: Placeholder sprite was causing visual bugs (cyan box) and duplicates.
                        // Ideally, we should animate the existing actor from BattleStage, but VisualDirector doesn't have access to them yet.
                        /*
                        const actor = new Sprite(assets.hero); // Placeholder
                        actor.anchor.set(0.5);
                        actor.x = app.screen.width * 0.75;
                        actor.y = app.screen.height * 0.55;
                        actor.scale.set(-0.2, 0.2);
                        layers.actors.addChild(actor);

                        let frame = 0;
                        const animateActor = () => {
                            frame++;
                            actor.x -= 5;
                            if (frame > 60) {
                                layers.actors.removeChild(actor);
                                actor.destroy();
                                app.ticker.remove(animateActor);
                            }
                        };
                        app.ticker.add(animateActor);
                        */
                        onEventComplete();
                        break;
                    }

                    case 'SHAKE': {
                        const duration = currentEvent.duration || 500;
                        const intensity = currentEvent.intensity || 10;
                        const startTime = Date.now();
                        const frequency = 25;
                        const originalPos = { x: 0, y: 0 };

                        const animateShake = () => {
                            const elapsed = Date.now() - startTime;
                            if (elapsed < duration) {
                                const progress = elapsed / duration;
                                const decay = 1 - (progress * progress);
                                const time = elapsed / 1000;
                                const offsetX = Math.sin(time * frequency * Math.PI * 2) * intensity * decay;
                                const offsetY = Math.cos(time * frequency * Math.PI * 2 * 0.7) * intensity * decay * 0.6;
                                app.stage.x = originalPos.x + offsetX;
                                app.stage.y = originalPos.y + offsetY;
                            } else {
                                app.stage.x = originalPos.x;
                                app.stage.y = originalPos.y;
                                app.ticker.remove(animateShake);
                            }
                        };
                        app.ticker.add(animateShake);
                        onEventComplete();
                        break;
                    }

                    case 'FLASH_SCREEN': {
                        const color = currentEvent.color || '#FFFFFF';
                        const flash = new Graphics();
                        flash.rect(0, 0, app.screen.width, app.screen.height);
                        flash.fill({ color: color, alpha: 1 });
                        layers.vfx.addChild(flash);

                        let frame = 0;
                        const totalFrames = 25;
                        const animateFlash = () => {
                            frame++;
                            const progress = frame / totalFrames;
                            const eased = 1 - Math.pow(progress, 3);
                            flash.alpha = eased;
                            if (frame >= totalFrames) {
                                layers.vfx.removeChild(flash);
                                flash.destroy();
                                app.ticker.remove(animateFlash);
                            }
                        };
                        app.ticker.add(animateFlash);
                        onEventComplete();
                        break;
                    }

                    case 'LOG_MESSAGE':
                        console.log(`[ScriptLog] ${currentEvent.text}`);
                        onEventComplete();
                        break;

                    case 'WAIT':
                        break;

                    default:
                        console.warn(`[VisualDirector] Unknown event type: ${currentEvent.type} - Skipping`);
                        onEventComplete();
                }
            };
            handleVisuals();
        }

        return () => {
            if (app?.ticker) {
                app.ticker.remove(updateParticles);
            }
            particleSystem.destroy();
        }
    }, [currentEvent, onEventComplete, pixi]);

    if (!currentEvent) return null;

    return (
        <div style={{ position: 'absolute', top: 10, left: 10, color: 'lime', backgroundColor: 'rgba(0,0,0,0.5)', padding: 5, fontSize: 10, pointerEvents: 'none' }}>
            Processing: {currentEvent.type}
        </div>
    );
};
