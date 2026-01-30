import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

export const BattleLog: React.FC = () => {
    const logs = useGameStore(s => s.logs);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new log
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div style={{
            position: 'absolute',
            bottom: '80px', // Above the "Advance" button area if any, or just bottom
            left: '50%',
            transform: 'translateX(-50%)',
            width: '90%',
            height: '150px',
            background: 'rgba(0, 0, 0, 0.6)',
            border: '2px solid #444',
            borderRadius: '8px',
            color: '#eee',
            fontFamily: 'monospace',
            fontSize: '14px',
            padding: '10px',
            overflowY: 'auto',
            zIndex: 100, // Below critical popups
            pointerEvents: 'none', // Allow clicks to pass through if necessary, but scroll needs events?
            // Actually if we want scroll, pointerEvents must be auto.
            // But user said "Auto scroll", so maybe pass through is better if it covers buttons?
            // For now, let's keep pointerEvents auto so they CAN scroll if they really want to check history.
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            boxShadow: '0 0 10px rgba(0,0,0,0.5)'
        }}>
            {logs.map((log, index) => (
                <div key={index} style={{
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    paddingBottom: '2px',
                    textShadow: '1px 1px 0 #000'
                }}>
                    {log}
                </div>
            ))}
            <div ref={scrollRef} />
        </div>
    );
};
