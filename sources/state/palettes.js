// Function to get palette file info
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

// Function to get palette file info
export function getTargetPalette(material, targetColor) {
    // Check Palette Material Exists
    const materialMeta = window.paletteMetadata?.materials[material];
    if (!materialMeta) {
        console.error(`Palettes for ${material} not found`);
        return null;
    }

    // Split Colors
    let [version, recolor] = targetColor.split("_");
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