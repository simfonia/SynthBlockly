// SynthBlockly - Main Application Entry Point
import { initLogger, log, logKey } from './ui/logger.js';
import { initResizer } from './ui/resizer.js';
import { audioEngine } from './core/audioEngine.js'; // Ensure window.audioEngine is set up early
import { initMidi } from './core/midiEngine.js';
import { initSerial } from './core/serialEngine.js';
import { initBlocklyManager } from './core/blocklyManager.js';
import { initUIManager } from './ui/uiManager.js';
import { initButtons } from './ui/buttons.js';
import { initKeyboardController } from './ui/keyboardController.js';
import { initVisualizer } from './ui/visualizer.js';
import { initAdsrVisualizer } from './ui/adsrVisualizer.js';
import { initSpectrumVisualizer } from './ui/spectrumVisualizer.js';
import { analyser, startAudioOnFirstInteraction } from './core/audioEngine.js'; // Import analyser and new function

// Initial logging as modules load
log("app.js loaded. Refactoring in progress...");
log("Logger module loaded.");
log("Audio Engine loaded. Window.audioEngine is now available.");

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Logger UI
    initLogger();

    // 2. Initialize Blockly Manager first to load languages (Blockly.Msg)
    await initBlocklyManager();
    
    // 3. Initialize Core Instruments (Now safe to log keys)
    audioEngine.initCoreInstruments();

    // 4. Now it's safe to use logKey
    logKey("LOG_DOM_LOADED");
    logKey("LOG_LOGGER_INIT");
    
    initResizer();
    logKey("LOG_RESIZER_INIT");
    
    initMidi();
    logKey("LOG_MIDI_INIT");
    
    initSerial();
    logKey("LOG_SERIAL_INIT");
    
    logKey("LOG_BLOCKLY_MGR_INIT");

    initUIManager();
    initButtons();
    initKeyboardController();
    logKey("LOG_KEYBOARD_CTRL_INIT");
    initVisualizer(analyser);
    logKey("LOG_VISUALIZER_INIT");
    initAdsrVisualizer();
    initSpectrumVisualizer();

    startAudioOnFirstInteraction();
    logKey("LOG_AUDIO_STARTER_INIT");
});