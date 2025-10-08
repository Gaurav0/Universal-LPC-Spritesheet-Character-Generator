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
					const variantId = `${itemId}_${variant}`;
					const isSelected = state.selections[categoryPath]?.itemId === variantId;
					const variantDisplayName = variant.replaceAll("_", " ");

					return m("div", {
						key: variant,
						style: "padding: 0.25rem 0 0.25rem 1.5rem; cursor: pointer;" + (isSelected ? " font-weight: bold; color: #3273dc;" : ""),
						onclick: () => {
							state.selections[categoryPath] = { itemId: variantId, name: `${displayName} (${variantDisplayName})` };
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
				(node.items || []).map(itemId => {
					const meta = window.itemMetadata[itemId];
					const displayName = meta ? meta.name : itemId;
					const categoryPath = meta.path.slice(0, -1).join("-");
					const hasVariants = meta && meta.variants && meta.variants.length > 0;

					if (!hasVariants) {
						// Simple item with no variants
						const isSelected = state.selections[categoryPath]?.itemId === itemId;
						return m("div", {
							key: itemId,
							style: "padding: 0.25rem 0 0.25rem 1.5rem; cursor: pointer;" + (isSelected ? " font-weight: bold; color: #3273dc;" : ""),
							onclick: () => {
								state.selections[categoryPath] = { itemId, name: displayName };
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

// Main app component
const App = {
	view: function() {
		return m("div", [
			m(BodyTypeSelector),
			m(CurrentSelections),
			m(CategoryTree)
		]);
	}
};

// Mount the component
m.mount(document.getElementById("mithril-filters"), App);
