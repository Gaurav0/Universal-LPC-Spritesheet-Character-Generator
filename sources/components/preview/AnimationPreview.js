// Animation Preview component
import { state } from '../../state/state.js';
import { ANIMATIONS } from '../../state/constants.js';

export const AnimationPreview = {
	oninit: function(vnode) {
		vnode.state.selectedAnimation = 'walk';
		vnode.state.frameCycle = '';
	},
	oncreate: function(vnode) {
		// Wait for canvasRenderer to be available (module loads after this script)
		const initPreview = () => {
			if (window.canvasRenderer) {
				const previewCanvas = document.getElementById("previewAnimations");
				if (previewCanvas) {
					window.canvasRenderer.initPreviewCanvas(previewCanvas);
					// Set initial animation to 'walk' and get frame cycle
					const frames = window.canvasRenderer.setPreviewAnimation('walk');
					vnode.state.frameCycle = frames.join('-');
					window.canvasRenderer.startPreviewAnimation();

					m.redraw(); // Update view with frame cycle
				}
			} else {
				// Retry after a short delay
				setTimeout(initPreview, 50);
			}
		};
		initPreview();
	},
	onremove: function() {
		// Stop animation when component is removed
		if (window.canvasRenderer) {
			window.canvasRenderer.stopPreviewAnimation();
		}
	},
	view: function(vnode) {
		return m("div.box", [
			m("h3.title.is-5", "Animation Preview"),
			m("div.field.is-horizontal", [
				m("div.field-label.is-normal", [
					m("label.label", "Animation")
				]),
				m("div.field-body", [
					m("div.field", [
						m("div.control", [
							m("div.select", [
								m("select", {
									value: vnode.state.selectedAnimation,
									onchange: (e) => {
										vnode.state.selectedAnimation = e.target.value;
										if (window.canvasRenderer) {
											const frames = window.canvasRenderer.setPreviewAnimation(e.target.value);
											vnode.state.frameCycle = frames.join('-');
										}
									}
								}, ANIMATIONS.map(anim =>
									m("option", { value: anim.value }, anim.label)
								))
							])
						])
					]),
					m("div.field", [
						m("div.control", [
							m("code.tag.is-light.is-medium", vnode.state.frameCycle)
						])
					])
				])
			]),
			m("div.mt-3", [
				m("canvas#previewAnimations", { width: 256, height: 64 })
			])
		]);
	}
};
