import { ANIMATIONS } from './constants.js';
import {
	extractAnimationFromCanvas,
	renderSingleItem,
	renderSingleItemAnimation,
	SHEET_HEIGHT,
	canvas,
	layers,
	addedCustomAnimations
} from '../canvas/renderer.js';
import {
	getItemFileName,
	getAllCredits,
	creditsToTxt,
	creditsToCsv
} from '../utils/credits.js';
import { exportStateAsJSON } from './json.js';
import { customAnimations, customAnimationSize } from '../custom-animations.js';

// Helper to convert canvas to blob
const canvasToBlob = (canvas) => {
	return new Promise((resolve, reject) => {
		try {
			canvas.toBlob((blob) => {
				if (blob) {
					resolve(blob);
				} else {
					reject(new Error("Failed to create blob from canvas"));
				}
			}, 'image/png');
		} catch (err) {
			reject(new Error(`Canvas to Blob conversion failed: ${err.message}`));
		}
	});
};

// Helper function to check if a region has non-transparent pixels
function hasContentInRegion(ctx, x, y, width, height) {
	try {
		const imageData = ctx.getImageData(x, y, width, height);
		return imageData.data.some(pixel => pixel !== 0);
	} catch (e) {
		console.warn('Error checking region content:', e);
		return false;
	}
}

function newAnimationFromSheet(src, srcRect = {}) {
	const { x, y, width, height } = srcRect || { width: src.width, height: src.height };
	const fromSubregion = x !== undefined && y !== undefined;
	if (fromSubregion) {
		if (!hasContentInRegion(src.getContext("2d"), x, y, width, height))
			return null;
	} else {
		return src;
	}

	const animCanvas = document.createElement('canvas');
	animCanvas.width = width;
	animCanvas.height = height;
	const animCtx = animCanvas.getContext('2d');

	if (!animCtx) {
		throw new Error("Failed to get canvas context");
	}

	animCtx.drawImage(src,
		x, y, width, height,
		0, 0, width, height);

	return animCanvas;
}

async function addAnimationToZipFolder(folder, fileName, srcCanvas, srcRect = {}) {
	if (srcCanvas) {
		const animCanvas = newAnimationFromSheet(srcCanvas, srcRect);
		if (animCanvas) {
			const blob = await canvasToBlob(animCanvas);
			folder.file(fileName, blob);
		}
		return animCanvas;
	}
}

// Export ZIP - Split by animation
export const exportSplitAnimations = async () => {
	if (!window.canvasRenderer || !window.JSZip) {
		alert('JSZip library not loaded');
		return;
	}

	try {
		const zip = new window.JSZip();
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

		const state = (await import('./state.js')).state; // Ensure state is loaded
		const bodyType = state.bodyType;

		// Create folder structure to match original
		const standardFolder = zip.folder("standard");
		const customFolder = zip.folder("custom");
		const creditsFolder = zip.folder("credits");

		// Get available animations from canvas renderer
		const animationList = ANIMATIONS;
		const exportedStandard = [];
		const failedStandard = [];

		// Create animation PNGs in standard folder (no custom animations support yet)
		for (const anim of animationList) {
			try {
				const animCanvas = extractAnimationFromCanvas(anim.value);
				addAnimationToZipFolder(standardFolder, `${anim.value}.png`, animCanvas,
					new DOMRect(0, 0, animCanvas.width, animCanvas.height));
			} catch (err) {
				console.error(`Failed to export animation ${anim.value}:`, err);
				failedStandard.push(anim.value);
			}
		}

		// Handle custom animations
		const exportedCustom = [];
		const failedCustom = [];
		let y = SHEET_HEIGHT;

		for (const animName of addedCustomAnimations) {
			try {
				const anim = customAnimations[animName];
				if (!anim) {
				throw new Error("Animation definition not found");
				}

				const srcRect = { x: 0, y, ...customAnimationSize(anim) };
				const animCanvas = await addAnimationToZipFolder(customFolder, `${animName}.png`,
				canvas, srcRect);

				if (animCanvas)
				exportedCustom.push(animName);

				y += srcRect.height;
			} catch (err) {
				console.error(`Failed to export custom animation ${animName}:`, err);
				failedCustom.push(animName);
			}
		}

		// Add character.json at root
		zip.file('character.json', exportStateAsJSON(state, layers));

		// Add credits in credits folder
		const allCredits = getAllCredits(state.selections, state.bodyType);
		creditsFolder.file('credits.txt', creditsToTxt(allCredits));
		creditsFolder.file('credits.csv', creditsToCsv(allCredits));

		// Add metadata.json in credits folder
		const metadata = {
			exportTimestamp: timestamp,
			bodyType: bodyType,
			standardAnimations: {
				exported: exportedStandard,
				failed: failedStandard
			},
			customAnimations: {
				exported: exportedCustom,
				failed: failedCustom
			},
			frameSize: 64,
			frameCounts: {} // Would need to map animation frame counts
		};
		creditsFolder.file('metadata.json', JSON.stringify(metadata, null, 2));

		// Generate and download ZIP
		const zipBlob = await zip.generateAsync({ type: 'blob' });
		const url = URL.createObjectURL(zipBlob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `lpc_${bodyType}_animations_${timestamp}.zip`;
		a.click();
		URL.revokeObjectURL(url);

		if (failedStandard.length > 0 || failedCustom.length > 0) {
			alert(`Export completed with some issues:\nFailed to export animations: ${failedStandard.join(', ')}`);
		} else {
			alert('Export complete!');
		}
	} catch (err) {
		console.error('Export failed:', err);
		alert(`Export failed: ${err.message}`);
	}
};

// Export ZIP - Split by item
export const exportSplitItemSheets = async () => {
	if (!window.canvasRenderer || !window.JSZip) {
		alert('JSZip library not loaded');
		return;
	}

	try {
		const zip = new window.JSZip();
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

		const state = (await import('./state.js')).state; // Ensure state is loaded
		const bodyType = state.bodyType;

		// Create folder structure
		const itemsFolder = zip.folder("items");
		const creditsFolder = zip.folder("credits");

		const exportedItems = [];
		const failedItems = [];

		// Render each item individually
		for (const [categoryPath, selection] of Object.entries(state.selections)) {
			const { itemId, variant, name } = selection;
			const fileName = getItemFileName(itemId, variant, name);

			try {
				// Render just this one item
				const itemCanvas = await renderSingleItem(
					itemId,
					variant,
					bodyType,
					state.selections
				);

				if (itemCanvas) {
					const blob = await new Promise(resolve => itemCanvas.toBlob(resolve, 'image/png'));
					itemsFolder.file(`${fileName}.png`, blob);
					exportedItems.push(fileName);
				}
			} catch (err) {
				console.error(`Failed to export item ${fileName}:`, err);
				failedItems.push(fileName);
			}
		}

		// Add character.json at root
		zip.file('character.json', exportStateAsJSON(state, layers));

		// Add credits in credits folder
		const allCredits = getAllCredits(state.selections, state.bodyType);
		creditsFolder.file('credits.txt', creditsToTxt(allCredits));
		creditsFolder.file('credits.csv', creditsToCsv(allCredits));

		// Generate and download ZIP
		const zipBlob = await zip.generateAsync({ type: 'blob' });
		const url = URL.createObjectURL(zipBlob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `lpc_${bodyType}_item_spritesheets_${timestamp}.zip`;
		a.click();
		URL.revokeObjectURL(url);

		if (failedItems.length > 0) {
			alert(`Export completed with some issues:\nFailed items: ${failedItems.join(', ')}`);
		} else {
			alert('Export complete!');
		}
	} catch (err) {
		console.error('Export failed:', err);
		alert(`Export failed: ${err.message}`);
	}
};

// Export ZIP - Split by animation and item
export const exportSplitItemAnimations = async () => {
	if (!window.canvasRenderer || !window.JSZip) {
		alert('JSZip library not loaded');
		return;
	}

	try {
		const zip = new window.JSZip();
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

		const state = (await import('./state.js')).state; // Ensure state is loaded
		const bodyType = state.bodyType;

		// Create folder structure
		const standardFolder = zip.folder("standard");
		const customFolder = zip.folder("custom");
		const creditsFolder = zip.folder("credits");

		// Get available animations
		const animationList = ANIMATIONS;
		const exportedStandard = {};
		const failedStandard = {};

		// For each animation, create a folder and export each item
		for (const anim of animationList) {
			const animFolder = standardFolder.folder(anim.value);
			if (!animFolder) continue;

			exportedStandard[anim.value] = [];
			failedStandard[anim.value] = [];

			// Export each item for this animation
			for (const [categoryPath, selection] of Object.entries(state.selections)) {
				const { itemId, variant, name } = selection;
				const fileName = getItemFileName(itemId, variant, name);

				try {
					// Render just this item for this animation
					const animCanvas = await renderSingleItemAnimation(
						itemId,
						variant,
						bodyType,
						anim.value,
						state.selections
					);

					if (animCanvas) {
						const blob = await new Promise(resolve => animCanvas.toBlob(resolve, 'image/png'));
						animFolder.file(`${fileName}.png`, blob);
						exportedStandard[anim.value].push(fileName);
					}
				} catch (err) {
					console.error(`Failed to export ${fileName} for ${anim.value}:`, err);
					failedStandard[anim.value].push(fileName);
				}
			}
		}

		// Add character.json at root
		zip.file('character.json', exportStateAsJSON(state, layers));

		// Add credits in credits folder
		const allCredits = getAllCredits(state.selections, state.bodyType);
		creditsFolder.file('credits.txt', creditsToTxt(allCredits));
		creditsFolder.file('credits.csv', creditsToCsv(allCredits));

		// Add metadata.json in credits folder
		const metadata = {
			exportTimestamp: timestamp,
			bodyType: bodyType,
			standardAnimations: {
				exported: exportedStandard,
				failed: failedStandard
			},
			customAnimations: {
				exported: {},
				failed: {}
			},
			frameSize: 64,
			frameCounts: {}
		};
		creditsFolder.file('metadata.json', JSON.stringify(metadata, null, 2));

		// Generate and download ZIP
		const zipBlob = await zip.generateAsync({ type: 'blob' });
		const url = URL.createObjectURL(zipBlob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `lpc_${bodyType}_item_animations_${timestamp}.zip`;
		a.click();
		URL.revokeObjectURL(url);

		// Report failures if any
		const failedCount = Object.values(failedStandard).reduce((sum, arr) => sum + arr.length, 0);
		if (failedCount > 0) {
			let msg = 'Export completed with some issues:\n';
			for (const [anim, items] of Object.entries(failedStandard)) {
				if (items.length > 0) {
					msg += `${anim}: ${items.join(', ')}\n`;
				}
			}
			alert(msg);
		} else {
			alert('Export complete!');
		}
	} catch (err) {
		console.error('Export failed:', err);
		alert(`Export failed: ${err.message}`);
	}
};
