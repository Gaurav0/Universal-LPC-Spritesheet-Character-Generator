# Performance Profiling Guide

## Overview

The Universal LPC Spritesheet Character Generator now includes built-in performance profiling to help identify bottlenecks in:
- **Drawing/rendering operations** (canvas drawing, image compositing)
- **UI blocking** (main thread work, DOM updates)
- **Image loading** (individual image load times)
- **Animation performance** (frame rate monitoring)

## Quick Start

### 1. Serve the Application Locally

```bash
# Generate the HTML (if you made changes to sources)
node scripts/generate_sources.js

# Start local server
npx http-server -p 8080

# Open browser to: http://localhost:8080
```

### 2. Enable Profiling

The profiler uses the same `DEBUG` flag as the application's console logging:

**Automatic Activation:**
- ✅ **Enabled on localhost** (default)
- ❌ **Disabled in production** (default)

**Manual Override:**
- Add `?debug=true` to URL to enable anywhere
- Add `?debug=false` to URL to disable even on localhost

When enabled, you'll see:
```
📊 Performance Profiler enabled
💡 Type "profiler.report()" in console for summary.
```

**Runtime Control:**
You can also enable/disable at any time via console:
```javascript
profiler.enable()   // Start profiling
profiler.disable()  // Stop profiling
```

The profiler is always available at `window.profiler`.

### 3. Use the Application

Interact with the character generator:
- Select different body types
- Add/remove clothing items
- Change animations
- Search for items
- Export spritesheets

As you interact, performance data is collected automatically (when enabled).

## Observing Performance

### Method 1: Chrome DevTools Performance Tab (Best for Visual Analysis)

1. Open Chrome DevTools (F12)
2. Go to **Performance** tab
3. Click **Record** (⚫)
4. Interact with the character generator (click items, change options)
5. Click **Stop** (⏹️)

**What you'll see:**
- 🔵 **User Timing** track shows all our custom marks:
  - `redraw` - Full redraw cycle time
  - `loadItemsToDraw` - Image loading orchestration
  - `drawItemsToDraw` - Canvas rendering time
  - `drawPreviews` - Thumbnail generation
  - `showOrHideElements` - DOM filtering/updates
  - `image-load:*` - Individual image load times

- 📊 **Main thread** shows JavaScript execution
- 🎬 **Frames** shows frame rate (green = 60fps, yellow/red = dropped frames)
- 💾 **Memory** shows heap usage over time

### Method 2: Console Performance Report

Open the browser console and type:

```javascript
profiler.report()
```

**Example output:**
```
📊 Performance Report
  ⏱️ Timing Summary
    imageLoads: 45 ops, 1250.32ms total, 27.78ms avg
    draws: 12 ops, 345.67ms total, 28.81ms avg
    previews: 8 ops, 156.23ms total, 19.53ms avg
    domUpdates: 5 ops, 89.45ms total, 17.89ms avg

  🎬 Current FPS: 58

  💾 Memory Usage
    usedJSHeapSize: 45.23 MB
    totalJSHeapSize: 67.50 MB
    jsHeapSizeLimit: 2048.00 MB

  📏 All Measurements (top 20 by duration)
    Operation                          Duration (ms)
    ─────────────────────────────────────────────
    drawItemsToDraw                    145.23
    loadItemsToDraw                    89.45
    redraw                             78.90
    ...

💡 Tip: Open DevTools → Performance tab and click Record to see visual timeline
```

### Method 3: Real-Time Console Warnings

Slow operations (>50ms) are automatically logged:

```
⚠️ Slow operation: drawItemsToDraw took 152.34ms
🐌 Long task blocked UI for 87.65ms at 1234.56ms
```

### Method 4: Live FPS Monitoring (Verbose Mode)

Enable verbose logging in the console:

```javascript
profiler.verbose = true;
```

You'll see:
```
✅ FPS: 60
🔵 Mark: redraw:start
⏱️ redraw: 45.67ms
```

## What to Look For

### Performance Issues

| Symptom | Likely Cause | Location |
|---------|--------------|----------|
| **Slow initial load** | Too many images loading sequentially | `image-load:*` marks, Network tab |
| **Laggy UI when clicking** | Heavy DOM updates or rendering | `showOrHideElements`, `drawPreviews` |
| **Stuttering animation** | Dropped frames, FPS < 30 | Frames track, `drawItemsToDraw` |
| **Long pauses** | Blocking operations > 50ms | Long task warnings, Main thread |
| **Memory growth** | Image cache not releasing | Memory tab, heap snapshots |

### Good Performance Baseline

- ✅ **FPS**: 55-60 (smooth animation)
- ✅ **Redraw time**: < 100ms
- ✅ **Image load**: < 30ms per image
- ✅ **DOM updates**: < 50ms
- ✅ **No long tasks**: No warnings about UI blocking

## Advanced Usage

### Clear Performance Data

```javascript
profiler.clear()
```

### Get Current FPS

```javascript
profiler.getFPS()
// Returns: 58
```

### Get Memory Usage (Chrome only)

```javascript
profiler.getMemoryUsage()
// Returns: { usedJSHeapSize: "45.23 MB", ... }
```

### Time Custom Code

```javascript
profiler.mark('myOperation:start');
// ... your code ...
profiler.mark('myOperation:end');
profiler.measure('myOperation', 'myOperation:start', 'myOperation:end');
```

## Instrumented Functions

The following operations are automatically profiled:

| Function | What it measures | Category |
|----------|-----------------|----------|
| `redraw()` | Full character redraw cycle | draws |
| `loadItemsToDraw()` | Setting up image loads | imageLoads |
| `drawItemsToDraw()` | Canvas rendering (main bottleneck) | draws |
| `drawItemSheet()` | Individual item compositing | draws |
| `drawPreviews()` | Thumbnail generation | previews |
| `showOrHideElements()` | DOM filtering/visibility updates | domUpdates |
| `loadImage()` | Individual image load time | imageLoads |

## Enabling and Disabling the Profiler

### Default Behavior

| Environment | Profiler State | Debug Logs |
|-------------|----------------|------------|
| localhost | ✅ Enabled | ✅ Enabled |
| Production | ❌ Disabled | ❌ Disabled |

### Manual Control

**Via URL:**
```
http://localhost:8080/?debug=true   # Force enable anywhere
http://localhost:8080/?debug=false  # Force disable anywhere
```

**Via Console:**
```javascript
profiler.enable()   // Enable at runtime
profiler.disable()  // Disable at runtime
```

**Performance Impact:**
- When disabled: **zero overhead** (all methods early-return)
- When enabled: <1ms per operation (minimal impact)

## Next Steps

After identifying bottlenecks with the profiler:

1. **If image loading is slow (>60% of time)**:
   - Consider sprite atlases
   - Implement HTTP/2 preloading
   - Use ImageBitmap API

2. **If drawing is slow (>60% of time)**:
   - Implement OffscreenCanvas + Web Workers
   - Optimize canvas operations
   - Reduce composite layers

3. **If DOM updates are slow**:
   - Debounce filter operations
   - Use virtual scrolling for long lists
   - Optimize jQuery selectors

4. **If memory is growing**:
   - Implement image cache eviction
   - Dispose unused canvas contexts
   - Profile with Chrome Memory tab

## Troubleshooting

### "profiler is not defined"

The profiler should always be available at `window.profiler`. If not:
- Make sure the page has loaded completely
- Check that `sources/performance-profiler.js` is included in the HTML
- Verify in DevTools → Console that there are no script errors

### No User Timing marks in DevTools

Make sure:
1. You've interacted with the app while recording
2. You're looking at the **User Timing** swim lane (expand it)
3. You're zoomed in enough to see the marks

### Performance seems worse with profiler enabled

The profiler itself has minimal overhead (<1ms per operation). If you see significant impact, you can reduce `verbose` mode or check that you're not accidentally running in a loop.

## Browser Support

- ✅ **Chrome/Edge**: Full support (including memory profiling)
- ✅ **Firefox**: Full support (except memory API)
- ✅ **Safari**: Full support

## Example Workflow

1. **Baseline measurement**:
   ```javascript
   profiler.clear();
   // Load default character
   profiler.report();
   ```

2. **Test specific scenario**:
   ```javascript
   profiler.clear();
   // Add 10 clothing items
   // Change animation 5 times
   profiler.report();
   ```

3. **Compare before/after optimization**:
   - Record metrics with `profiler.report()`
   - Make code changes
   - Record again and compare

## Contributing

When optimizing performance:
1. Always profile first (don't guess!)
2. Document baseline metrics
3. Make targeted changes
4. Measure improvement
5. Include before/after metrics in PR

---

**Questions?** See the Performance Profiler source code in `sources/performance-profiler.js`
