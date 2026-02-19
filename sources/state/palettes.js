// Palette utilities
import { state, getSelectionGroup } from "./state.js";
import { replaceInPath } from './path.js';

/**
 * Function to get multiple recolor options from selections.
 * @param {string} itemId - The ID of the item to get recolors for
 * @param {Array} selections - The array of selections to filter
 * @returns {Object} An object mapping type_name to recolor
 */
export function getMultiRecolors(itemId, selections) {
    // Implementation for getting multiple recolor options from selections
    const meta = window.itemMetadata[itemId];

    // Filter Selections to Item ID
    const recolors = {};
    for (const [typeName, selection] of Object.entries(selections)) {
        const subMeta = window.itemMetadata?.[selection.itemId];
        if (!subMeta || !subMeta.type_name || subMeta.type_name !== meta.type_name) continue;

        // Process Each Item
        if (selection.subId) {
            const { type_name } = subMeta.recolors[selection.subId];
            recolors[type_name] = selection.recolor;
        } else {
            recolors[subMeta.type_name] = selection.recolor;
        }
    }
    return recolors;
}

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
    let materialMeta = window.paletteMetadata?.materials[material];
    if (!materialMeta) {
        console.error(`Palettes for ${material} not found`);
        return null;
    }

    // Parse Recolor Key
    let [newMat, version, recolor] = parseRecolorKey(targetColor, materialMeta);
    if(newMat !== null) {
        const newMaterialMeta = window.paletteMetadata?.materials[newMat];
        if (newMaterialMeta) {
            material = newMat;
            materialMeta = newMaterialMeta;
        }
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
export function getPalettesForItem(itemId, meta) {
  if (!meta || !meta.recolors) return null;

  // Get Specific Palette for Item
  const sources = {};
  for (const palette of meta.recolors) {
    const [version, source, colors] = getBasePalette(palette.material, palette.base ?? null);
    sources[palette.type_name ?? meta.type_name] = {
        material: palette.material,
        version: version || palette.default,
        source,
        colors
    };
  }
  return sources;
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
            const subGroup = idx !== 0 ? color.type_name : selectionGroup;
            const selection = state.selections[subGroup];
            const versions = Object.keys(color.palettes);

            // Get Recolors from Selection
            const [material, version, recolor] = parseRecolorKey(selection?.recolor, color);
            paletteOptions.push({
                idx,
                label: color.label,
                default: color.default,
                material: color.material,
                type_name: color.type_name ?? null,
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
 * @param {string} recolorKey Recolor Key to parse (either "material.version.recolor" or "version.recolor" or "recolor")
 * @param {Object} palette - Palette metadata object
 * @returns {Array} [material, version, recolor]
 */
export function parseRecolorKey(recolorKey, palette) {
    if (!recolorKey) recolorKey = palette?.base;
    let [recolor, version, material] = recolorKey.split(".").reverse();
    if (!material) {
        material = palette?.material;
    }
    if (!version) {
        version = palette?.default;
    }
    return [material, version, recolor];
}

/**
 * 
 * @param {Object} meta - Metadata for the asset
 * @return {Array} Array of layers to load
 */
export function getLayersToLoad(meta) {
    // Check if this item uses a custom animation
    const layer1 = meta.layers?.layer_1;
    const hasCustomAnimation = layer1?.custom_animation;
    const layer1CustomAnimation = hasCustomAnimation ? layer1.custom_animation : null;

    // Collect all layers for this item
    // Only include layers that match layer_1's custom animation (if any)
    const layersToLoad = [];
    for (let layerNum = 1; layerNum < 10; layerNum++) {
        const layer = meta.layers?.[`layer_${layerNum}`];
        if (!layer) break;

        let layerPath = layer[state.bodyType];
        if (!layerPath) continue;

        // Filter: only include layers with matching custom animation
        if (layer1CustomAnimation) {
            if (layer.custom_animation !== layer1CustomAnimation) {
                continue;
            }
        }

        // Replace template variables like ${head}
        if (layerPath.includes('${')) {
            layerPath = replaceInPath(layerPath, state.selections, meta);
        }

        const hasCustomAnim = layer.custom_animation;
        let imagePath;
        if (hasCustomAnim) {
            imagePath = `spritesheets/${layerPath}.png`;
        } else {
            const defaultAnim = meta.animations.includes('walk') ? 'walk' : meta.animations[0];
            imagePath = `spritesheets/${layerPath}${defaultAnim}.png`;
        }

        layersToLoad.push({
            zPos: layer.zPos || 100,
            path: imagePath
        });
    }
    return layersToLoad.sort((a, b) => a.zPos - b.zPos);
}