// Canvas rendering module for Mithril UI
// Simplified renderer that draws character sprites based on selections

const FRAME_SIZE = 64;
const SHEET_HEIGHT = 3456; // Full universal sheet height
const SHEET_WIDTH = 832; // 13 frames * 64px

// Animation offsets (y-positions on spritesheet) - matches chargen.js base_animations
const ANIMATIONS = {
  spellcast: 0,
  thrust: 4 * FRAME_SIZE,
  walk: 8 * FRAME_SIZE,
  slash: 12 * FRAME_SIZE,
  shoot: 16 * FRAME_SIZE,
  hurt: 20 * FRAME_SIZE,
  climb: 21 * FRAME_SIZE,
  idle: 22 * FRAME_SIZE,
  jump: 26 * FRAME_SIZE,
  sit: 30 * FRAME_SIZE,
  emote: 34 * FRAME_SIZE,
  run: 38 * FRAME_SIZE,
  combat_idle: 42 * FRAME_SIZE,
  backslash: 46 * FRAME_SIZE,
  halfslash: 50 * FRAME_SIZE
};

// Map metadata animation names to actual folder names
// Metadata uses "combat", "1h_slash", etc. but folders are named differently
const METADATA_TO_FOLDER = {
  'combat': 'combat_idle',
  '1h_slash': 'backslash',
  '1h_backslash': 'backslash',
  '1h_halfslash': 'halfslash'
};

let canvas = null;
let ctx = null;
let loadedImages = {};
let imagesToLoad = 0;
let imagesLoaded = 0;

/**
 * Initialize the canvas
 */
export function initCanvas(canvasElement) {
  canvas = canvasElement;
  ctx = canvas.getContext('2d');
  canvas.width = SHEET_WIDTH;
  canvas.height = SHEET_HEIGHT;
}

/**
 * Build sprite path from item metadata for a specific animation
 */
function getSpritePath(itemId, variant, bodyType, animation, layerNum = 1) {
  const meta = window.itemMetadata[itemId];
  if (!meta) return null;

  const layerKey = `layer_${layerNum}`;
  const layer = meta.layers?.[layerKey];
  if (!layer) return null;

  // Get the file path for this body type
  const basePath = layer[bodyType];
  if (!basePath) return null;

  // If no variant specified, try to extract from itemId
  if (!variant) {
    const parts = itemId.split('_');
    variant = parts[parts.length - 1];
  }

  // Build full path: spritesheets/ + basePath + animation/ + variant.png
  return `spritesheets/${basePath}${animation}/${variant}.png`;
}

/**
 * Get zPos for a layer
 */
function getZPos(itemId, layerNum = 1) {
  const meta = window.itemMetadata[itemId];
  if (!meta) return 100;

  const layerKey = `layer_${layerNum}`;
  const layer = meta.layers?.[layerKey];

  return layer?.zPos || 100;
}

/**
 * Load an image
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (loadedImages[src]) {
      resolve(loadedImages[src]);
      return;
    }

    const img = new Image();
    img.onload = () => {
      loadedImages[src] = img;
      imagesLoaded++;
      resolve(img);
    };
    img.onerror = () => {
      console.error(`Failed to load image: ${src}`);
      imagesLoaded++;
      reject(new Error(`Failed to load ${src}`));
    };
    img.src = src;
    imagesToLoad++;
  });
}

/**
 * Render character based on selections
 */
export async function renderCharacter(selections, bodyType) {
  if (!canvas || !ctx) {
    console.error('Canvas not initialized');
    return;
  }

  console.log('renderCharacter called with:', { selections, bodyType });

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Build list of items to draw
  const itemsToDraw = [];

  for (const [categoryPath, selection] of Object.entries(selections)) {
    console.log('Processing selection:', categoryPath, selection);
    const { itemId, variant } = selection;
    const meta = window.itemMetadata[itemId];
    console.log('Metadata for', itemId, ':', meta);

    if (!meta) continue;

    // Check if this body type is supported
    if (!meta.required.includes(bodyType)) {
      console.log(`Skipping ${itemId} - not available for ${bodyType}`);
      continue;
    }

    // Process all layers and animations for this item
    for (let layerNum = 1; layerNum < 10; layerNum++) {
      // Check if this layer exists
      const layerKey = `layer_${layerNum}`;
      if (!meta.layers?.[layerKey]) break;

      const zPos = getZPos(itemId, layerNum);

      // Add each animation for this layer
      for (const [animName, yPos] of Object.entries(ANIMATIONS)) {
        // Map folder name to metadata name for checking support
        // e.g., "combat_idle" -> check for "combat" or "1h_slash" in metadata
        let metadataAnimName = animName;
        if (animName === 'combat_idle') {
          // combat_idle is supported if item has "combat" OR "1h_slash" in metadata
          if (!meta.animations.includes('combat') && !meta.animations.includes('1h_slash')) {
            continue;
          }
        } else if (animName === 'backslash') {
          // backslash is supported if item has "1h_slash" OR "1h_backslash" in metadata
          if (!meta.animations.includes('1h_slash') && !meta.animations.includes('1h_backslash')) {
            continue;
          }
        } else if (animName === 'halfslash') {
          // halfslash is supported if item has "1h_halfslash" in metadata
          if (!meta.animations.includes('1h_halfslash')) {
            continue;
          }
        } else {
          // For all other animations, direct match required
          if (!meta.animations.includes(animName)) continue;
        }

        const spritePath = getSpritePath(itemId, variant, bodyType, animName, layerNum);

        itemsToDraw.push({
          itemId,
          variant,
          spritePath,
          zPos,
          layerNum,
          animation: animName,
          yPos
        });
      }
    }
  }

  // Sort by animation first (to group them), then by zPos
  itemsToDraw.sort((a, b) => {
    if (a.yPos !== b.yPos) return a.yPos - b.yPos;
    return a.zPos - b.zPos;
  });

  console.log('Items to draw:', itemsToDraw.length, 'animation frames');

  // Group by animation to see what's being drawn for each row
  const byAnimation = {};
  for (const item of itemsToDraw) {
    if (!byAnimation[item.animation]) {
      byAnimation[item.animation] = [];
    }
    byAnimation[item.animation].push(`${item.itemId} (z:${item.zPos})`);
  }
  console.table(byAnimation);

  // Load and draw images
  imagesLoaded = 0;
  imagesToLoad = 0;

  for (const item of itemsToDraw) {
    try {
      const img = await loadImage(item.spritePath);
      // Draw at the correct y position for this animation
      ctx.drawImage(img, 0, item.yPos);
    } catch (err) {
      console.error(`Failed to render ${item.itemId} ${item.animation} (${item.spritePath}):`, err);
    }
  }
}
