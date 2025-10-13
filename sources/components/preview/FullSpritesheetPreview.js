// Full Spritesheet Preview component
import { state } from '../../state/state.js';
import { CollapsibleSection } from '../CollapsibleSection.js';

export const FullSpritesheetPreview = {
	oninit: function(vnode) {
		// Initialize spritesheet collapsed state from localStorage
		// localStorage returns strings, so 'true' becomes true, anything else (including null) becomes false
		const stored = localStorage.getItem('collapsed_spritesheet-preview');
		vnode.state.spritesheetCollapsed = stored === 'true';
	},
	oncreate: function(vnode) {
		// Set initial visibility
		const container = document.getElementById('spritesheet-container');
		if (container) {
			container.style.display = vnode.state.spritesheetCollapsed ? 'none' : 'block';
		}
	},
	onupdate: function(vnode) {
		// Update visibility when state changes
		const container = document.getElementById('spritesheet-container');
		if (container) {
			container.style.display = vnode.state.spritesheetCollapsed ? 'none' : 'block';
		}
	},
	view: function(vnode) {
		return m(CollapsibleSection, {
			title: "Full Spritesheet Preview",
			storageKey: "spritesheet-preview",
			defaultOpen: true,
			boxClass: "box mt-4",
			onToggle: (isCollapsed) => {
				vnode.state.spritesheetCollapsed = isCollapsed;
			}
		}, [
			m("div.is-flex.is-justify-content-space-between.is-align-items-center.mb-3", [
				m("p", "Click to zoom in (2x), double-click to zoom out"),
				m("label.checkbox", [
					m("input[type=checkbox]", {
						checked: state.showTransparencyGrid,
						onchange: (e) => {
							state.showTransparencyGrid = e.target.checked;
							if (window.canvasRenderer) {
								window.canvasRenderer.renderCharacter(state.selections, state.bodyType, state.showTransparencyGrid);
							}
						}
					}),
					" Show transparency grid"
				])
			])
		]);
	}
};
