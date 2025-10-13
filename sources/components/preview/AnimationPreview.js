// Animation Preview component
import { state } from '../../state/state.js';
import { ANIMATIONS } from '../../state/constants.js';
import { CollapsibleSection } from '../CollapsibleSection.js';

// Canvas wrapper component with its own lifecycle
const PreviewCanvas = {
	oncreate: function(vnode) {
		const canvas = vnode.dom;
		const selectedAnimation = vnode.attrs.selectedAnimation;
		const onFrameCycleUpdate = vnode.attrs.onFrameCycleUpdate;

		if (!window.canvasRenderer) {
			console.warn('Canvas renderer not available yet');
			return;
		}

		window.canvasRenderer.initPreviewCanvas(canvas);
		const frames = window.canvasRenderer.setPreviewAnimation(selectedAnimation);
		window.canvasRenderer.startPreviewAnimation();

		if (onFrameCycleUpdate) {
			onFrameCycleUpdate(frames.join('-'));
		}
	},
	onremove: function() {
		// Stop animation when canvas is removed from DOM
		if (window.canvasRenderer) {
			window.canvasRenderer.stopPreviewAnimation();
		}
	},
	view: function(vnode) {
		return m("canvas#previewAnimations", { width: 256, height: 64 });
	}
};

export const AnimationPreview = {
	oninit: function(vnode) {
		vnode.state.selectedAnimation = 'walk';
		vnode.state.frameCycle = '';
	},
	view: function(vnode) {
		return m(CollapsibleSection, {
			title: "Animation Preview",
			storageKey: "animation-preview",
			defaultOpen: true,
			boxClass: "box"
		}, [
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
				m(PreviewCanvas, {
					selectedAnimation: vnode.state.selectedAnimation,
					onFrameCycleUpdate: (frameCycle) => {
						vnode.state.frameCycle = frameCycle;
					}
				})
			])
		]);
	}
};
