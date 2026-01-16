// js/ui/spectrumVisualizer.js
import { audioEngine } from '../core/audioEngine.js';

let canvas, ctx;
let isRunning = false;

export function initSpectrumVisualizer() {
    const container = document.getElementById('spectrumContainer');
    if (!container) return;

    canvas = document.createElement('canvas');
    canvas.id = 'spectrumCanvas';
    container.appendChild(canvas);
    ctx = canvas.getContext('2d');

    // Handle resizing
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    isRunning = true;
    requestAnimationFrame(drawLoop);
}

function resizeCanvas() {
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}

function drawLoop() {
    if (!isRunning) return;
    drawSpectrum();
    requestAnimationFrame(drawLoop);
}

function drawSpectrum() {
    if (!ctx || !audioEngine.fftAnalyser) return;

    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;
    
    // Get Frequency Data (Decibels)
    // The range is typically -100dB to 0dB
    const values = audioEngine.fftAnalyser.getValue();
    const binCount = values.length;
    const barWidth = w / binCount;

    ctx.clearRect(0, 0, w, h);

    // Draw Grid
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // 3 horizontal lines (-25dB, -50dB, -75dB approx)
    for (let i = 1; i < 4; i++) {
        const y = (h * i) / 4;
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
    }
    ctx.stroke();

    // Draw Bars
    ctx.fillStyle = '#2196F3'; // Blue bars
    
    for (let i = 0; i < binCount; i++) {
        const val = values[i]; 
        // Map dB (-100 to 0) to height (0 to h)
        // val is usually -Infinity if silent, or between -100 and 0
        if (val === -Infinity) continue;

        const dbRange = 100;
        const normalized = (val + dbRange) / dbRange; // 0.0 to 1.0
        const barHeight = Math.max(0, normalized * h);

        const x = i * barWidth;
        const y = h - barHeight;

        // Draw individual bar
        // Add a little gap (1px) between bars if width allows
        const drawW = barWidth > 2 ? barWidth - 1 : barWidth;
        
        // Gradient color based on height/intensity
        // Low: Blue, Mid: Purple, High: Red
        const hue = 240 - (normalized * 240); // 240(Blue) -> 0(Red)
        ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;

        ctx.fillRect(x, y, drawW, barHeight);
    }
}
