import { replaceInPath } from './path.js';
import { state } from './state.js';
import { variantToFilename } from '../utils/helpers.js';

/**
 * Get Layers to Load for the given metadata and variant
 * @param {Object} meta - Metadata for the asset
 * @param {string|null} variant - Variant name for the asset (optional)
 * @return {Array} Array of layers to load
 */
export function getLayersToLoad(meta, variant = null) {
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
        continue; // Skip layers with different custom animations
      }
    }

    // Replace template variables like ${head}
    if (layerPath.includes('${')) {
      layerPath = replaceInPath(layerPath, state.selections, meta);
    }

    const hasCustomAnim = layer.custom_animation;
    let imagePath;
    const variantFileName = variant !== null ? `${variantToFilename(variant)}` : '';
    if (hasCustomAnim) {
      imagePath = `spritesheets/${layerPath}${variantFileName}.png`;
    } else {
      const defaultAnim = meta.animations.includes('walk') ? 'walk' : meta.animations[0];
      imagePath = `spritesheets/${layerPath}${defaultAnim}${variantFileName ? `/${variantFileName}` : ''}.png`;
    }

    layersToLoad.push({
      zPos: layer.zPos ?? 100,
      path: imagePath
    });
  }
  return layersToLoad.sort((a, b) => a.zPos - b.zPos);
}