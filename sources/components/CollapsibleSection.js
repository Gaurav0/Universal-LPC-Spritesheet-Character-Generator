// Reusable CollapsibleSection component
export const CollapsibleSection = {
	oninit: function(vnode) {
		const { storageKey, defaultOpen = true } = vnode.attrs;

		// Try to restore state from localStorage
		if (storageKey) {
			const stored = localStorage.getItem(`collapsed_${storageKey}`);
			// If stored value exists, use it; otherwise fall back to defaultOpen
			vnode.state.isCollapsed = stored !== null ? (stored === 'true') : !defaultOpen;
		} else {
			vnode.state.isCollapsed = !defaultOpen;
		}
	},
	view: function(vnode) {
		const { title, storageKey, boxClass = "box", onToggle, ...additionalAttrs } = vnode.attrs;
		const { isCollapsed } = vnode.state;

		const toggleCollapse = () => {
			vnode.state.isCollapsed = !vnode.state.isCollapsed;

			// Save state to localStorage
			if (storageKey) {
				localStorage.setItem(`collapsed_${storageKey}`, vnode.state.isCollapsed.toString());
			}

			// Call callback if provided
			// The hack to handle the canvas state from within mithril is here:
			if (onToggle) {
				onToggle(vnode.state.isCollapsed);
			}
		};

		return m(`div.${boxClass}`, additionalAttrs, [
			// Collapsible header
			m("div", {
				onclick: toggleCollapse,
				style: "cursor: pointer; user-select: none; display: flex; align-items: center;"
			}, [
				m("span", {
					class: isCollapsed ? "tree-arrow collapsed" : "tree-arrow expanded"
				}),
				m("h3.title.is-5.mb-0", { style: "flex: 1;" }, title)
			]),

			// Collapsible content
			!isCollapsed && m("div", { style: "margin-top: 1rem;" }, vnode.children)
		]);
	}
};
