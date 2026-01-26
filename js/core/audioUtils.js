import * as Tone from 'tone';
import { logKey, clearErrorLog } from '../ui/logger.js';

let audioStarted = false;

export async function ensureAudioStarted() {
    if (audioStarted) return true;
    try {
        await Tone.start();
        if (Tone.context && Tone.context.state === 'suspended') await Tone.context.resume();
        audioStarted = true;
        clearErrorLog('AUDIO');
        logKey('LOG_AUDIO_STARTED');
        return true;
    } catch (e) {
        logKey('LOG_AUDIO_START_FAIL', 'error', e);
        return false;
    }
}
