// Runtime palette swapping for LPC sprites
// Recolors body sprites on-demand without caching

/**
 * Convert hex color string to RGB object
 * @param {string} hex - Hex color (e.g., "#271920")
 * @returns {{r: number, g: number, b: number}}
 */
function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? {
		r: parseInt(result[1], 16),
		g: parseInt(result[2], 16),
		b: parseInt(result[3], 16)
	} : null;
}

/**
 * Pack RGB values into single integer for fast lookup
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {number} Packed integer
 */
function packRgb(r, g, b) {
	return (r << 16) | (g << 8) | b;
}

/**
 * Build color mapping from source palette to target palette
 * @param {string[]} sourcePalette - Array of hex colors
 * @param {string[]} targetPalette - Array of hex colors
 * @returns {Map<number, {r: number, g: number, b: number}>}
 */
function buildColorMap(sourcePalette, targetPalette) {
	const colorMap = new Map();

	for (let i = 0; i < sourcePalette.length; i++) {
		const sourceRgb = hexToRgb(sourcePalette[i]);
		const targetRgb = hexToRgb(targetPalette[i]);

		if (sourceRgb && targetRgb) {
			const key = packRgb(sourceRgb.r, sourceRgb.g, sourceRgb.b);
			colorMap.set(key, targetRgb);
		}
	}

	return colorMap;
}

/**
 * Recolor an image using palette mapping
 * @param {HTMLImageElement|HTMLCanvasElement} sourceImage - Source image
 * @param {string[]} sourcePalette - Array of hex colors (source)
 * @param {string[]} targetPalette - Array of hex colors (target)
 * @returns {HTMLCanvasElement} Recolored canvas
 */
export function recolorImage(sourceImage, sourcePalette, targetPalette) {
	// Create offscreen canvas
	const canvas = document.createElement('canvas');
	canvas.width = sourceImage.width;
	canvas.height = sourceImage.height;
	const ctx = canvas.getContext('2d');

	// Draw source image
	ctx.drawImage(sourceImage, 0, 0);

	// Get pixel data
	const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	const pixels = imageData.data;

	// Build color mapping
	const colorMap = buildColorMap(sourcePalette, targetPalette);

	// Recolor pixels
	for (let i = 0; i < pixels.length; i += 4) {
		const r = pixels[i];
		const g = pixels[i + 1];
		const b = pixels[i + 2];
		const a = pixels[i + 3];

		// Skip transparent pixels
		if (a === 0) continue;

		// Check if this color should be replaced
		const key = packRgb(r, g, b);
		const newColor = colorMap.get(key);

		if (newColor) {
			pixels[i] = newColor.r;
			pixels[i + 1] = newColor.g;
			pixels[i + 2] = newColor.b;
			// Keep alpha unchanged
		}
	}

	// Write back
	ctx.putImageData(imageData, 0, 0);

	return canvas;
}

/**
 * Load palette JSON file
 * @param {string} url - URL to palette JSON
 * @returns {Promise<Object>} Palette data
 */
export async function loadPalette(url) {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to load palette: ${response.statusText}`);
	}
	return await response.json();
}

// Module state for loaded palette
let bodyPalette = null;

/**
 * Initialize body palette (call once at startup)
 * @returns {Promise<Object>} Loaded palette data
 */
export async function initBodyPalette() {
	if (!bodyPalette) {
		bodyPalette = await loadPalette('tools/palettes/ulpc-body-palettes.json');
		console.log(`Loaded body palette with ${Object.keys(bodyPalette).length} variants`);
	}
	return bodyPalette;
}

/**
 * Get body palette (returns null if not initialized)
 * @returns {Object|null} Body palette data
 */
export function getBodyPalette() {
	return bodyPalette;
}

/**
 * Recolor a body image to a specific variant
 * @param {HTMLImageElement|HTMLCanvasElement} lightImage - Base "light" image
 * @param {string} targetVariant - Target variant name (e.g., "amber", "bronze")
 * @returns {HTMLCanvasElement} Recolored canvas
 */
export function recolorBodyImage(lightImage, targetVariant) {
	if (!bodyPalette) {
		throw new Error('Body palette not initialized. Call initBodyPalette() first.');
	}

	const sourcePalette = bodyPalette.source || bodyPalette.light;
	const targetPalette = bodyPalette[targetVariant];

	if (!targetPalette) {
		throw new Error(`Unknown body variant: ${targetVariant}`);
	}

	return recolorImage(lightImage, sourcePalette, targetPalette);
}
