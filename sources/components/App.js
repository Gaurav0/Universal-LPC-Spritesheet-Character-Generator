// Main app component
import { state, syncSelectionsToHash } from '../state/state.js';
import { Download } from './download/Download.js';
import { FiltersPanel } from './FiltersPanel.js';
import { Credits } from './download/Credits.js';
import { AdvancedTools } from './advanced/AdvancedTools.js';

export const App = {
	oninit: function(vnode) {
		// Track previous state to detect changes
		vnode.state.prevSelections = JSON.stringify(state.selections);
		vnode.state.prevBodyType = state.bodyType;
		vnode.state.prevCustomImage = state.customUploadedImage;
		vnode.state.prevCustomZPos = state.customImageZPos;
	},
	onupdate: function(vnode) {
		// Only sync hash and render canvas if selections, bodyType, or custom image changed
		const currentSelections = JSON.stringify(state.selections);
		const currentBodyType = state.bodyType;
		const currentCustomImage = state.customUploadedImage;
		const currentCustomZPos = state.customImageZPos;

		if (currentSelections !== vnode.state.prevSelections ||
		    currentBodyType !== vnode.state.prevBodyType ||
		    currentCustomImage !== vnode.state.prevCustomImage ||
		    currentCustomZPos !== vnode.state.prevCustomZPos) {
			syncSelectionsToHash();
			if (window.canvasRenderer) {
				window.canvasRenderer.renderCharacter(state.selections, state.bodyType, state.showTransparencyGrid);
			}

			// Update tracked state
			vnode.state.prevSelections = currentSelections;
			vnode.state.prevBodyType = currentBodyType;
			vnode.state.prevCustomImage = currentCustomImage;
			vnode.state.prevCustomZPos = currentCustomZPos;
		}
	},
	view: function() {
		return m("div", [
			m(Download),
			m(FiltersPanel),
			m(Credits),
			m(AdvancedTools)
		]);
	}
};
