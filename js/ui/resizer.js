// js/ui/resizer.js
import * as Blockly from 'blockly';

let isHResizing = false;

function onHMouseMove(e) {
  if (!isHResizing) return;
  const container = document.getElementById('container');
  const leftPanel = document.getElementById('left');
  const hResizer = document.getElementById('h-resizer');

  if (!container || !leftPanel || !hResizer) return;

  const containerWidth = container.offsetWidth;
  let newLeftWidth = e.clientX - container.getBoundingClientRect().left;

  const minWidth = 150; // Minimum width for left and right panels
  if (newLeftWidth < minWidth) newLeftWidth = minWidth;
  if (containerWidth - newLeftWidth - hResizer.offsetWidth < minWidth) {
    newLeftWidth = containerWidth - minWidth - hResizer.offsetWidth;
  }

  leftPanel.style.flexBasis = `${newLeftWidth}px`;
  
  // Let Blockly (and p5) know that a resize happened.
  // Blockly's injection process should handle listening for this.
  window.dispatchEvent(new Event('resize'));
}

function onHMouseUp() {
  isHResizing = false;
  document.removeEventListener('mousemove', onHMouseMove);
  document.removeEventListener('mouseup', onHMouseUp);
}

export function initResizer() {
  const hResizer = document.getElementById('h-resizer');
  if (!hResizer) return;

  hResizer.addEventListener('mousedown', (e) => {
    isHResizing = true;
    document.addEventListener('mousemove', onHMouseMove);
    document.addEventListener('mouseup', onHMouseUp);
    e.preventDefault();
  });

  // This is a generic resize handler for Blockly, it's fine to have it here.
  // It ensures Blockly redraws itself when the window resizes.
  window.addEventListener('resize', () => {
    // A more robust way to get the workspace without relying on a global variable.
    const workspace = Blockly.getMainWorkspace();
    if (workspace) { // Check if workspace exists before calling svgResize
        Blockly.svgResize(workspace);
    }
  });
}
