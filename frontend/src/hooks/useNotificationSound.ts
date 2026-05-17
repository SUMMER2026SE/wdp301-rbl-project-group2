import { useCallback, useRef } from 'react';

/**
 * Hook to play a notification sound when new orders arrive.
 * Uses Web Audio API — no external sound file needed.
 *
 * @example
 * ```tsx
 * const { playNotification } = useNotificationSound();
 * // When new order arrives:
 * playNotification();
 * ```
 */
export function useNotificationSound() {
    const audioCtxRef = useRef<AudioContext | null>(null);

    const getContext = () => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return audioCtxRef.current;
    };

    /**
     * Play a pleasant "ting!" notification sound.
     * Two-tone chime: C5 (523Hz) → E5 (659Hz)
     */
    const playNotification = useCallback(() => {
        try {
            const ctx = getContext();
            const now = ctx.currentTime;

            // First tone — C5
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(523.25, now); // C5
            gain1.gain.setValueAtTime(0.3, now);
            gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.3);

            // Second tone — E5 (slightly delayed)
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(659.25, now + 0.15); // E5
            gain2.gain.setValueAtTime(0.25, now + 0.15);
            gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.15);
            osc2.stop(now + 0.5);
        } catch (e) {
            console.warn('Notification sound failed:', e);
        }
    }, []);

    /**
     * Play an urgent alert sound for priority orders.
     * Three rapid notes: G5 → G5 → C6
     */
    const playUrgent = useCallback(() => {
        try {
            const ctx = getContext();
            const now = ctx.currentTime;
            const notes = [
                { freq: 783.99, start: 0, end: 0.12 },       // G5
                { freq: 783.99, start: 0.15, end: 0.27 },     // G5
                { freq: 1046.50, start: 0.30, end: 0.55 },    // C6
            ];

            notes.forEach(({ freq, start, end }) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + start);
                gain.gain.setValueAtTime(0.3, now + start);
                gain.gain.exponentialRampToValueAtTime(0.01, now + end);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + start);
                osc.stop(now + end);
            });
        } catch (e) {
            console.warn('Urgent sound failed:', e);
        }
    }, []);

    return { playNotification, playUrgent };
}
