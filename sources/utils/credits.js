// Credit collection and formatting utilities

/**
 * Helper function to collect credits from all selected items
 * Only includes credits for files actually being used based on current bodyType
 */
export function getAllCredits(selections, bodyType) {
	const allCredits = [];
	const seenFiles = new Set();

	for (const [categoryPath, selection] of Object.entries(selections)) {
		const { itemId } = selection;
		const meta = window.itemMetadata[itemId];

		if (!meta || !meta.credits) continue;

		// Build set of actual file paths being used for this item
		const usedPaths = new Set();

		// Check each layer to get the base path for current bodyType
		for (let layerNum = 1; layerNum < 10; layerNum++) {
			const layerKey = `layer_${layerNum}`;
			const layer = meta.layers?.[layerKey];
			if (!layer) break;

			// Get the base path for current body type
			let basePath = layer[bodyType];
			if (!basePath) continue;

			// Replace template variables like ${head} if present
			if (basePath.includes('${head}')) {
				// Find the selected head to determine replacement value
				const headSelection = Object.values(selections).find(sel =>
					sel.itemId?.startsWith('head-heads-')
				);

				const headSelectionName = headSelection?.name || 'Human_male';
				let replacementValue = 'male'; // default

				if (meta.replace_in_path?.head) {
					replacementValue = meta.replace_in_path.head[headSelectionName] || 'male';
				}

				basePath = basePath.replace('${head}', replacementValue);
			}

			// Remove trailing slash if present
			const normalizedPath = basePath.replace(/\/$/, '');
			usedPaths.add(normalizedPath);
		}

		// Only include credits whose file path matches one of the used paths
		for (const credit of meta.credits) {
			if (seenFiles.has(credit.file)) continue;

			// Check if this credit's file matches any of the used paths
			const creditFile = credit.file;
			let isUsed = false;

			for (const usedPath of usedPaths) {
				// Match if credit file equals or starts with the used path
				// e.g., credit.file="body/bodies/male" matches usedPath="body/bodies/male"
				if (creditFile === usedPath || creditFile.startsWith(usedPath + '/')) {
					isUsed = true;
					break;
				}
			}

			if (isUsed) {
				seenFiles.add(credit.file);
				allCredits.push(credit);
			}
		}
	}

	return allCredits;
}

/**
 * Helper function to convert credits to CSV format
 */
export function creditsToCsv(allCredits) {
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
}

/**
 * Helper function to convert credits to TXT format
 */
export function creditsToTxt(allCredits) {
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
}

/**
 * Helper function to get item filename with zPos prefix (matches original)
 */
export function getItemFileName(itemId, variant, name) {
	const meta = window.itemMetadata[itemId];
	if (!meta) return name;

	// Get zPos from first layer
	const layer1 = meta.layers?.layer_1;
	const zPos = layer1?.zPos || 100;

	// Format: "050 body_male_light" (zPos padded to 3 digits + space + name)
	const safeName = (name || itemId).replace(/[^a-z0-9]/gi, '_').toLowerCase();
	return `${String(zPos).padStart(3, '0')} ${safeName}`;
}
