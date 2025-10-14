# Palette Recolor System Guide

This guide explains how to integrate items with the GPU-accelerated palette recolor system, enabling real-time color variations without creating multiple image files.

## Table of Contents

- [Overview](#overview)
- [Benefits](#benefits)
- [Understanding the System](#understanding-the-system)
- [Creating a Palette File](#creating-a-palette-file)
- [Configuring PALETTE_CONFIG](#configuring-palette_config)
- [Updating Sheet Definitions](#updating-sheet-definitions)
- [Testing Your Integration](#testing-your-integration)
- [Complete Example: Enabling Hair Palette](#complete-example-enabling-hair-palette)
- [Troubleshooting](#troubleshooting)

## Overview

The palette recolor system allows sprite color variants to be generated on-the-fly using GPU-accelerated WebGL shaders. Instead of storing multiple color variants of the same sprite as separate image files, you only need:

1. **One source image** (typically the "base" or "light" variant)
2. **A palette JSON file** defining color mappings

The system automatically:
- Detects if an item should use palette-based recoloring based on its path
- Loads the appropriate palette file at startup
- Recolors sprites in real-time using GPU acceleration (with CPU fallback)

## Benefits

| Benefit | Description |
|---------|-------------|
| 🚀 **Performance** | GPU-accelerated: 90-120ms vs 190-230ms per preview (CPU) |
| 🎨 **Consistency** | Single source of truth for all color variants |
| 🔧 **Maintainability** | Add new colors by editing JSON, not creating image files |
| 💾 **Storage** | Fewer files to maintain (1 source + palette vs N variant files) |
| 🔄 **Flexibility** | Palettes support 1-32 colors (not limited to 8) |

## Understanding the System

### Architecture

The palette system consists of three main components:

1. **`sources/canvas/palette-recolor.js`** - Core palette management
   - Loads palette JSON files
   - Maps items to palettes based on category paths
   - Coordinates between WebGL and CPU implementations

2. **`sources/canvas/webgl-palette-recolor.js`** - GPU implementation
   - WebGL shader for fast color replacement
   - Shared context to avoid browser limits
   - Automatic fallback on errors

3. **`sources/canvas/renderer.js`** - Integration point
   - Calls palette system during sprite rendering

### How Color Matching Works

Both WebGL and CPU implementations use **tolerance-based matching**:

```javascript
// A pixel matches a palette color if RGB values are within tolerance
tolerance = 1  // ±1 per channel (R, G, B)

// Example: Does pixel #CC8665 match palette color #CC8665?
// R: |204 - 204| = 0 ≤ 1 ✓
// G: |134 - 134| = 0 ≤ 1 ✓
// B: |101 - 101| = 0 ≤ 1 ✓
// Match found! Replace with target color.
```

This tolerance allows for slight variations in colors due to compression or anti-aliasing.

### Path-Based Item Matching

Items are matched to palettes using their **path** from sheet definitions:

```javascript
// Example: body.json has path: ["body", "body"]
// This matches the category pattern ['body', 'body'] in PALETTE_CONFIG

// Example: hair_afro.json has path: ["head", "hair", "hair extensions", "afro", "hair_afro"]
// This would match category pattern ['head', 'hair'] if configured
```

## Creating a Palette File

### File Format

Palette files are JSON objects where each key is a variant name and each value is an array of hex colors:

```json
{
  "light": [
    "#271920",
    "#271920",
    "#99423c",
    "#cc8665",
    "#E4A47C",
    "#F9D5BA",
    "#FAECE7",
    "#f8f3eb"
  ],
  "bronze": [
    "#1A1213",
    "#1A1213",
    "#442725",
    "#644133",
    "#7F4C31",
    "#AE6B3F",
    "#D38B59",
    "#D38B59"
  ],
  "source": [
    "#271920",
    "#271920",
    "#99423c",
    "#cc8665",
    "#E4A47C",
    "#F9D5BA",
    "#FAECE7",
    "#f8f3eb"
  ]
}
```

### Palette Requirements

✅ **Required:**
- All variants must have the **same number of colors**
- Must include a `"source"` variant (the base colors to map from)
- Color count must be between **1-32** (WebGL texture limit)
- Colors must be valid hex format (`#RRGGBB`)

✅ **Flexible:**
- Color count can be any number from 1-32 (not limited to 8)
- Different palette types can have different color counts
  - Example: Body palette has 8 colors, cloth palette could have 12

### Color Array Structure

Colors in the array typically represent a **shadow → highlight** progression:

```javascript
[
  "#271920",  // Darkest shadow
  "#271920",  // Deep shadow
  "#99423c",  // Shadow
  "#cc8665",  // Mid-tone
  "#E4A47C",  // Light mid-tone
  "#F9D5BA",  // Highlight
  "#FAECE7",  // Bright highlight
  "#f8f3eb"   // Lightest highlight
]
```

This structure matches how LPC sprites are typically shaded, with darker colors for shadows and lighter colors for highlights.

### Validation Checklist

Before using a palette file, verify:

- [ ] All variants have the same color count
- [ ] Color count is between 1-32
- [ ] All colors are valid hex format (`#RRGGBB` or `#RRGGBB` with optional alpha)
- [ ] `"source"` variant is present
- [ ] Colors represent a logical progression (shadow → highlight)
- [ ] File is valid JSON (use a JSON validator)

## Configuring PALETTE_CONFIG

To enable a palette for items, add an entry to `PALETTE_CONFIG` in `sources/canvas/palette-recolor.js`.

### Location

Find the `PALETTE_CONFIG` array around line 237:

```javascript
const PALETTE_CONFIG = [
  {
    type: 'body',
    file: 'tools/palettes/ulpc-body-palettes.json',
    sourceVariant: 'light',
    categories: [
      ['body', 'body'],
      ['head', 'heads'],
      ['head', 'ears'],
      ['head', 'nose'],
      ['head', 'head_wrinkles'],
      ['head', 'face']
    ]
  }
  // Add new palette types here
];
```

### Configuration Fields

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Unique identifier for this palette (e.g., 'hair', 'cloth') |
| `file` | string | Path to palette JSON file |
| `sourceVariant` | string | Name of the base variant in palette (usually 'light' or 'source') |
| `categories` | array | Array of path patterns that should use this palette |

### Category Path Patterns

Category patterns match the beginning of an item's path array:

```javascript
// Pattern: ['head', 'hair']
// Matches:
//   ['head', 'hair', 'long']  ✓
//   ['head', 'hair', 'short'] ✓
//   ['head', 'ears']          ✗

// Pattern: ['body', 'body']
// Matches:
//   ['body', 'body']          ✓
//   ['body', 'armor']         ✗
```

### Adding a New Palette Type

Example: Enabling the hair palette for all hair items:

```javascript
const PALETTE_CONFIG = [
  {
    type: 'body',
    file: 'tools/palettes/ulpc-body-palettes.json',
    sourceVariant: 'light',
    categories: [
      ['body', 'body'],
      ['head', 'heads'],
      ['head', 'ears'],
      ['head', 'nose'],
      ['head', 'head_wrinkles'],
      ['head', 'face']
    ]
  },
  // Add hair palette
  {
    type: 'hair',
    file: 'tools/palettes/ulpc-hair-palettes.json',
    sourceVariant: 'orange',  // Base color in hair palette
    categories: [
      ['head', 'hair']  // Matches all items with path starting with ['head', 'hair']
    ]
  }
];
```

## Updating Sheet Definitions

When using palette-based recoloring, sheet definition files typically **don't need changes**. The system automatically detects which items should use palettes based on their path.

### What Stays the Same

Sheet definitions still need:
- `variants` array listing all available color variants
- `path` array for category matching
- `credits` section
- Animation and layer configuration

### Example: Hair Item Using Palette

**Before** (explicit variants in file system):
```json
{
  "name": "Afro",
  "variants": [
    "blonde", "ash", "sandy", "platinum",
    "strawberry", "redhead", "ginger", "carrot",
    // ... 27 total variants
  ],
  "path": ["head", "hair", "hair extensions", "afro", "hair_afro"]
}
```

The generator would look for files like:
- `spritesheets/hair/afro/adult/blonde.png`
- `spritesheets/hair/afro/adult/ash.png`
- etc.

**After** (with palette system):

Same sheet definition, but you only need:
- `spritesheets/hair/afro/adult/orange.png` (source variant)

The palette system automatically generates the other 26 variants at runtime.

### Verifying Variant Compatibility

Before enabling palette recoloring for an item:

1. Check the item's variant list in its sheet definition
2. Compare with variants in the palette file
3. Ensure variants match (or add missing variants to palette)

```bash
# Example: Check if hair_afro variants match hair palette
cat sheet_definitions/hair_afro.json | grep -A 30 '"variants"'
cat tools/palettes/ulpc-hair-palettes.json | grep -E '^\s+"[^"]+":' | head -20
```

## Testing Your Integration

### Console Commands

The generator exposes several debugging functions for testing palette recoloring:

#### Check Configuration
```javascript
getPaletteRecolorConfig()
// Returns: { forceCPU: false, useWebGL: true, activeMode: "webgl" }
```

#### View Statistics
```javascript
getPaletteRecolorStats()
// Shows breakdown of operations:
// 📊 Palette Recolor Statistics:
//   WebGL (GPU): 450 (95.7%)
//   CPU: 0 (0.0%)
//   Fallback: 20 (4.3%)
//   Total: 470
```

#### Force CPU Mode (Testing)
```javascript
setPaletteRecolorMode("cpu")
// Switch back to GPU:
setPaletteRecolorMode("webgl")
```

#### Reset Statistics
```javascript
resetPaletteRecolorStats()
```

### Visual Verification Steps

1. **Load the generator** in your browser
2. **Open browser console** (F12)
3. **Check palette loading**:
   ```
   Loaded body palette with 22 variants
   Loaded hair palette with 27 variants  // If you added hair
   ```
4. **Select an item** that should use palette recoloring
5. **Change color variants** and verify smooth rendering
6. **Check statistics**: Run `getPaletteRecolorStats()` to verify GPU usage

### Performance Testing

Compare WebGL vs CPU performance:

```javascript
// 1. Reset stats
resetPaletteRecolorStats()

// 2. Generate some previews with WebGL (default)
// (interact with the generator, change colors)

// 3. Check timing
getPaletteRecolorStats()  // Note WebGL operations

// 4. Force CPU mode
setPaletteRecolorMode("cpu")
resetPaletteRecolorStats()

// 5. Generate same previews with CPU
// (repeat same interactions)

// 6. Compare
getPaletteRecolorStats()  // Compare operation counts and feel the difference
```

Expected performance:
- **WebGL**: 90-120ms per full spritesheet preview
- **CPU**: 190-230ms per full spritesheet preview

## Complete Example: Enabling Hair Palette

Let's walk through enabling the hair palette for all hair items.

### Step 1: Verify Palette File Exists

```bash
# Check if hair palette file exists
ls tools/palettes/ulpc-hair-palettes.json

# Preview its structure
head -20 tools/palettes/ulpc-hair-palettes.json
```

Expected output:
```json
{
  "orange": ["#260D14", "#6A1108", ...],
  "ash": ["#2D061B", "#642442", ...],
  "blonde": ["#331313", "#552B15", ...],
  ...
  "source": ["#260D14", "#6A1108", ...]
}
```

### Step 2: Add Hair Palette to PALETTE_CONFIG

Edit `sources/canvas/palette-recolor.js` around line 237:

```javascript
const PALETTE_CONFIG = [
  {
    type: 'body',
    file: 'tools/palettes/ulpc-body-palettes.json',
    sourceVariant: 'light',
    categories: [
      ['body', 'body'],
      ['head', 'heads'],
      ['head', 'ears'],
      ['head', 'nose'],
      ['head', 'head_wrinkles'],
      ['head', 'face']
    ]
  },
  {
    type: 'hair',
    file: 'tools/palettes/ulpc-hair-palettes.json',
    sourceVariant: 'orange',
    categories: [
      ['head', 'hair']
    ]
  }
];
```

### Step 3: Identify Matching Hair Items

Hair items have paths starting with `['head', 'hair']`:

```bash
# Find all hair items
grep -l '"path".*"head".*"hair"' sheet_definitions/*.json

# Example output:
# sheet_definitions/hair_afro.json
# sheet_definitions/hair_long.json
# sheet_definitions/hair_short.json
# ... etc
```

These items will now automatically use the hair palette.

### Step 4: Ensure Source Variant Exists

For each hair item, ensure the source variant image exists:

```bash
# Example: Check if afro has 'orange' variant (source for hair palette)
ls spritesheets/hair/afro/adult/orange.png
```

If missing, you'll need to create or convert the source variant file.

### Step 5: Test in Browser

1. Load the generator
2. Open console (F12)
3. Look for: `Loaded hair palette with 27 variants`
4. Select a hair style
5. Change hair colors
6. Run `getPaletteRecolorStats()` to verify GPU usage

### Before/After Comparison

**Before:**
- 27 PNG files per hair style
- Manual palette generation using lpctools
- Larger repository size

**After:**
- 1 PNG file per hair style (source variant)
- Real-time GPU recoloring
- ~60% faster rendering
- Smaller repository

## Troubleshooting

### Palette Not Loading

**Symptom**: Console shows no "Loaded X palette" message

**Solutions**:
- Check file path in PALETTE_CONFIG is correct
- Verify JSON file is valid (use JSON validator)
- Check browser console for fetch errors
- Ensure palette file is committed to repository

### Colors Look Wrong

**Symptom**: Recolored sprites have incorrect colors

**Solutions**:
- Verify source variant matches `sourceVariant` in config
- Check that source image uses exact palette colors
- Verify tolerance matching (some colors may be slightly off due to anti-aliasing)
- Try forcing CPU mode to debug: `setPaletteRecolorMode("cpu")`

### Performance Issues

**Symptom**: Generator feels slow or laggy

**Solutions**:
- Check if WebGL is active: `getPaletteRecolorConfig()`
- View stats to see GPU usage: `getPaletteRecolorStats()`
- Check for fallbacks (indicates WebGL errors)
- Clear browser cache
- Try different browser (WebGL support varies)

### Missing Variants

**Symptom**: Some color variants don't appear in generator

**Solutions**:
- Check sheet definition `variants` array matches palette file keys
- Verify palette file has all expected variants
- Check for typos in variant names (case-sensitive)
- Console errors may indicate missing variants

### WebGL Context Limit

**Symptom**: Error about too many WebGL contexts

**Solutions**:
- The system uses a shared WebGL context to avoid this
- If error persists, force CPU mode: `setPaletteRecolorMode("cpu")`
- Close other browser tabs using WebGL
- Restart browser

### Palette Colors Don't Match Existing Variants

**Symptom**: Palette-generated colors differ from original PNG files

**Solutions**:
- Source variant may have been modified
- Palette file may be outdated
- Regenerate palette using lpctools
- Update source variant to use exact palette colors
- Adjust palette tolerance if needed (requires code changes)

## Additional Resources

- **Performance Profiling**: See [PERFORMANCE_PROFILING.md](PERFORMANCE_PROFILING.md)
- **LPC Tools**: [tools/LPCTOOLS.md](tools/LPCTOOLS.md)
- **Existing Palettes**: [tools/palettes/](tools/palettes/)
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)

## Questions?

If you have questions or run into issues not covered here:

1. Check existing [GitHub Issues](https://github.com/liberatedpixelcup/Universal-LPC-Spritesheet-Character-Generator/issues)
2. Search for console error messages
3. Open a new issue with:
   - Browser and OS version
   - Console output
   - Steps to reproduce
   - Output of `getPaletteRecolorConfig()` and `getPaletteRecolorStats()`
