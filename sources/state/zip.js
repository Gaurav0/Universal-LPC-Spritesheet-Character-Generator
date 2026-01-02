import { ANIMATIONS, ANIMATION_CONFIGS, FRAME_SIZE } from './constants.js';
import {
	extractAnimationFromCanvas,
	renderSingleItem,
	renderSingleItemAnimation,
	SHEET_HEIGHT,
	canvas,
	layers,
	customAreaItems,
	addedCustomAnimations
} from '../canvas/renderer.js';
import {
	getItemFileName,
	getAllCredits,
	creditsToTxt,
	creditsToCsv
} from '../utils/credits.js';
import { loadImage } from '../canvas/load-image.js';
import { drawFramesToCustomAnimation } from '../canvas/draw-frames.js';
import { exportStateAsJSON } from './json.js';
import {
	customAnimations,
	customAnimationSize,
	isCustomAnimationBasedOnStandardAnimation
} from '../custom-animations.js';
import { get2DContext } from '../canvas/canvas-utils.js';

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

// Helper to convert image to canvas
function image2canvas(img) {
	const imgCanvas = document.createElement('canvas');
	imgCanvas.width = img.width;
	imgCanvas.height = img.height;
	const imgCtx = get2DContext(imgCanvas);
	if (!imgCtx) {
		throw new Error("Failed to get canvas context");
	}
	imgCtx.drawImage(img, 0, 0);
	return imgCanvas;
}

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

function newAnimationFromSheet(src, srcRect) {
	const { x, y, width, height } = srcRect || { x: 0, y: 0, width: src.width, height: src.height };
	const fromSubregion = x !== 0 || y !== 0 || width !== src.width || height !== src.height;
	if (fromSubregion) {
		if (!hasContentInRegion(src.getContext("2d"), x, y, width, height))
			return null;
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

async function addAnimationToZipFolder(folder, fileName, srcCanvas, srcRect) {
	if (srcCanvas) {
		const animCanvas = newAnimationFromSheet(srcCanvas, srcRect);
		if (animCanvas) {
			const blob = await canvasToBlob(animCanvas);
			if (fileName.endsWith('.png')) {
				if (window.DEBUG) {
					console.log(`Adding to ZIP: `, `${folder.root}${fileName}`, 'size: ', blob.size);
				}
				folder.file(fileName, blob);
			} else {
				if (window.DEBUG) {
					console.log('Adding to ZIP: ', `${folder.root}/${fileName}.png`, 'size: ', blob.size);
				}
				folder.file(`${fileName}.png`, blob);
			}
			return animCanvas;
		}
	}
}

// Export ZIP - Split by animation
export const exportSplitAnimations = async () => {
	if (!window.canvasRenderer || !window.JSZip) {
		alert('JSZip library not loaded');
		return;
	}

	let state;

	try {
		const zip = new window.JSZip();
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

		state = (await import('./state.js')).state; // Ensure state is loaded
		state.zipByAnimation.isRunning = true;
		m.redraw();
		const bodyType = state.bodyType;

		// Create folder structure to match original
		const standardFolder = zip.folder("standard");
		const customFolder = zip.folder("custom");
		const creditsFolder = zip.folder("credits");

		// Get available animations from canvas renderer
		const animationList = ANIMATIONS;
		const exportedStandard = [];
		const failedStandard = [];

		// Create animation PNGs in standard folder
		for (const anim of animationList) {
			try {
				const animCanvas = extractAnimationFromCanvas(anim.value);
				await addAnimationToZipFolder(standardFolder, `${anim.value}.png`, animCanvas,
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
	} finally {
		state.zipByAnimation.isRunning = false;
		m.redraw();
	}
};

// Export ZIP - Split by item
export const exportSplitItemSheets = async () => {
	if (!window.canvasRenderer || !window.JSZip) {
		alert('JSZip library not loaded');
		return;
	}

	let state;

	try {
		const zip = new window.JSZip();
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

		state = (await import('./state.js')).state; // Ensure state is loaded
		state.zipByItem.isRunning = true;
		m.redraw();
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
					await addAnimationToZipFolder(itemsFolder, `${fileName}.png`, itemCanvas);
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
	} finally {
		state.zipByItem.isRunning = false;
		m.redraw();
	}
};

function newStandardAnimationForCustomAnimation(src, custAnim) {
	const custCanvas = document.createElement("canvas");
	const {width: custWidth, height: custHeight} = customAnimationSize(custAnim);
	custCanvas.width = custWidth;
	custCanvas.height = custHeight;
	const custCtx = custCanvas.getContext("2d");
	drawFramesToCustomAnimation(custCtx, custAnim, 0, src, null);
	return custCanvas;
}

async function addStandardAnimationToZipCustomFolder(custAnimFolder, itemFileName, src, custAnim) {
	const custCanvas = newStandardAnimationForCustomAnimation(src, custAnim);
	const custBlob = await canvasToBlob(custCanvas);
	custAnimFolder.file(itemFileName, custBlob);
	return custCanvas;
}

// Export ZIP - Split by animation and item
export const exportSplitItemAnimations = async () => {
	if (!window.canvasRenderer || !window.JSZip) {
		alert('JSZip library not loaded');
		return;
	}

	let state;

	try {
		const zip = new window.JSZip();
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

		state = (await import('./state.js')).state; // Ensure state is loaded
		state.zipByAnimimationAndItem.isRunning = true;
		m.redraw();
		const bodyType = state.bodyType;

		// Create folder structure
		const standardFolder = zip.folder("standard");
		const customFolder = zip.folder("custom");
		const creditsFolder = zip.folder("credits");

		// Get available animations
		const animationList = ANIMATIONS;
		const exportedStandard = {};
		const failedStandard = {};
		const exportedCustom = {};
		const failedCustom = {};

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
						await addAnimationToZipFolder(animFolder, `${fileName}.png`, animCanvas);
						exportedStandard[anim.value].push(fileName);
					}

					for (const custAnimName of addedCustomAnimations) {
						const custAnim = customAnimations[custAnimName];
						if (!isCustomAnimationBasedOnStandardAnimation(custAnim, name))
							continue;

						const custExportedItems = exportedCustom[custAnimName] || [];
						exportedCustom[custAnimName] = custExportedItems;
						const custFailedItems = failedCustom[custAnimName] || [];
						try {
							const custAnimFolder = customFolder.folder(custAnimName);
							if (await addStandardAnimationToZipCustomFolder(custAnimFolder, itemFileName, img, custAnim))
								custExportedItems.push(itemFileName);
						} catch (err) {
							console.error(`Failed to export item ${itemFileName} in custom animation ${custAnimName}:`, err);
							custFailedItems.push(itemFileName);
							failedCustom[custAnimName] = custFailedItems;
						}
					}


				} catch (err) {
					console.error(`Failed to export ${fileName} for ${anim.value}:`, err);
					failedStandard[anim.value].push(fileName);
				}
			}
		}

		if (window.DEBUG) console.log(customAreaItems);

		for (const customAnimName of Object.keys(customAreaItems)) {

			// Export items exclusive to custom animations
			for (const layer of customAreaItems[customAnimName]) {
				const custName = layer.animation;

				if (window.DEBUG) {
					console.log('Processing layer for custom animation only export:', layer);
				}

				const spritePath = layer.spritePath;
				const itemFileName = getItemFileName(layer.itemId, layer.variant, layer.name);
				const custExportedItems = exportedCustom[custName] || [];
				exportedCustom[custName] = custExportedItems;
				const custFailedItems = failedCustom[custName] || [];

				try {
					if (window.DEBUG) {
						console.log(`Exporting item ${itemFileName} for custom animation ${custName}`);
					}
					const img = await loadImage(spritePath, false);
					if (!img)
						continue;

					const imgCanvas = image2canvas(img);
					const custAnim = customAnimations[custName];
					const custSize = customAnimationSize(custAnim);
					const srcRect = { x: 0, y: 0, ...custSize };
					const animFolder = customFolder.folder(custName);
					if (await addAnimationToZipFolder(animFolder, itemFileName, imgCanvas, srcRect))
						custExportedItems.push(itemFileName);
				} catch (err) {
					console.error(`Failed to export item ${itemFileName} in custom animation ${custName}:`, err);
					custFailedItems.push(itemFileName);
					failedCustom[custName] = custFailedItems;
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
				exported: exportedCustom,
				failed: failedCustom
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
	} finally {
		state.zipByAnimimationAndItem.isRunning = false;
		m.redraw();
	}
};

// Helper to extract individual frames from an animation canvas
function extractFramesFromAnimation(animationCanvas, animationName, directions = ['up', 'down', 'left', 'right']) {
	const frames = {};
	const config = ANIMATION_CONFIGS[animationName];
	if (!config) return frames;

	const frameWidth = FRAME_SIZE;
	const frameHeight = FRAME_SIZE;
	const framesPerRow = 13;

	for (let dirIndex = 0; dirIndex < directions.length && dirIndex < config.num; dirIndex++) {
		const direction = directions[dirIndex];
		frames[direction] = [];

		const sourceY = dirIndex * frameHeight;

		for (let frameIndex = 0; frameIndex < framesPerRow; frameIndex++) {
			const sourceX = frameIndex * frameWidth;

			// Create canvas for individual frame
			const frameCanvas = document.createElement('canvas');
			frameCanvas.width = frameWidth;
			frameCanvas.height = frameHeight;
			const frameCtx = get2DContext(frameCanvas);

			if (!frameCtx) continue;

			// Check if this region has content
			if (hasContentInRegion(animationCanvas.getContext('2d'), sourceX, sourceY, frameWidth, frameHeight)) {
				// Draw the frame
				frameCtx.drawImage(
					animationCanvas,
					sourceX, sourceY, frameWidth, frameHeight,
					0, 0, frameWidth, frameHeight
				);

				frames[direction].push({
					canvas: frameCanvas,
					frameNumber: frameIndex + 1 // 1-based numbering
				});
			}
		}
	}

	return frames;
}

// Helper to extract individual frames from custom animation canvas
function extractFramesFromCustomAnimation(animationCanvas, customAnimationDef, directions = ['up', 'down', 'left', 'right']) {
	const frames = {};
	const frameSize = customAnimationDef.frameSize;
	const animationFrames = customAnimationDef.frames;

	if (window.DEBUG) {
		console.log(`Extracting frames from custom animation:`, {
			frameSize,
			animationFrames,
			canvasSize: { width: animationCanvas.width, height: animationCanvas.height }
		});
	}

	// Map direction names to row indices
	const directionMap = {
		'up': 0,
		'down': 2,
		'left': 1,
		'right': 3
	};

	for (const direction of directions) {
		const dirIndex = directionMap[direction];
		if (dirIndex >= animationFrames.length) {
			if (window.DEBUG) {
				console.log(`Skipping direction ${direction} (index ${dirIndex}) - not enough rows in animation frames`);
			}
			continue;
		}

		frames[direction] = [];
		const frameRow = animationFrames[dirIndex];

		if (window.DEBUG) {
			console.log(`Processing direction ${direction} (row ${dirIndex}):`, frameRow);
		}

		for (let frameIndex = 0; frameIndex < frameRow.length; frameIndex++) {
			const sourceX = frameIndex * frameSize;
			const sourceY = dirIndex * frameSize;

			// Create canvas for individual frame
			const frameCanvas = document.createElement('canvas');
			frameCanvas.width = frameSize;
			frameCanvas.height = frameSize;
			const frameCtx = get2DContext(frameCanvas);

			if (!frameCtx) {
				if (window.DEBUG) {
					console.warn(`Failed to get context for frame ${frameIndex} in direction ${direction}`);
				}
				continue;
			}

			// Draw the frame first
			frameCtx.drawImage(
				animationCanvas,
				sourceX, sourceY, frameSize, frameSize,
				0, 0, frameSize, frameSize
			);

			// For custom animations, check if the drawn frame has any content
			// by examining the imageData after drawing
			let hasContent = true; // Default to true for custom animations
			try {
				const imageData = frameCtx.getImageData(0, 0, frameSize, frameSize);
				// Check if any pixel has alpha > 0 (not fully transparent)
				hasContent = imageData.data.some((value, index) =>
					index % 4 === 3 && value > 0 // Check alpha channel
				);
			} catch (e) {
				// If checking fails, assume content exists
				hasContent = true;
				if (window.DEBUG) {
					console.warn(`Content checking failed for ${direction} frame ${frameIndex}, assuming content exists:`, e);
				}
			}

			// Add all frames for custom animations, even if they appear empty
			// This ensures we don't miss valid transparent frames
			if (hasContent || true) { // Always include custom animation frames
				frames[direction].push({
					canvas: frameCanvas,
					frameNumber: frameIndex + 1 // 1-based numbering
				});

				if (window.DEBUG) {
					console.log(`Added frame ${frameIndex + 1} for direction ${direction} (hasContent: ${hasContent})`);
				}
			}
		}
	}

	return frames;
}

// Export ZIP - Individual animation frames
export const exportIndividualFrames = async () => {
	if (!window.canvasRenderer || !window.JSZip) {
		alert('JSZip library not loaded');
		return;
	}

	let state;

	try {
		const zip = new window.JSZip();
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

		state = (await import('./state.js')).state;
		state.zipIndividualFrames = state.zipIndividualFrames || { isRunning: false };
		state.zipIndividualFrames.isRunning = true;
		m.redraw();
		const bodyType = state.bodyType;

		// Create folder structure
		const standardFolder = zip.folder("standard");
		const customFolder = zip.folder("custom");
		const creditsFolder = zip.folder("credits");

		const exportedAnimations = [];
		const failedAnimations = [];
		const directions = ['up', 'down', 'left', 'right'];

		// Process standard animations
		for (const anim of ANIMATIONS) {
			try {
				const animationName = anim.value;
				const animCanvas = extractAnimationFromCanvas(animationName);

				if (animCanvas) {
					const animFolder = standardFolder.folder(animationName);
					const frames = extractFramesFromAnimation(animCanvas, animationName, directions);

					for (const [direction, frameList] of Object.entries(frames)) {
						if (frameList.length > 0) {
							const directionFolder = animFolder.folder(direction);

							for (const { canvas: frameCanvas, frameNumber } of frameList) {
								const blob = await canvasToBlob(frameCanvas);
								directionFolder.file(`${frameNumber}.png`, blob);

								if (window.DEBUG) {
									console.log(`Adding frame: standard/${animationName}/${direction}/${frameNumber}.png`);
								}
							}
						}
					}
					exportedAnimations.push(animationName);
				}
			} catch (err) {
				console.error(`Failed to export frames for animation ${anim.value}:`, err);
				failedAnimations.push(anim.value);
			}
		}

		// Process custom animations
		const exportedCustom = [];
		const failedCustom = [];
		let y = SHEET_HEIGHT;

		for (const animName of addedCustomAnimations) {
			try {
				const customAnimDef = customAnimations[animName];
				if (!customAnimDef) {
					throw new Error("Custom animation definition not found");
				}

				const custSize = customAnimationSize(customAnimDef);
				const srcRect = { x: 0, y, ...custSize };

				if (window.DEBUG) {
					console.log(`Processing custom animation: ${animName}`, {
						frameSize: customAnimDef.frameSize,
						frames: customAnimDef.frames,
						srcRect: srcRect
					});
				}

				// Extract custom animation from main canvas
				const custAnimCanvas = newAnimationFromSheet(canvas, srcRect);
				if (custAnimCanvas) {
					const animFolder = customFolder.folder(animName);
					// Use the specialized custom animation frame extraction
					const frames = extractFramesFromCustomAnimation(custAnimCanvas, customAnimDef, directions);

					if (window.DEBUG) {
						console.log(`Extracted frames for ${animName}:`, frames);
					}

					for (const [direction, frameList] of Object.entries(frames)) {
						if (frameList.length > 0) {
							const directionFolder = animFolder.folder(direction);

							for (const { canvas: frameCanvas, frameNumber } of frameList) {
								const blob = await canvasToBlob(frameCanvas);
								directionFolder.file(`${frameNumber}.png`, blob);

								if (window.DEBUG) {
									console.log(`Adding frame: custom/${animName}/${direction}/${frameNumber}.png`);
								}
							}
						}
					}
					exportedCustom.push(animName);
				} else {
					console.warn(`No canvas generated for custom animation: ${animName}`);
				}

				y += srcRect.height;
			} catch (err) {
				console.error(`Failed to export frames for custom animation ${animName}:`, err);
				failedCustom.push(animName);
			}
		}

		// Add character.json at root
		zip.file('character.json', exportStateAsJSON(state, layers));

		// Add credits in credits folder
		const allCredits = getAllCredits(state.selections, state.bodyType);
		creditsFolder.file('credits.txt', creditsToTxt(allCredits));
		creditsFolder.file('credits.csv', creditsToCsv(allCredits));

		// Add metadata.json with frame structure info
		const metadata = {
			exportTimestamp: timestamp,
			bodyType: bodyType,
			frameSize: FRAME_SIZE,
			structure: {
				standard: {
					exported: exportedAnimations,
					failed: failedAnimations
				},
				custom: {
					exported: exportedCustom,
					failed: failedCustom
				}
			},
			animationConfigs: ANIMATION_CONFIGS,
			directions: directions,
			note: "Individual animation frames organized by standard/custom > animation > direction > frame number"
		};
		creditsFolder.file('metadata.json', JSON.stringify(metadata, null, 2));

		// Generate and download ZIP
		const zipBlob = await zip.generateAsync({ type: 'blob' });
		const url = URL.createObjectURL(zipBlob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `lpc_${bodyType}_individual_frames_${timestamp}.zip`;
		a.click();
		URL.revokeObjectURL(url);

		// Report results
		const totalFailed = failedAnimations.length + failedCustom.length;
		if (totalFailed > 0) {
			let msg = 'Export completed with some issues:\n';
			if (failedAnimations.length > 0) {
				msg += `Failed standard animations: ${failedAnimations.join(', ')}\n`;
			}
			if (failedCustom.length > 0) {
				msg += `Failed custom animations: ${failedCustom.join(', ')}\n`;
			}
			alert(msg);
		} else {
			alert('Individual frames export complete!');
		}
	} catch (err) {
		console.error('Individual frames export failed:', err);
		alert(`Export failed: ${err.message}`);
	} finally {
		if (state && state.zipIndividualFrames) {
			state.zipIndividualFrames.isRunning = false;
		}
		m.redraw();
	}
};

