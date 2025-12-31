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
    currentADSR = { attack: a, decay: d, sustain: s, release: r };
    isSampler = samplerFlag;
    drawGraph();
}

/**
 * Triggers the playhead start (Note On).
 */
export function triggerAdsrOn() {
    playhead.startTime = performance.now() / 1000;
    playhead.state = 'attack';
    playhead.active = true;
}

/**
 * Triggers the playhead release (Note Off).
 */
export function triggerAdsrOff() {
    // If we are already idle or release, don't do anything
    if (playhead.state === 'idle') return;
    
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

    // --- Map Time to X (Normalized Visual Layout) ---
    const minVisualWidth = 0.18; // Each segment takes at least 18%
    const totalTime = Math.max(2, currentADSR.attack + currentADSR.decay + currentADSR.release + 0.5);
    
    // Calculate raw visual widths
    let vA = minVisualWidth + (currentADSR.attack / totalTime);
    let vD = minVisualWidth + (currentADSR.decay / totalTime);
    let vS = 0.2; // Constant visual width for sustain
    let vR = minVisualWidth + (currentADSR.release / totalTime);

    // Normalize so they sum to 1.0 (to fit exactly in the graph width)
    const totalV = vA + vD + vS + vR;
    vA /= totalV;
    vD /= totalV;
    vS /= totalV;
    vR /= totalV;

    const xA = padding + vA * graphW;
    const xD = xA + vD * graphW;
    const xS_end = xD + vS * graphW;
    const xR = xS_end + vR * graphW;

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
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    // Position labels in the middle of each segment
    ctx.fillText('A', padding + (xA - padding) / 2, h - 5);
    ctx.fillText('D', xA + (xD - xA) / 2, h - 5);
    ctx.fillText('S', xD + (xS_end - xD) / 2, h - 5);
    ctx.fillText('R', xS_end + (xR - xS_end) / 2, h - 5);

    // --- Playhead Logic ---
    if (playhead.active || playhead.state !== 'idle') {
        const now = performance.now() / 1000;
        let currentX, currentY;

        if (playhead.state !== 'release') {
            const elapsed = now - playhead.startTime;
            
            if (elapsed < currentADSR.attack) {
                playhead.state = 'attack';
                const ratio = currentADSR.attack > 0 ? elapsed / currentADSR.attack : 1;
                currentX = padding + ratio * (xA - padding);
                currentY = gainToY(ratio);
            } else if (elapsed < currentADSR.attack + currentADSR.decay) {
                playhead.state = 'decay';
                const segmentElapsed = elapsed - currentADSR.attack;
                const ratio = currentADSR.decay > 0 ? segmentElapsed / currentADSR.decay : 1;
                const currentGain = 1 - (1 - currentADSR.sustain) * ratio;
                currentX = xA + ratio * (xD - xA);
                currentY = gainToY(currentGain);
            } else {
                playhead.state = 'sustain';
                // Loop small movement in visual sustain area
                const sustainElapsed = now - (playhead.startTime + currentADSR.attack + currentADSR.decay);
                currentX = xD + ((sustainElapsed % 1) / 1) * (xS_end - xD);
                currentY = gainToY(currentADSR.sustain);
            }
        } else {
            // Release phase
            const elapsedSinceRelease = now - playhead.releaseTime;
            if (elapsedSinceRelease < currentADSR.release) {
                playhead.state = 'release';
                const ratio = currentADSR.release > 0 ? elapsedSinceRelease / currentADSR.release : 1;
                const currentGain = currentADSR.sustain * (1 - ratio);
                currentX = xS_end + ratio * (xR - xS_end);
                currentY = gainToY(currentGain);
            } else {
                playhead.state = 'idle';
                playhead.active = false;
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
