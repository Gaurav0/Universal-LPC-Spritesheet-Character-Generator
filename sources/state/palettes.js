// Palette utilities
import { state, getSelectionGroup } from "./state.js";

/**
 * Function to get palette file info
 * @param {string} material - Material name / identifier
 * @param {string|null} base - The source recolor to convert from; if null, uses the default base recolor
 * @returns {Array[version, recolor, Array<colors>]} Return list of base palette assets including version, color name, and array of hex colors
 */
export function getBasePalette(material, base = null) {
    // Check Palette Material Exists
    const materialMeta = window.paletteMetadata?.materials[material];
    if (!materialMeta) {
        console.error(`Palettes for ${material} not found`);
        return null;
    }

    // Determine Base Variant
    let [version, recolor] = base ? base.split(".") : [materialMeta.default, materialMeta.base];
    const colors = materialMeta.palettes[version]?.[recolor];
    return [version, recolor, colors];
}

/**
 * Function to get palette file info
 * @param {string} material - Material name / identifier
 * @param {string} targetColor - The target recolor to retrieve
 * @returns {Array} Array of colors for the target palette
 */
export function getTargetPalette(material, targetColor) {
    // Check Palette Material Exists
    const materialMeta = window.paletteMetadata?.materials[material];
    if (!materialMeta) {
        console.error(`Palettes for ${material} not found`);
        return null;
    }

    // Split Colors
    let [version, recolor] = targetColor.split(".");
    if (!window.paletteMetadata?.versions[version]) {
        version = materialMeta.default;
        recolor = targetColor;
    }

    // Get Palette Info
    const colors = materialMeta.palettes[version]?.[recolor];
    if (!colors) {
        console.error(`Palette colors for ${material}.${version}.${recolor} not found`);
        return null;
    }
    return colors;
}

/**
 * Get palette configuration for an item from its metadata
 * @param {string} itemId - Item identifier
 * @param {Object} meta - Item metadata
 * @returns {Object|null} Palette config object with {type, base, palette} or null if item doesn't use palette recoloring
 */
export function getPaletteForItem(itemId, meta, paletteNum = 0) {
  if (!meta || !meta.recolors) return null;

  // Get Specific Palette for Item
  const palette = meta.recolors[paletteNum];
  const [version, source, colors] = getBasePalette(palette.material, palette.base ?? null);
  return {
    material: palette.material,
    version: version || palette.default,
    source,
    colors
  };
}

/**
 * Get palette options for item ID, its meta data, and the selection group it belongs to
 * @param {string} itemId 
 * @param {Object} meta 
 * @returns {Array} Array of palette options for the item
 */
export function getPaletteOptions(itemId, meta) {
    // Initialize Palette Options
    const selectionGroup = getSelectionGroup(itemId);
    const paletteOptions = [];
    if (meta.recolors && meta.recolors.length > 0) {
        meta.recolors.forEach((color, idx) => {
            const subGroup = idx !== 0 ? `${selectionGroup}.${color.key}` : selectionGroup;
            const selection = state.selections[subGroup];
            const versions = Object.keys(color.palettes);

            // Get Recolors from Selection
            const [material, version, recolor] = parseRecolorKey(selection?.recolor, color);
            paletteOptions.push({
                idx,
                label: color.label,
                material: color.material,
                versions,
                selectionColor: selection?.recolor,
                colors: getTargetPalette(material, `${version}.${recolor}`)
            });
        });
    }
    return paletteOptions;
}

/**
 * Parse the Recolor Key to Extract Material, Version, and Recolor
 * @param {string} recolorKey 
 * @returns {Array} [material, version, recolor]
 */
export function parseRecolorKey(recolorKey, palette) {
    if (!recolorKey) recolorKey = palette.base;
    let [recolor, version, material] = recolorKey.split(".").reverse();
    if (!material) {
        material = palette.material;
    }
    if (!version) {
        version = palette.default;
    }
    return [material, version, recolor];
}