export type TextureKey = 'hero' | 'mage' | 'monk';

interface CharacterVisuals {
    textureKey: TextureKey;
    tint: number;
    tintCss: string;
}

const TEXTURES: TextureKey[] = ['hero', 'mage', 'monk'];

// Tints: White (None), Reddish, Greenish, Blueish, Yellowish
const TINTS = [
    { hex: 0xFFFFFF, css: 'brightness(100%) sepia(0%) hue-rotate(0deg)' },
    { hex: 0xFFDDDD, css: 'brightness(90%) sepia(20%) hue-rotate(-50deg) saturate(150%)' }, // Reddish
    { hex: 0xDDFFDD, css: 'brightness(90%) sepia(20%) hue-rotate(80deg) saturate(150%)' },  // Greenish
    { hex: 0xDDDDFF, css: 'brightness(90%) sepia(20%) hue-rotate(180deg) saturate(150%)' }, // Blueish
    { hex: 0xFFFFDD, css: 'brightness(100%) sepia(30%) hue-rotate(10deg) saturate(150%)' },  // Yellowish
];

export function getCharacterVisuals(memberId: number): CharacterVisuals {
    // Deterministic texture selection
    const texIndex = memberId % TEXTURES.length;

    // Deterministic tint selection
    const tintIndex = memberId % TINTS.length;
    const tintData = TINTS[tintIndex];

    return {
        textureKey: TEXTURES[texIndex],
        tint: tintData.hex,
        tintCss: tintData.css // Approximate CSS filter for the HTML img
    };
}
