// Mithril-based character generator
// Clean rewrite without jQuery dependencies

// Global state
const state = {
	selections: {}, // key: category path, value: { itemId, name }
	bodyType: "male" // male, female, teen, child, muscular, pregnant
};

// Helper function to capitalize strings for display
function capitalize(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

// Item with variants component
const ItemWithVariants = {
	oninit: function(vnode) {
		vnode.state.expanded = false;
	},
	view: function(vnode) {
		const { itemId, meta, categoryPath } = vnode.attrs;
		const isExpanded = vnode.state.expanded;
		const displayName = meta.name;

		return m("div", { style: "padding-left: 1.5rem;" }, [
			m("div.tree-label", {
				onclick: () => {
					vnode.state.expanded = !vnode.state.expanded;
				}
			}, [
				m("span.tree-arrow", { class: isExpanded ? 'expanded' : 'collapsed' }),
				m("span", displayName)
			]),
			isExpanded ? m("div.tree-node",
				meta.variants.map(variant => {
					const isSelected = state.selections[categoryPath]?.variant === variant;
					const variantDisplayName = variant.replaceAll("_", " ");

					return m("div", {
						key: variant,
						style: "padding: 0.25rem 0 0.25rem 1.5rem; cursor: pointer;" + (isSelected ? " font-weight: bold; color: #3273dc;" : ""),
						onclick: () => {
							state.selections[categoryPath] = {
								itemId: itemId,
								variant: variant,
								name: `${displayName} (${variantDisplayName})`
							};
							triggerRender();
						}
					}, capitalize(variantDisplayName));
				})
			) : null
		]);
	}
};

// Body type selector component
const BodyTypeSelector = {
	view: function() {
		const bodyTypes = ["male", "female", "teen", "child", "muscular", "pregnant"];

		return m("div.box", [
			m("h3.title.is-5", "Body Type"),
			m("div.buttons",
				bodyTypes.map(type =>
					m("button.button", {
						class: state.bodyType === type ? "is-primary" : "",
						onclick: () => {
							state.bodyType = type;
							triggerRender();
						}
					}, capitalize(type))
				)
			)
		]);
	}
};

// Recursive tree node component
const TreeNode = {
	oninit: function(vnode) {
		vnode.state.expanded = false;
		vnode.state.showingVariants = false;
	},
	view: function(vnode) {
		const { name, node } = vnode.attrs;
		const isExpanded = vnode.state.expanded;
		const displayName = capitalize(name);

		return m("div",
			m("div.tree-label", {
				onclick: () => {
					vnode.state.expanded = !vnode.state.expanded;
				}
			}, [
				m("span.tree-arrow", { class: isExpanded ? 'expanded' : 'collapsed' }),
				m("span", displayName)
			]),
			isExpanded ? m("div.tree-node", [
				// Render child categories
				Object.entries(node.children || {}).map(([childName, childNode]) =>
					m(TreeNode, { key: childName, name: childName, node: childNode })
				),
				// Render items in this category
				(node.items || [])
					.filter(itemId => {
						const meta = window.itemMetadata[itemId];
						// Filter: Only show items compatible with current body type
						return meta && meta.required.includes(state.bodyType);
					})
					.map(itemId => {
						const meta = window.itemMetadata[itemId];
						const displayName = meta.name;
						const categoryPath = meta.path.slice(0, -1).join("-");
						const hasVariants = meta.variants && meta.variants.length > 0;

						if (!hasVariants) {
							// Simple item with no variants
							const isSelected = state.selections[categoryPath]?.itemId === itemId;
							return m("div", {
								key: itemId,
								style: "padding: 0.25rem 0 0.25rem 1.5rem; cursor: pointer;" + (isSelected ? " font-weight: bold; color: #3273dc;" : ""),
								onclick: () => {
									state.selections[categoryPath] = { itemId, name: displayName };
									triggerRender();
								}
							}, displayName);
						}

						// Item with variants - create a sub-component
						return m(ItemWithVariants, { key: itemId, itemId, meta, categoryPath });
					})
			]) : null
		);
	}
};

// Current selections component
const CurrentSelections = {
	view: function() {
		const selectionCount = Object.keys(state.selections).length;

		if (selectionCount === 0) {
			return m("div.box", [
				m("h3.title.is-5", "Current Selections"),
				m("p.has-text-grey", "No items selected yet")
			]);
		}

		return m("div.box", [
			m("h3.title.is-5", "Current Selections"),
			m("div.tags",
				Object.entries(state.selections).map(([categoryPath, selection]) => {
					return m("span.tag.is-info.is-medium", { key: categoryPath }, [
						m("span", selection.name),
						m("button.delete.is-small", {
							onclick: () => {
								delete state.selections[categoryPath];
								triggerRender();
							}
						})
					]);
				})
			)
		]);
	}
};

// Main tree component
const CategoryTree = {
	view: function() {
		if (!window.categoryTree) {
			return m("div", "Loading...");
		}

		return m("div.box", [
			m("h3.title.is-5", "Available Items"),
			m("div",
				Object.entries(window.categoryTree.children || {}).map(([categoryName, categoryNode]) =>
					m(TreeNode, { key: categoryName, name: categoryName, node: categoryNode })
				)
			)
		]);
	}
};

// Animation list - matches canvas-renderer.js ANIMATION_CONFIGS
const ANIMATIONS = [
	{ value: 'spellcast', label: 'Spellcast' },
	{ value: 'thrust', label: 'Thrust' },
	{ value: 'walk', label: 'Walk' },
	{ value: 'slash', label: 'Slash' },
	{ value: 'shoot', label: 'Shoot' },
	{ value: 'hurt', label: 'Hurt' },
	{ value: 'climb', label: 'Climb' },
	{ value: 'idle', label: 'Idle' },
	{ value: 'jump', label: 'Jump' },
	{ value: 'sit', label: 'Sit' },
	{ value: 'emote', label: 'Emote' },
	{ value: 'run', label: 'Run' },
	{ value: 'watering', label: 'Watering' },
	{ value: 'combat', label: 'Combat Idle' },
	{ value: '1h_slash', label: '1-Handed Slash' },
	{ value: '1h_backslash', label: '1-Handed Backslash' },
	{ value: '1h_halfslash', label: '1-Handed Halfslash' }
];

// Animation Preview component
const AnimationPreview = {
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

// Credits/Attribution component
const Credits = {
	view: function() {
		// Collect credits from all selected items
		const allCredits = [];
		const seenFiles = new Set();

		for (const [categoryPath, selection] of Object.entries(state.selections)) {
			const { itemId } = selection;
			const meta = window.itemMetadata[itemId];

			if (meta && meta.credits) {
				for (const credit of meta.credits) {
					// Avoid duplicates based on file name
					if (!seenFiles.has(credit.file)) {
						seenFiles.add(credit.file);
						allCredits.push(credit);
					}
				}
			}
		}

		// Helper functions for download
		const creditsToCsv = () => {
			const header = "filename,notes,authors,licenses,urls";
			let csvBody = header + "\n";
			allCredits.forEach(credit => {
				const authors = credit.authors.join(", ");
				const licenses = credit.licenses.join(", ");
				const urls = credit.urls.join(", ");
				const notes = credit.notes || "";
				csvBody += `"${credit.file}","${notes}","${authors}","${licenses}","${urls}"\n`;
			});
			return csvBody;
		};

		const creditsToTxt = () => {
			let txt = "";
			allCredits.forEach(credit => {
				txt += `${credit.file}\n`;
				if (credit.notes) {
					txt += `\t- Note: ${credit.notes}\n`;
				}
				txt += `\t- Licenses:\n\t\t- ${credit.licenses.join("\n\t\t- ")}\n`;
				txt += `\t- Authors:\n\t\t- ${credit.authors.join("\n\t\t- ")}\n`;
				txt += `\t- Links:\n\t\t- ${credit.urls.join("\n\t\t- ")}\n\n`;
			});
			return txt;
		};

		const downloadFile = (content, filename) => {
			const blob = new Blob([content], { type: "text/plain" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			a.click();
			URL.revokeObjectURL(url);
		};

		return m("div.box", [
			m("h3.title.is-5", "Credits & Attribution"),
			m("p.subtitle.is-6", "You must credit the authors of this artwork"),

			allCredits.length > 0 ? [
				m("div.content", { style: "max-height: 300px; overflow-y: auto;" },
					allCredits.map(credit =>
						m("div.mb-3", { key: credit.file }, [
							m("strong", credit.file),
							credit.notes ? m("p.is-size-7", credit.notes) : null,
							m("p.is-size-7", [
								m("strong", "Licenses: "),
								credit.licenses.join(", ")
							]),
							m("p.is-size-7", [
								m("strong", "Authors: "),
								credit.authors.join(", ")
							])
						])
					)
				),
				m("div.buttons.mt-3", [
					m("button.button.is-small", {
						onclick: () => downloadFile(creditsToTxt(), "credits.txt")
					}, "Download TXT"),
					m("button.button.is-small", {
						onclick: () => downloadFile(creditsToCsv(), "credits.csv")
					}, "Download CSV")
				])
			] : m("p.has-text-grey", "No items selected")
		]);
	}
};

// Trigger canvas re-render when state changes
function triggerRender() {
	if (window.canvasRenderer) {
		window.canvasRenderer.renderCharacter(state.selections, state.bodyType);
	}
}

// Main app component
const App = {
	view: function() {
		return m("div", [
			m(BodyTypeSelector),
			m(CurrentSelections),
			m(CategoryTree),
			m(Credits)
		]);
	}
};

// Mount the components
m.mount(document.getElementById("mithril-filters"), App);
m.mount(document.getElementById("mithril-preview"), AnimationPreview);
