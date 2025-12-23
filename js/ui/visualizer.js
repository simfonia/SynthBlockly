// js/ui/visualizer.js
import p5 from 'p5';

// Define a global scale factor for the visualizer
window.visualizerScale = 1.0;

/**
 * Initializes the p5.js waveform visualizer.
 * @param {Tone.Analyser} analyserNode - The Tone.js analyser node to visualize.
 */
export function initVisualizer(analyserNode) {
  if (!analyserNode) {
    console.error("Visualizer initialization failed: Analyser node is missing.");
    return;
  }

  // p5 is now imported, no need for global check

  new p5((p) => {
    p.setup = function () {
        const container = p.select('#waveformContainer');
        const c = p.createCanvas(container.width, container.height);
        c.parent('waveformContainer');
    };

    p.windowResized = function () {
        const container = p.select('#waveformContainer');
        p.resizeCanvas(container.width, container.height);
    };

    p.draw = function () {
        p.background(16);
        p.stroke(0, 200, 255);
        p.strokeWeight(2);
        
        const vals = analyserNode.getValue();
        if (!vals) return;

        const h = p.height;
        const w = p.width;

        // --- Phase 1: Find the main peak to get a stable reference point ---
        let maxVal = -1.0;
        let maxIndex = 0;
        for (let i = 0; i < vals.length; i++) {
            if (vals[i] > maxVal) {
                maxVal = vals[i];
                maxIndex = i;
            }
        }

        // --- Phase 2: Find the positive-going zero-crossing *before* the peak ---
        const TRIGGER_THRESHOLD = 0.01;
        let triggerIndex = 0;
        for (let i = maxIndex; i >= 1; i--) {
            // Find where the wave crosses the threshold going up
            if (vals[i-1] < TRIGGER_THRESHOLD && vals[i] >= TRIGGER_THRESHOLD) {
                triggerIndex = i;
                break;
            }
        }

        // --- Phase 3: Sub-sample interpolation for perfect phase alignment ---
        let fractionalOffset = 0;
        if (triggerIndex > 0 && triggerIndex < vals.length) {
            const y0 = vals[triggerIndex - 1];
            const y1 = vals[triggerIndex];
            if (y1 !== y0) {
                // How far into the sample the threshold-crossing occurs
                const crossFraction = (TRIGGER_THRESHOLD - y0) / (y1 - y0);
                const sampleWidthPx = w / (vals.length - 1);
                fractionalOffset = crossFraction * sampleWidthPx;
            }
        }

        // --- Phase 4: Draw with sub-pixel offset correction ---
        for (let i = 1; i < vals.length; i++) {
            const prevDataIndex = (triggerIndex + i - 1) % vals.length;
            const currDataIndex = (triggerIndex + i) % vals.length;

            if (currDataIndex < prevDataIndex) {
                continue; // Skip drawing the wrap-around line
            }
            
            const x1 = p.map(i - 1, 0, vals.length - 1, 0, w) - fractionalOffset;
            const x2 = p.map(i, 0, vals.length - 1, 0, w) - fractionalOffset;

            const y1_scaled = p.constrain(vals[prevDataIndex] * window.visualizerScale, -1, 1);
            const y2_scaled = p.constrain(vals[currDataIndex] * window.visualizerScale, -1, 1);

            const y1 = p.map(y1_scaled, -1, 1, h, 0);
            const y2 = p.map(y2_scaled, -1, 1, h, 0);
            
            p.line(x1, y1, x2, y2);
        }
    };
  });
}
