// js/ui/visualizer.js

/**
 * Initializes the p5.js waveform visualizer.
 * @param {Tone.Analyser} analyserNode - The Tone.js analyser node to visualize.
 */
export function initVisualizer(analyserNode) {
  if (!analyserNode) {
    console.error("Visualizer initialization failed: Analyser node is missing.");
    return;
  }

  // Ensure p5 is loaded globally
  if (typeof p5 === 'undefined') {
    console.error("Visualizer initialization failed: p5.js not loaded.");
    return;
  }

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
        p.noFill();
        p.stroke(0, 200, 255);
        p.strokeWeight(2);
        
        const vals = analyserNode.getValue();
        if (!vals) return;

        const h = p.height;
        const w = p.width;

        p.beginShape();
        for (let i = 0; i < vals.length; i++) {
            const x = p.map(i, 0, vals.length, 0, w);
            const y = p.map(vals[i], -1, 1, h, 0);
            p.vertex(x, y);
        }
        p.endShape();
    };
  });
}
