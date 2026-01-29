import React from 'react';
import { useGameStore } from '../store/gameStore';

// Helper to get portrait URL based on Job
const getPortrait = (job: string) => {
    switch (job.toLowerCase()) {
        case 'hero': return '/assets/hero.png';
        case 'mage': return '/assets/mage.png';
        case 'monk': return '/assets/monk.png';
        default: return '/assets/hero.png'; // Fallback
    }
};

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'row' as const,
        justifyContent: 'center', // Center the party
        alignItems: 'flex-end',
        gap: '15px',
        padding: '10px 20px',
        width: '100%',
        height: '140px', // slightly taller for portraits
        background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%)', // Fade out at top
        pointerEvents: 'none' as const, // Let clicks pass through to field if needed (mostly text)
    },
    card: {
        position: 'relative' as const,
        width: '80px',
        height: '100px',
        background: 'rgba(20, 20, 30, 0.8)',
        border: '2px solid #445566',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        padding: '4px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
        transition: 'transform 0.2s',
        pointerEvents: 'auto' as const,
    },
    portraitContainer: {
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: '#111',
        border: '2px solid #667788',
        overflow: 'hidden',
        marginBottom: '5px',
        marginTop: '-20px', // Pop out top
        position: 'relative' as const,
        zIndex: 2
    },
    portraitImg: {
        width: '100%',
        height: '100%',
        objectFit: 'cover' as const,
        imageRendering: 'pixelated' as const // Keep pixel art sharp
    },
    infoContainer: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '2px'
    },
    nameMap: {
        color: '#fff',
        fontSize: '0.7rem',
        textAlign: 'center' as const,
        fontWeight: 'bold',
        textShadow: '0 0 2px black',
        marginBottom: '2px',
        whiteSpace: 'nowrap' as const,
        overflow: 'hidden',
        textOverflow: 'ellipsis'
    },
    barWrapper: {
        width: '100%',
        height: '6px',
        background: '#333',
        borderRadius: '3px',
        overflow: 'hidden',
        marginBottom: '2px',
        border: '1px solid black'
    },
    hpFill: (pct: number) => ({
        width: `${pct * 100}%`,
        height: '100%',
        background: 'linear-gradient(90deg, #00cc00, #44ff44)',
        transition: 'width 0.3s'
    }),
    bpFill: (pct: number) => ({
        width: `${pct * 100}%`,
        height: '100%',
        background: 'linear-gradient(90deg, #ddaa00, #ffee00)', // Yellow/Gold for Energy
        transition: 'width 0.3s'
    }),
    ultiGlow: {
        borderColor: '#ffee00',
        boxShadow: '0 0 15px rgba(255, 220, 0, 0.6)'
    }
};

export const PartyStatusMonitor: React.FC = () => {
    const party = useGameStore(s => s.party);
    const activeAttackerId = useGameStore(s => s.activeAttackerId);

    return (
        <div style={styles.container}>
            {party.map(member => {
                const s = member.battleState;
                const hpPct = 1.0; // Mock HP for now
                const bpPct = s.bp.current / s.bp.max;
                const isFullBp = s.bp.current >= s.bp.max;
                const isActing = member.id === activeAttackerId;

                // Determine border and shadow based on state priority
                let borderColor = '#445566';
                let boxShadow = '0 4px 10px rgba(0,0,0,0.5)';

                if (isFullBp) {
                    borderColor = '#ffee00';
                    boxShadow = '0 0 15px rgba(255, 220, 0, 0.6)';
                }

                if (isActing) {
                    borderColor = '#00ccff';
                    boxShadow = '0 0 15px #00ccff';
                }

                // Card Style with conditional Glow
                const cardStyle = {
                    ...styles.card,
                    border: `2px solid ${borderColor}`,
                    boxShadow: boxShadow,
                    transform: isActing ? 'scale(1.05)' : 'scale(1)',
                };

                return (
                    <div key={member.id} style={cardStyle} className="hero-card">
                        <div style={styles.portraitContainer}>
                            <img
                                src={getPortrait(member.job)}
                                alt={member.job}
                                style={styles.portraitImg}
                            />
                        </div>

                        <div style={styles.infoContainer}>
                            <div style={styles.nameMap}>{member.name}</div>

                            {/* HP Bar */}
                            <div style={styles.barWrapper}>
                                <div style={styles.hpFill(hpPct)} />
                            </div>

                            {/* BP Bar (Energy) */}
                            <div style={styles.barWrapper}>
                                <div style={styles.bpFill(bpPct)} />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
