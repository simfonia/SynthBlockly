// js/ui/buttons.js
import { log } from './logger.js';
import { audioEngine, ensureAudioStarted } from '../core/audioEngine.js';
import { getBlocksCode, resetWorkspaceAndAudio } from '../core/blocklyManager.js'; // Import resetWorkspaceAndAudio
import * as Blockly from 'blockly'; // Import Blockly

// New function to encapsulate run logic
async function runBlocksAction() {
    const ok = await ensureAudioStarted();
    if (!ok) return;
    const code = await getBlocksCode();
    if (!code) { log('沒有程式碼可執行'); return; }
    log('執行積木程式碼...');
    log('--- 產生的程式碼 START ---');
    log(code);
    log('--- 產生的程式碼 END ---');
    try {
        const runner = new Function(`(async () => { ${code} })();`);
        runner();
        log('程式執行完畢');
    } catch (e) {
        console.error('RunBlocks execution error', e);
        log('執行積木程式發生錯誤: ' + e);
    }
}

/**
 * Initializes all button event listeners.
 */
export function initButtons() {
    // Panic Stop Button
    const btnPanicStop = document.getElementById('btnPanicStop');
    if (btnPanicStop) {
        btnPanicStop.addEventListener('click', () => {
            audioEngine.panicStopAllSounds();
        });
    }

    // Test Note Button
    document.getElementById('btnTestNote').addEventListener('click', async () => {
        const ok = await ensureAudioStarted();
        if (ok) audioEngine.synth.triggerAttackRelease('A4', '8n'); // Using audioEngine.synth
    });

    // Run Blocks Button - now calls runBlocksAction()
    const runBtn = document.getElementById('btnRunBlocks');
    if (runBtn) {
        runBtn.addEventListener('click', runBlocksAction); // Use the new function
    }

    // Add hotkey listener for Ctrl+Enter (or Cmd+Enter)
    document.addEventListener('keydown', (event) => {
        // Check for Ctrl (Windows/Linux) or Meta (Mac Cmd) and Enter key
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault(); // Prevent default browser action (e.g., new line)
            runBlocksAction();
        }
    });

    // Export Code Button
    const exportBtn = document.getElementById('btnExportCode');
    const codeOut = document.getElementById('codeOut');
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            const code = await getBlocksCode(); // Using getBlocksCode from blocklyManager
            if (!code) { log('沒有程式碼可匯出'); return; }
            codeOut.style.display = 'block';
            codeOut.innerText = code;
            try { await navigator.clipboard.writeText(code); log('程式碼已複製到剪貼簿'); } catch (e) { log('複製失敗: ' + e); }
            try {
                const blob = new Blob([code], { type: 'text/javascript' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const ts = new Date().toISOString().replace(/[:.]/g, '-');
                a.href = url;
                a.download = `blockly_export_${ts}.js`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                log('已下載 blockly_export_*.js');
            } catch (e) { log('下載失敗: ' + e); }
        });
    }

    // Save Workspace to XML Button
    const saveXmlBtn = document.getElementById('btnSaveXml');
    if (saveXmlBtn) {
        saveXmlBtn.addEventListener('click', () => {
            // workspace is not directly available here, need to get it from blocklyManager or global Blockly
            const workspace = Blockly.getMainWorkspace();
            if (!workspace) {
                log('Workspace not ready.');
                return;
            }
            try {
                const xml = Blockly.Xml.workspaceToDom(workspace);
                const xmlText = Blockly.Xml.domToText(xml);

                const blob = new Blob([xmlText], { type: 'text/xml' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const ts = new Date().toISOString().replace(/[:.]/g, '-');
                a.href = url;
                a.download = `synthblockly_workspace_${ts}.xml`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                log('Workspace saved to XML file.');
            } catch (e) {
                log('Error saving workspace: ' + e);
                console.error('Error saving workspace', e);
            }
        });
    }

    // Load Workspace from XML Button
    const loadXmlBtn = document.getElementById('btnLoadXml');
    if (loadXmlBtn) {
        loadXmlBtn.addEventListener('click', () => {
            // workspace is not directly available here, need to get it from blocklyManager or global Blockly
            const workspace = Blockly.getMainWorkspace();
            if (!workspace) {
                log('Workspace not ready.');
                return;
            }
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.xml,text/xml';
            input.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (!file) {
                    return;
                }
                const reader = new FileReader();
                reader.onload = (e) => {
                    const xmlText = e.target.result;
                    try {
                        resetWorkspaceAndAudio(); // Call the new reset function
                        const xml = Blockly.utils.xml.textToDom(xmlText);
                        Blockly.Xml.domToWorkspace(xml, workspace);
                        log(`Workspace loaded from ${file.name}`);
                    } catch (err) {
                        log(`Error loading workspace: ${err}`);
                        console.error('Error loading workspace', err);
                    }
                };
                reader.readAsText(file);
            });
            input.click();
        });
    }

    // New Project Button
    const btnNewProject = document.getElementById('btnNewProject');
    if (btnNewProject) {
        btnNewProject.addEventListener('click', () => {
            if (confirm('確定要開新專案嗎？現有的程式碼將會被清除。')) {
                resetWorkspaceAndAudio();
                log('✓ 已開新專案，工作區已清除。');
            }
        });
    }
    // New: Oscilloscope Amplitude Slider
    const amplitudeSlider = document.getElementById('amplitudeSlider');
    if (amplitudeSlider) {
        amplitudeSlider.addEventListener('input', (event) => {
            const newScale = parseFloat(event.target.value);
            if (typeof newScale === 'number') {
                window.visualizerScale = newScale;
                log(`示波器振幅縮放設定為: ${newScale.toFixed(1)}x`);
            }
            // Release focus from the slider so keyboard events can be captured again
            event.target.blur();
        });
    }

    // New: Oscilloscope Horizontal Zoom Slider
    const zoomSlider = document.getElementById('zoomSlider');
    if (zoomSlider) {
        const zoomLevels = [4096, 2048, 1024, 512, 256]; // Power-of-2 sizes, reversed for 'right is zoom in'
        
        // Update in real-time while sliding
        zoomSlider.addEventListener('input', (event) => {
            const levelIndex = parseInt(event.target.value, 10);
            const newSize = zoomLevels[levelIndex];

            if (window.audioEngine && window.audioEngine.analyser && window.audioEngine.analyser.size !== newSize) {
                window.audioEngine.analyser.size = newSize;
                log(`示波器時間縮放設定為: ${newSize} 點`);
            }
        });

        // Release focus when done sliding
        zoomSlider.addEventListener('change', (event) => {
            event.target.blur();
        });
    }

    log("Button event listeners initialized.");
}
