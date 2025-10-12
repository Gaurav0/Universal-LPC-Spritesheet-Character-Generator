// Main tree component
import { state, resetAll } from '../../state/state.js';
import { BodyTypeSelector } from './BodyTypeSelector.js';
import { TreeNode } from './TreeNode.js';

export const CategoryTree = {
	view: function() {
		if (!window.categoryTree) {
			return m("div", "Loading...");
		}

		return m("div.box.has-background-light", [
			m("div.mb-3", { style: "display: flex; justify-content: space-between; align-items: center;" }, [
				m("h3.title.is-5.mb-0", "Available Items"),
				m("div.buttons.mb-0", [
					m("button.button.is-danger.is-small", {
						onclick: resetAll
					}, "Reset all"),
					m("button.button.is-small", {
						onclick: () => { state.expandedNodes = {}; }
					}, "Collapse All"),
					m("button.button.is-small", {
						onclick: () => {
							for (const [categoryPath, selection] of Object.entries(state.selections)) {
								const { itemId } = selection;
								const meta = window.itemMetadata[itemId];
								if (meta && meta.path) {
									let pathSoFar = "";
									// Expand all path segments (categories)
									for (const segment of meta.path) {
										pathSoFar = pathSoFar ? `${pathSoFar}-${segment}` : segment;
										state.expandedNodes[pathSoFar] = true;
									}
									// Also expand the item itself (to show variants)
									state.expandedNodes[itemId] = true;
								}
							}
						}
					}, "Expand Selected")
				])
			]),
			m("div", [
				// Body Type as first tree item
				m(BodyTypeSelector),
				// Rest of the category tree
				Object.entries(window.categoryTree.children || {}).map(([categoryName, categoryNode]) =>
					m(TreeNode, { key: categoryName, name: categoryName, node: categoryNode })
				)
			])
		]);
	}
};
