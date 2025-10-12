// Main app component
import { state, syncSelectionsToHash } from '../state/state.js';
import { Download } from './download/Download.js';
import { FiltersPanel } from './FiltersPanel.js';
import { Credits } from './download/Credits.js';

export const App = {
	oninit: function(vnode) {
		// Track previous state to detect changes
		vnode.state.prevSelections = JSON.stringify(state.selections);
		vnode.state.prevBodyType = state.bodyType;
	},
	onupdate: function(vnode) {
		// Only sync hash and render canvas if selections or bodyType changed
		const currentSelections = JSON.stringify(state.selections);
		const currentBodyType = state.bodyType;

		if (currentSelections !== vnode.state.prevSelections || currentBodyType !== vnode.state.prevBodyType) {
			syncSelectionsToHash();
			if (window.canvasRenderer) {
				window.canvasRenderer.renderCharacter(state.selections, state.bodyType, state.showTransparencyGrid);
			}

			// Update tracked state
			vnode.state.prevSelections = currentSelections;
			vnode.state.prevBodyType = currentBodyType;
		}
	},
	view: function() {
		return m("div", [
			m(Download),
			m(FiltersPanel),
			m(Credits)
		]);
	}
};
