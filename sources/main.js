// Main entry point - initializes and mounts the Mithril application

// Import canvas renderer
import * as canvasRenderer from './canvas/renderer.js';

// Import state management
import { initState, initHashChangeListener } from './state/state.js';

// Import components
import { App } from './components/App.js';
import { AnimationPreview } from './components/preview/AnimationPreview.js';

// Expose canvas renderer to global scope for compatibility
window.canvasRenderer = canvasRenderer;

// Expose initialization function to be called after canvas is ready
window.setDefaultSelections = function() {
	initState();
};

// Wait for canvas to be ready, then load Mithril app
document.addEventListener('DOMContentLoaded', () => {
	const canvas = document.getElementById("spritesheet");
	if (canvas) {
		canvasRenderer.initCanvas(canvas);

		// Set defaults after canvas is ready
		if (window.setDefaultSelections) {
			window.setDefaultSelections();
		}
	}

	// Initialize hash change listener
	initHashChangeListener();

	// Mount the components
	m.mount(document.getElementById("mithril-filters"), App);
	m.mount(document.getElementById("mithril-preview"), AnimationPreview);
});
