// Runtime palette swapping for LPC sprites
// Recolors body sprites on-demand without caching

import { recolorImageWebGL, isWebGLAvailable } from './webgl-palette-recolor.js';

// Configuration flags
let config = {
	forceCPU: false,  // Set to true to force CPU mode even if WebGL is available
	useWebGL: isWebGLAvailable()
};

// Check WebGL availability once at module load
const USE_WEBGL = config.useWebGL && !config.forceCPU;

// Log which method will be used
if (USE_WEBGL) {
	console.log('🎨 Palette recoloring: WebGL GPU-accelerated mode enabled');
	console.log('💡 To check stats, run: window.getPaletteRecolorStats()');
	console.log('💡 To force CPU mode, run: window.setPaletteRecolorMode("cpu")');
} else if (config.forceCPU) {
	console.log('🎨 Palette recoloring: CPU mode (forced by configuration)');
} else {
	console.log('🎨 Palette recoloring: CPU mode (WebGL not available)');
}

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
 * Recolor an image using palette mapping (CPU implementation)
 * @param {HTMLImageElement|HTMLCanvasElement} sourceImage - Source image
 * @param {string[]} sourcePalette - Array of hex colors (source)
 * @param {string[]} targetPalette - Array of hex colors (target)
 * @returns {HTMLCanvasElement} Recolored canvas
 */
function recolorImageCPU(sourceImage, sourcePalette, targetPalette) {
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

// Track recolor stats for debugging
let recolorStats = { webgl: 0, cpu: 0, fallback: 0 };

/**
 * Get recolor statistics
 * @returns {Object} Stats object with webgl, cpu, and fallback counts
 */
export function getRecolorStats() {
	return { ...recolorStats };
}

/**
 * Reset recolor statistics
 */
export function resetRecolorStats() {
	recolorStats = { webgl: 0, cpu: 0, fallback: 0 };
}

/**
 * Set palette recolor mode
 * @param {string} mode - "webgl" or "cpu"
 */
export function setPaletteRecolorMode(mode) {
	if (mode === 'cpu') {
		config.forceCPU = true;
		console.log('🎨 Switched to CPU mode (forced)');
	} else if (mode === 'webgl') {
		if (config.useWebGL) {
			config.forceCPU = false;
			console.log('🎨 Switched to WebGL mode');
		} else {
			console.warn('⚠️ WebGL not available on this browser');
		}
	} else {
		console.error('Invalid mode. Use "webgl" or "cpu"');
	}
}

/**
 * Get current palette recolor configuration
 * @returns {Object} Current config
 */
export function getPaletteRecolorConfig() {
	return {
		...config,
		activeMode: (!config.forceCPU && config.useWebGL) ? 'webgl' : 'cpu'
	};
}

/**
 * Recolor an image using palette mapping
 * Automatically uses WebGL if available, falls back to CPU
 * @param {HTMLImageElement|HTMLCanvasElement} sourceImage - Source image
 * @param {string[]} sourcePalette - Array of hex colors (source)
 * @param {string[]} targetPalette - Array of hex colors (target)
 * @returns {HTMLCanvasElement} Recolored canvas
 */
export function recolorImage(sourceImage, sourcePalette, targetPalette) {
	const shouldUseWebGL = config.useWebGL && !config.forceCPU;

	if (shouldUseWebGL) {
		try {
			recolorStats.webgl++;
			return recolorImageWebGL(sourceImage, sourcePalette, targetPalette);
		} catch (error) {
			console.warn('⚠️ WebGL recoloring failed, falling back to CPU:', error);
			recolorStats.fallback++;
			return recolorImageCPU(sourceImage, sourcePalette, targetPalette);
		}
	}
	recolorStats.cpu++;
	return recolorImageCPU(sourceImage, sourcePalette, targetPalette);
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

/**
 * Palette configuration - maps item category paths to palette files
 * Each palette config defines which items use that palette based on their metadata path
 */
const PALETTE_CONFIG = [
	{
		type: 'body',
		file: 'tools/palettes/ulpc-body-palettes.json',
		sourceVariant: 'light',
		categories: [
			['body', 'body'],           // body-body
			['head', 'heads'],          // all heads
			['head', 'ears'],           // ears
			['head', 'nose'],           // noses
			['head', 'head_wrinkles'],  // wrinkles
			['head', 'face']            // facial expressions (happy, sad, angry, etc.)
		]
	}
	// Future palette types will be added here:
	// { type: 'hair', file: 'tools/palettes/ulpc-hair-palettes.json', ... }
	// { type: 'cloth', file: 'tools/palettes/ulpc-cloth-palettes.json', ... }
	// { type: 'eyes', file: 'tools/palettes/ulpc-eye-palettes.json', ... }
];

// Module state for loaded palettes
const loadedPalettes = {};

/**
 * Check if an item's path matches a category pattern
 * @param {string[]} itemPath - Item's path from metadata (e.g., ["body", "body"])
 * @param {string[]} categoryPattern - Category pattern to match
 * @returns {boolean} True if path matches pattern
 */
function pathMatchesCategory(itemPath, categoryPattern) {
	if (!itemPath || itemPath.length < categoryPattern.length) return false;

	// Check if all elements in categoryPattern match the start of itemPath
	for (let i = 0; i < categoryPattern.length; i++) {
		if (itemPath[i] !== categoryPattern[i]) return false;
	}
	return true;
}

/**
 * Get palette configuration for an item
 * @param {string} itemId - Item identifier
 * @param {Object} meta - Item metadata
 * @returns {Object|null} Palette config object or null if no palette applies
 */
export function getPaletteForItem(itemId, meta) {
	if (!meta || !meta.path) return null;

	// Check each palette config to see if item matches
	for (const paletteConfig of PALETTE_CONFIG) {
		for (const category of paletteConfig.categories) {
			if (pathMatchesCategory(meta.path, category)) {
				return paletteConfig;
			}
		}
	}

	return null;
}

/**
 * Initialize all palettes (call once at startup)
 * @returns {Promise<void>}
 */
export async function initPalettes() {
	for (const config of PALETTE_CONFIG) {
		if (!loadedPalettes[config.type]) {
			loadedPalettes[config.type] = await loadPalette(config.file);
			console.log(`Loaded ${config.type} palette with ${Object.keys(loadedPalettes[config.type]).length} variants`);
		}
	}
}

/**
 * Get loaded palette by type
 * @param {string} paletteType - Palette type (e.g., 'body', 'hair')
 * @returns {Object|null} Palette data or null if not loaded
 */
export function getPaletteByType(paletteType) {
	return loadedPalettes[paletteType] || null;
}

/**
 * Get body palette (returns null if not initialized)
 * @returns {Object|null} Body palette data
 */
export function getBodyPalette() {
	return loadedPalettes.body || null;
}

/**
 * Initialize body palette (call once at startup)
 * @returns {Promise<Object>} Loaded palette data
 */
export async function initBodyPalette() {
	if (!loadedPalettes.body) {
		const bodyConfig = PALETTE_CONFIG.find(c => c.type === 'body');
		if (bodyConfig) {
			loadedPalettes.body = await loadPalette(bodyConfig.file);
			console.log(`Loaded body palette with ${Object.keys(loadedPalettes.body).length} variants`);
		}
	}
	return loadedPalettes.body;
}

/**
 * Recolor an image using the body palette
 * Works for body, heads, ears, noses, and facial features
 * @param {HTMLImageElement|HTMLCanvasElement} sourceImage - Base source variant image (usually "light")
 * @param {string} targetVariant - Target variant name (e.g., "amber", "bronze", "fur_copper")
 * @returns {HTMLCanvasElement} Recolored canvas
 */
export function recolorWithBodyPalette(sourceImage, targetVariant) {
	const bodyPalette = loadedPalettes.body;
	if (!bodyPalette) {
		throw new Error('Body palette not initialized. Call initPalettes() first.');
	}

	const sourcePalette = bodyPalette.source || bodyPalette.light;
	const targetPalette = bodyPalette[targetVariant];

	if (!targetPalette) {
		throw new Error(`Unknown body variant: ${targetVariant}`);
	}

	return recolorImage(sourceImage, sourcePalette, targetPalette);
}
