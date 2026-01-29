import { Container, Sprite, Texture, Application, Graphics } from 'pixi.js';

export type ParticleType = 'HIT_SPARK' | 'RESONANCE_SPARK' | 'AURA';

interface Particle {
    sprite: Sprite;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    type: ParticleType;
    scaleSpeed?: number;
    alphaSpeed?: number;
    rotationSpeed?: number;
}

export class ParticleSystem {
    private container: Container;
    private particles: Particle[] = [];
    private app: Application;

    // Textures cache
    private textures: Record<string, Texture> = {};

    constructor(app: Application, parent: Container) {
        this.app = app;
        this.container = new Container();
        parent.addChild(this.container);

        this.initTextures();
    }

    private initTextures() {
        // Create simple textures programmatically
        const g = new Graphics();

        // 1. Spark (Diamond shape)
        g.clear();
        g.poly([0, -10, 10, 0, 0, 10, -10, 0]);
        g.fill({ color: 0xffffff });
        this.textures['spark'] = this.app.renderer.generateTexture(g);

        // 2. Glow element (Circle with soft edge - simulated)
        g.clear();
        g.circle(0, 0, 10);
        g.fill({ color: 0xffffff, alpha: 0.8 });
        this.textures['glow'] = this.app.renderer.generateTexture(g);
    }

    public spawn(x: number, y: number, type: ParticleType) {
        const count = type === 'HIT_SPARK' ? 8 : (type === 'RESONANCE_SPARK' ? 20 : 1);

        for (let i = 0; i < count; i++) {
            const sprite = new Sprite(this.textures[type === 'AURA' ? 'glow' : 'spark']);
            sprite.anchor.set(0.5);
            sprite.x = x;
            sprite.y = y;

            // Setup specific behaviors
            let p: Particle;

            if (type === 'HIT_SPARK') {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 5;
                p = {
                    sprite,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 20 + Math.random() * 10,
                    maxLife: 30,
                    type,
                    scaleSpeed: -0.02,
                    rotationSpeed: (Math.random() - 0.5) * 0.5
                };
                sprite.scale.set(0.5 + Math.random() * 0.5);
                sprite.tint = 0xffaa00; // Orange/Gold
            }
            else if (type === 'RESONANCE_SPARK') {
                const angle = Math.random() * Math.PI * 2;
                const speed = 4 + Math.random() * 8;
                p = {
                    sprite,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 30 + Math.random() * 20,
                    maxLife: 50,
                    type,
                    scaleSpeed: -0.01,
                    rotationSpeed: (Math.random() - 0.5) * 0.8
                };
                sprite.scale.set(0.8 + Math.random() * 0.7);
                sprite.tint = Math.random() < 0.5 ? 0x00ffff : 0xffffff; // Cyan/White
                // Add Blend Mode if possible? (Pixi v8 API check needed, keeping simple for now)
            }
            else { // AURA or defaults
                p = {
                    sprite,
                    vx: 0,
                    vy: -1,
                    life: 50,
                    maxLife: 50,
                    type: 'AURA',
                    alphaSpeed: -0.02
                };
            }

            this.container.addChild(sprite);
            this.particles.push(p);
        }
    }

    public update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.life--;

            // Movement
            p.sprite.x += p.vx;
            p.sprite.y += p.vy;

            // Physics / Behavior
            if (p.type === 'HIT_SPARK' || p.type === 'RESONANCE_SPARK') {
                p.vy += 0.2; // Gravity
                p.sprite.rotation += p.rotationSpeed || 0;
            }

            // Scale
            if (p.scaleSpeed) {
                p.sprite.scale.x = Math.max(0, p.sprite.scale.x + p.scaleSpeed);
                p.sprite.scale.y = Math.max(0, p.sprite.scale.y + p.scaleSpeed);
            }

            // Alpha
            if (p.alphaSpeed) {
                p.sprite.alpha = Math.max(0, p.sprite.alpha + p.alphaSpeed);
            } else {
                p.sprite.alpha = p.life / p.maxLife;
            }

            // Cleanup
            if (p.life <= 0 || p.sprite.scale.x <= 0) {
                this.container.removeChild(p.sprite);
                // p.sprite.destroy(); // Optional, but good for memory if not pooling
                this.particles.splice(i, 1);
            }
        }
    }

    public destroy() {
        this.container.destroy({ children: true });
    }
}
