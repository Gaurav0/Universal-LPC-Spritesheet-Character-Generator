// Full Spritesheet Preview component
import { state } from '../../state/state.js';
import { CollapsibleSection } from '../CollapsibleSection.js';

export const FullSpritesheetPreview = {
	oninit: function(vnode) {
		// Initialize spritesheet collapsed state from localStorage
		// localStorage returns strings, so 'true' becomes true, anything else (including null) becomes false
		const stored = localStorage.getItem('collapsed_spritesheet-preview');
		vnode.state.spritesheetCollapsed = stored === 'true';

		// Initialize zoom level to 1 (100%)
		vnode.state.zoomLevel = 1;
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
			m("div.columns.is-mobile.is-variable.is-1", [
				// Transparency grid column
				m("div.column.is-narrow.is-flex.is-align-items-center", [
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
				]),
				// Zoom column
				m("div.column", [
					m("div.field.is-horizontal.is-align-items-center", [
						m("div.field-label.is-normal", [
							m("label.label.mb-0", `Zoom: ${Math.round(vnode.state.zoomLevel * 100)}%`)
						]),
						m("div.field-body", [
							m("div.field.mb-0", [
								m("div.control.is-expanded", [
									m("input.is-fullwidth[type=range]", {
										min: 0.5,
										max: 2,
										step: 0.1,
										value: vnode.state.zoomLevel,
										oninput: (e) => {
											vnode.state.zoomLevel = parseFloat(e.target.value);
											if (window.canvasRenderer && window.canvasRenderer.setCanvasZoom) {
												window.canvasRenderer.setCanvasZoom(vnode.state.zoomLevel);
											}
										}
									})
								])
							])
						])
					])
				])
			])
		]);
	}
};
