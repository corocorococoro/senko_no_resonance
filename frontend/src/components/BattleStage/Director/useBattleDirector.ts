import { useState, useEffect, useCallback } from 'react';
import type { ScriptEvent } from '../../../logic/battle/types';

export function useBattleDirector() {
    const [queue, setQueue] = useState<ScriptEvent[]>([]);
    const [currentEvent, setCurrentEvent] = useState<ScriptEvent | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Playback control
    const playScript = useCallback((script: ScriptEvent[]) => {
        setQueue(script);
        setIsPlaying(true);
    }, []);

    const nextEvent = useCallback(() => {
        setQueue(prev => {
            if (prev.length === 0) {
                setIsPlaying(false);
                setCurrentEvent(null);
                return [];
            }
            const [next, ...rest] = prev;
            setCurrentEvent(next);
            return rest;
        });
    }, []);

    // Auto-advance logic for timed events (WAIT)
    useEffect(() => {
        if (!currentEvent) {
            if (queue.length > 0 && isPlaying) {
                nextEvent();
            } else if (queue.length === 0 && isPlaying) {
                // End of script
                setIsPlaying(false);
            }
            return;
        }

        if (currentEvent.type === 'WAIT') {
            const ms = currentEvent.ms || 0;
            const timer = setTimeout(() => {
                nextEvent();
            }, ms);
            return () => clearTimeout(timer);
        }

        // For non-timed events (ANIMATION, CUT_IN_START), 
        // the Visual Component must call nextEvent() manually when done!
    }, [currentEvent, queue, isPlaying, nextEvent]);

    return {
        currentEvent,
        isPlaying,
        playScript,
        nextEvent // Exported so Visuals can trigger "Done"
    };
}
