// Pure utility functions with no state dependencies

/**
 * Convert variant name to filename format (spaces to underscores)
 * @param {string} variant - Variant name (e.g., "light brown")
 * @returns {string} - Filename format (e.g., "light_brown")
 */
export function variantToFilename(variant) {
	return variant.replaceAll(' ', '_');
}

/**
 * Helper function to capitalize strings for display
 */
export function capitalize(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Helper function to check if item matches search query
 */
export function matchesSearch(text, query) {
	if (!query || query.length < 2) return true;
	return text.toLowerCase().includes(query.toLowerCase());
}

/**
 * Helper function to check if a node or its children contain search matches
 */
export function nodeHasMatches(node, query) {
	if (!query || query.length < 2) return true;

	// Check if any items in this node match
	if (node.items && node.items.some(itemId => {
		const meta = window.itemMetadata[itemId];
		return meta && matchesSearch(meta.name, query);
	})) {
		return true;
	}

	// Check if any child nodes have matches
	if (node.children) {
		return Object.values(node.children).some(childNode => nodeHasMatches(childNode, query));
	}

	return false;
}
