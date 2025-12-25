// SynthBlockly - Main Application Entry Point
import { initLogger, log } from './ui/logger.js';
import { initResizer } from './ui/resizer.js';
import { audioEngine } from './core/audioEngine.js'; // Ensure window.audioEngine is set up early
import { initMidi } from './core/midiEngine.js';
import { initSerial } from './core/serialEngine.js';
import { initBlocklyManager } from './core/blocklyManager.js';
import { initUIManager } from './ui/uiManager.js';
import { initButtons } from './ui/buttons.js';
import { initKeyboardController } from './ui/keyboardController.js';
import { initVisualizer } from './ui/visualizer.js';
import { initHelpModal } from './ui/helpModal.js';
import { analyser, startAudioOnFirstInteraction } from './core/audioEngine.js'; // Import analyser and new function

// Initial logging as modules load
log("app.js loaded. Refactoring in progress...");
log("Logger module loaded.");
log("Audio Engine loaded. Window.audioEngine is now available.");

document.addEventListener('DOMContentLoaded', async () => {
    log("SynthBlockly DOM loaded. Ready to initialize modules.");
    initLogger();
    log("Logger initialized.");
    initResizer();
    log("Resizer initialized.");
    initMidi();
    log("MIDI Engine initialized.");
    initSerial();
    log("Serial Engine initialized.");
    
    // Initialize Blockly after all core engines are set up
    await initBlocklyManager();
    log("Blockly Manager initialized.");

    initUIManager();
    initButtons();
    initKeyboardController();
    log("Keyboard Controller initialized.");
    initVisualizer(analyser);
    log("Visualizer initialized.");
    initHelpModal();
    log("Help Modal initialized.");

    startAudioOnFirstInteraction(); // Start audio context on first interaction
    log("Audio context starter initialized.");
    
    // Other initializations will go here as modules are moved
});