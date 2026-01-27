import React from 'react';
import { useGameStore } from '../store/gameStore';

// Style constants hoisted outside component to prevent re-creation
const styles = {
    container: {
        display: 'flex',
        flexDirection: 'row' as const, // Horizontal Stack
        justifyContent: 'space-between',
        background: 'rgba(0, 5, 10, 0.85)',
        padding: '5px',
        width: '100%',
        height: '100px', // Fixed height for bottom bar
        fontFamily: '"Courier New", monospace',
        borderTop: '2px solid #004400',
        gap: '10px'
    },
    panel: {
        flex: 1,
        background: 'rgba(0, 0, 0, 0.5)',
        border: '1px solid #336633',
        padding: '4px',
        fontSize: '0.75rem',
        color: '#aaffaa',
        display: 'flex',
        flexDirection: 'column' as const,
        borderRadius: '3px'
    },
    header: {
        borderBottom: '1px solid #335533',
        marginBottom: '2px',
        fontWeight: 'bold',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.8rem'
    },
    row: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '2px'
    },
    barContainer: {
        background: '#002200',
        height: '8px',
        width: '100%',
        marginTop: '2px',
        borderRadius: '2px',
        overflow: 'hidden'
    },
    barFill: (pct: number, color: string) => ({
        background: color,
        height: '100%',
        width: `${pct * 100}%`,
        transition: 'width 0.2s',
        borderRadius: '1px'
    }),
    artName: {
        color: '#ffff00',
        fontSize: '0.8rem',
        whiteSpace: 'nowrap' as const,
        overflow: 'hidden',
        textOverflow: 'ellipsis'
    },
    penalty: {
        color: '#ff5555',
        fontSize: '0.7rem'
    }
};

export const PartyStatusMonitor: React.FC = () => {
    const party = useGameStore(s => s.party);

    return (
        <div style={styles.container}>
            {party.map(member => {
                const s = member.battleState;

                // Calculate Penalty status for display
                const lastMove = s.history[s.history.length - 1];
                const isSpamming = lastMove && lastMove.skillId === member.currentArtId;

                return (
                    <div key={member.id} style={styles.panel}>
                        <div style={styles.header}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.9rem' }}>{member.name}</span>
                                <span style={{ fontSize: '0.65rem', color: '#88cc88' }}>{member.job}</span>
                            </div>
                            <div style={{ fontSize: '0.7rem', alignSelf: 'center' }}>HP:100%</div>
                        </div>

                        {/* BP Row */}
                        <div style={styles.row}>
                            <span>BP</span>
                            <span>{s.bp.current}/{s.bp.max}</span>
                        </div>
                        <div style={styles.barContainer}>
                            <div style={styles.barFill(s.bp.current / s.bp.max, '#00ccff')} />
                        </div>

                        {/* Charges/CD Status (Simplified) */}
                        <div style={{ marginTop: 'auto' }}>
                            {isSpamming && <div style={styles.penalty}>⚠️ REPEAT PENALTY</div>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
