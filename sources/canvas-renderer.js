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
let previewCanvas = null;
let previewCtx = null;
let loadedImages = {};
let imagesToLoad = 0;
let imagesLoaded = 0;

// Animation preview state
let animationFrames = [1, 2, 3, 4, 5, 6, 7, 8]; // default for walk
let animRowStart = 8; // default for walk (row number)
let animRowNum = 4; // default for walk (number of rows to stack)
let currentFrameIndex = 0;
let lastFrameTime = Date.now();
let animationFrameId = null;

// Animation definitions with frame cycles
const ANIMATION_CONFIGS = {
  'spellcast': { row: 0, num: 4, cycle: [0, 1, 2, 3, 4, 5, 6] },
  'thrust': { row: 4, num: 4, cycle: [0, 1, 2, 3, 4, 5, 6, 7] },
  'walk': { row: 8, num: 4, cycle: [1, 2, 3, 4, 5, 6, 7, 8] },
  'slash': { row: 12, num: 4, cycle: [0, 1, 2, 3, 4, 5] },
  'shoot': { row: 16, num: 4, cycle: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  'hurt': { row: 20, num: 1, cycle: [0, 1, 2, 3, 4, 5] },
  'climb': { row: 21, num: 1, cycle: [0, 1, 2, 3, 4, 5] },
  'idle': { row: 22, num: 4, cycle: [0, 0, 1] },
  'jump': { row: 26, num: 4, cycle: [0, 1, 2, 3, 4, 1] },
  'sit': { row: 30, num: 4, cycle: [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2] },
  'emote': { row: 34, num: 4, cycle: [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2] },
  'run': { row: 38, num: 4, cycle: [0, 1, 2, 3, 4, 5, 6, 7] },
  'watering': { row: 4, num: 4, cycle: [0, 1, 4, 4, 4, 4, 5] },
  'combat': { row: 42, num: 4, cycle: [0, 0, 1] },
  '1h_slash': { row: 46, num: 4, cycle: [0, 1, 2, 3, 4, 5, 6] },
  '1h_backslash': { row: 46, num: 4, cycle: [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12] },
  '1h_halfslash': { row: 50, num: 4, cycle: [0, 1, 2, 3, 4, 5] }
};

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
 * Initialize the preview canvas
 */
export function initPreviewCanvas(previewCanvasElement) {
  previewCanvas = previewCanvasElement;
  previewCtx = previewCanvas.getContext('2d');
  previewCanvas.width = 4 * FRAME_SIZE; // 256px
  previewCanvas.height = FRAME_SIZE; // 64px
}

/**
 * Set which animation to preview
 */
export function setPreviewAnimation(animationName) {
  const config = ANIMATION_CONFIGS[animationName];
  if (!config) {
    console.error('Unknown animation:', animationName);
    return;
  }

  animationFrames = config.cycle;
  animRowStart = config.row;
  animRowNum = config.num;
  currentFrameIndex = 0;

  return animationFrames; // Return for display
}

/**
 * Get list of available animations for dropdown
 */
export function getAnimationList() {
  return [
    { value: 'spellcast', label: 'Spellcast' },
    { value: 'thrust', label: 'Thrust' },
    { value: 'walk', label: 'Walk' },
    { value: 'slash', label: 'Slash' },
    { value: 'shoot', label: 'Shoot' },
    { value: 'hurt', label: 'Hurt' },
    { value: 'climb', label: 'Climb' },
    { value: 'idle', label: 'Idle' },
    { value: 'jump', label: 'Jump' },
    { value: 'sit', label: 'Sit' },
    { value: 'emote', label: 'Emote' },
    { value: 'run', label: 'Run' },
    { value: 'watering', label: 'Watering' },
    { value: 'combat', label: 'Combat Idle' },
    { value: '1h_slash', label: '1-Handed Slash' },
    { value: '1h_backslash', label: '1-Handed Backslash' },
    { value: '1h_halfslash', label: '1-Handed Halfslash' }
  ];
}

/**
 * Start the preview animation loop
 */
export function startPreviewAnimation() {
  if (animationFrameId !== null) {
    return; // Already running
  }

  function nextFrame() {
    const fpsInterval = 1000 / 8; // 8 FPS
    const now = Date.now();
    const elapsed = now - lastFrameTime;

    if (elapsed > fpsInterval) {
      lastFrameTime = now - (elapsed % fpsInterval);

      if (previewCtx && canvas) {
        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

        currentFrameIndex = (currentFrameIndex + 1) % animationFrames.length;
        const currentFrame = animationFrames[currentFrameIndex];

        // Draw stacked rows from main canvas to preview
        for (let i = 0; i < animRowNum; i++) {
          previewCtx.drawImage(
            canvas,
            currentFrame * FRAME_SIZE,           // source x
            (animRowStart + i) * FRAME_SIZE,     // source y
            FRAME_SIZE,                          // source width
            FRAME_SIZE,                          // source height
            i * FRAME_SIZE,                      // dest x (spread horizontally)
            0,                                   // dest y
            FRAME_SIZE,                          // dest width
            FRAME_SIZE                           // dest height
          );
        }
      }
    }

    animationFrameId = requestAnimationFrame(nextFrame);
  }

  nextFrame();
}

/**
 * Stop the preview animation loop
 */
export function stopPreviewAnimation() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

/**
 * Build sprite path from item metadata for a specific animation
 */
function getSpritePath(itemId, variant, bodyType, animation, layerNum = 1, selections = {}, meta = null) {
  if (!meta) {
    meta = window.itemMetadata[itemId];
  }
  if (!meta) return null;

  const layerKey = `layer_${layerNum}`;
  const layer = meta.layers?.[layerKey];
  if (!layer) return null;

  // Get the file path for this body type
  let basePath = layer[bodyType];
  if (!basePath) return null;

  // Replace template variables like ${head}
  if (basePath.includes('${head}')) {
    // Find the selected head and extract its type from the itemId
    for (const [categoryPath, selection] of Object.entries(selections)) {
      const selMeta = window.itemMetadata[selection.itemId];
      if (selMeta && selMeta.path && selMeta.path[0] === 'head' && selMeta.path[1] === 'heads') {
        // Extract head type from itemId: "head-heads-heads_human_male" -> "male"
        // The pattern is usually: heads_<type>_<subtype> or heads_<type>
        const itemIdParts = selection.itemId.split('_');
        const headType = itemIdParts[itemIdParts.length - 1]; // Last part is the type (male, female, elderly, etc.)
        basePath = basePath.replace('${head}', headType);
        break;
      }
    }
  }

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

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Build list of items to draw
  const itemsToDraw = [];

  for (const [categoryPath, selection] of Object.entries(selections)) {
    const { itemId, variant } = selection;
    const meta = window.itemMetadata[itemId];

    if (!meta) continue;

    // Check if this body type is supported
    if (!meta.required.includes(bodyType)) {
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
        // Skip if item doesn't have animations array (custom animations only)
        if (!meta.animations || meta.animations.length === 0) {
          continue;
        }

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

        const spritePath = getSpritePath(itemId, variant, bodyType, animName, layerNum, selections, meta);

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

  // Load and draw images
  imagesLoaded = 0;
  imagesToLoad = 0;

  for (const item of itemsToDraw) {
    try {
      const img = await loadImage(item.spritePath);
      // Draw at the correct y position for this animation
      ctx.drawImage(img, 0, item.yPos);
    } catch (err) {
      console.warn(`Failed to load sprite: ${item.spritePath} (${item.itemId} - ${item.animation})`);
    }
  }
}
