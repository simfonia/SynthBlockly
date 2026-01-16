// js/ui/adsrVisualizer.js

let canvas, ctx;
let currentADSR = { attack: 0.01, decay: 0.1, sustain: 0.5, release: 1.0 };
let isSampler = false;
let playhead = {
    active: false,
    startTime: 0,
    releaseTime: 0,
    state: 'idle', // 'attack', 'decay', 'sustain', 'release', 'idle'
};

/**
 * Initializes the ADSR visualizer.
 */
export function initAdsrVisualizer() {
    const container = document.getElementById('adsrContainer');
    if (!container) return;

    canvas = document.createElement('canvas');
    canvas.id = 'adsrCanvas';
    container.appendChild(canvas);
    ctx = canvas.getContext('2d');

    // Handle resizing
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Start animation loop for the playhead
    requestAnimationFrame(updatePlayhead);
}

function resizeCanvas() {
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    drawGraph();
}

/**
 * Updates the graph with new ADSR values.
 */
export function updateAdsrGraph(a, d, s, r, samplerFlag = false) {
    currentADSR = { 
        attack: Number(a) || 0.001, 
        decay: Number(d) || 0.001, 
        sustain: Number(s) || 0, 
        release: Number(r) || 0.001 
    };
    isSampler = samplerFlag;
    drawGraph();
}

/**
 * Triggers the playhead start (Note On).
 * @returns {number} The unique ID for this note event.
 */
export function triggerAdsrOn() {
    playhead.startTime = performance.now() / 1000;
    playhead.state = 'attack';
    playhead.active = true;
    playhead.releaseTime = 0; // Reset release time
    playhead.noteId = (playhead.noteId || 0) + 1; // Generate new ID
    return playhead.noteId;
}

/**
 * Triggers the playhead release (Note Off).
 * @param {number} [noteId] - Optional ID to match against the current note.
 */
export function triggerAdsrOff(noteId) {
    // If we are already idle or release, don't do anything
    if (playhead.state === 'idle') return;
    
    // If a specific noteId is provided, only release if it matches the current one
    if (noteId !== undefined && noteId !== playhead.noteId) return;

    playhead.releaseTime = performance.now() / 1000;
    playhead.state = 'release';
}

function updatePlayhead() {
    if (playhead.active || playhead.state !== 'idle') {
        drawGraph();
    }
    requestAnimationFrame(updatePlayhead);
}

function drawGraph() {
    if (!ctx) return;

    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;
    const padding = 20;
    const graphW = w - padding * 2;
    const graphH = h - padding * 2;

    ctx.clearRect(0, 0, w, h);

    // --- Grid / Background ---
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
        const y = padding + (graphH * i) / 4;
        ctx.moveTo(padding, y);
        ctx.lineTo(w - padding, y);
    }
    ctx.stroke();

    // --- Map Time to X (Linear Time Mapping) ---
    // Reference from #processing logic (media/generators/visual.js)
    // Sustain is visually represented as 0.5s duration relative to others
    const sustainVisualDuration = 0.5; 
    const totalTime = currentADSR.attack + currentADSR.decay + currentADSR.release + sustainVisualDuration;
    
    // Calculate X coordinates based on time proportion
    // Note: padding is the start X
    const availableWidth = graphW;
    
    const widthA = (currentADSR.attack / totalTime) * availableWidth;
    const widthD = (currentADSR.decay / totalTime) * availableWidth;
    const widthS = (sustainVisualDuration / totalTime) * availableWidth;
    const widthR = (currentADSR.release / totalTime) * availableWidth;

    const xA = padding + widthA;
    const xD = xA + widthD;
    const xS_end = xD + widthS;
    const xR = xS_end + widthR;

    const gainToY = (g) => padding + graphH * (1 - g);

    // --- Draw Segments ---
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';

    // 1. Attack
    ctx.beginPath();
    ctx.strokeStyle = isSampler ? '#ccc' : '#4CAF50'; 
    ctx.moveTo(padding, gainToY(0));
    ctx.lineTo(xA, gainToY(1));
    ctx.stroke();

    // 2. Decay
    ctx.beginPath();
    ctx.strokeStyle = isSampler ? '#ddd' : '#FF9800'; 
    ctx.moveTo(xA, gainToY(1));
    ctx.lineTo(xD, gainToY(currentADSR.sustain));
    ctx.stroke();

    // 3. Sustain
    ctx.beginPath();
    ctx.strokeStyle = isSampler ? '#eee' : '#2196F3'; 
    ctx.moveTo(xD, gainToY(currentADSR.sustain));
    ctx.lineTo(xS_end, gainToY(currentADSR.sustain));
    ctx.stroke();

    // 4. Release
    ctx.beginPath();
    ctx.strokeStyle = '#f44336'; 
    ctx.moveTo(xS_end, gainToY(currentADSR.sustain));
    ctx.lineTo(xR, gainToY(0));
    ctx.stroke();

    // --- Labels ---
    ctx.fillStyle = '#999';
    ctx.font = 'bold 10px Arial'; // Slightly smaller font
    ctx.textAlign = 'center';
    
    // Only draw labels if the segment is wide enough to be legible
    const minLabelWidth = 8; // Lower threshold
    if (widthA > minLabelWidth) ctx.fillText('A', padding + widthA / 2, h - 5);
    if (widthD > minLabelWidth) ctx.fillText('D', xA + widthD / 2, h - 5);
    if (widthS > minLabelWidth) ctx.fillText('S', xD + widthS / 2, h - 5);
    if (widthR > minLabelWidth) ctx.fillText('R', xS_end + widthR / 2, h - 5);

    // --- Playhead Logic ---
    if (playhead.active || playhead.state !== 'idle') {
        const now = performance.now() / 1000;
        let currentX, currentY;

        if (playhead.state !== 'release') {
            const elapsed = now - playhead.startTime;
            
            if (elapsed < currentADSR.attack) {
                playhead.state = 'attack';
                // Handle A=0 case safely
                const ratio = currentADSR.attack > 0 ? elapsed / currentADSR.attack : 1;
                currentX = padding + ratio * widthA;
                currentY = gainToY(ratio);
            } else if (elapsed < currentADSR.attack + currentADSR.decay) {
                playhead.state = 'decay';
                const segmentElapsed = elapsed - currentADSR.attack;
                const ratio = currentADSR.decay > 0 ? segmentElapsed / currentADSR.decay : 1;
                const currentGain = 1 - (1 - currentADSR.sustain) * ratio;
                currentX = xA + ratio * widthD;
                currentY = gainToY(currentGain);
            } else {
                playhead.state = 'sustain';
                // Loop movement in visual sustain area
                const sustainElapsed = now - (playhead.startTime + currentADSR.attack + currentADSR.decay);
                // Map sustain loop to the visual width of S block
                currentX = xD + ((sustainElapsed % sustainVisualDuration) / sustainVisualDuration) * widthS;
                currentY = gainToY(currentADSR.sustain);
            }
        } else {
            // Release phase
            const elapsedSinceRelease = now - playhead.releaseTime;
            if (elapsedSinceRelease < currentADSR.release) {
                playhead.state = 'release';
                const ratio = currentADSR.release > 0 ? elapsedSinceRelease / currentADSR.release : 1;
                const currentGain = currentADSR.sustain * (1 - ratio);
                currentX = xS_end + ratio * widthR;
                currentY = gainToY(currentGain);
            } else {
                playhead.state = 'idle';
                playhead.active = false;
                // Snap to end
                currentX = xR;
                currentY = gainToY(0);
            }
        }

        if (currentX !== undefined) {
            // Draw Glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#FE2F89';
            ctx.fillStyle = '#FE2F89';
            ctx.beginPath();
            ctx.arc(currentX, currentY, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0; // Reset
        }
    }
}
