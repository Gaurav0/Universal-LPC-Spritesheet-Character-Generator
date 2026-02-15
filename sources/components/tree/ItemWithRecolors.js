// Item with recolors component
import { state, getSelectionGroup, applyMatchBodyColor } from '../../state/state.js';
import { capitalize } from '../../utils/helpers.js';
import { getImageToDraw, getPaletteForItem } from '../../canvas/palette-recolor.js';

const classNames = window.classNames;

export const ItemWithRecolors = {
    view: function(vnode) {
        const { itemId, meta, isSearchMatch, isCompatible, tooltipText } = vnode.attrs;
        const compactDisplay = state.compactDisplay;
        const displayName = meta.name;
        const rootViewNode = vnode;
        let nodePath = itemId;
        if (displayName === 'Body Color') {
            nodePath = 'body-body';
        }
        const selectedColor = state.selectedColor ?? meta.recolor;
        const isExpanded = state.expandedNodes[nodePath] || false;

        // Build palette/color options for all recolor fields
        let paletteOptions = [];
        let paletteSelectors = [];
        let selectedPalettes = rootViewNode.state.selectedPalettes || {};
        if (meta.recolors && meta.recolors.length > 0) {
            meta.recolors.forEach((recolor, idx) => {
                const palettes = Object.keys(recolor.variants);
                const selectedPalette = selectedPalettes[idx]?.palette || palettes[0];
                const selectedColor = selectedPalettes[idx]?.color || recolor.variants[selectedPalette][0];
                paletteOptions.push({
                    idx,
                    material: recolor.material,
                    palettes,
                    selectedPalette,
                    colors: recolor.variants[selectedPalette],
                    selectedColor
                });
                paletteSelectors.push(
                    m("span.palette-selector.ml-2", {
                        title: `Choose palette for ${recolor.material}`,
                        onclick: (e) => {
                            e.stopPropagation();
                            rootViewNode.state.showPaletteModal = idx;
                        }
                    }, [
                        m("i.fas.fa-palette"),
                        ` ${capitalize(recolor.material)}`
                    ])
                );
            });
        }

        // Modal for palette selection (one at a time)
        let paletteModal = null;
        if (typeof rootViewNode.state.showPaletteModal === 'number') {
            const idx = rootViewNode.state.showPaletteModal;
            const opt = paletteOptions[idx];
            // Get paletteMetadata from global
            console.log(meta.recolors);
            const paletteMetadata = window.paletteMetadata;
            // Determine material type (e.g., 'all', 'hair', 'metal', 'eyes')
            const materialType = meta.recolors[idx]?.material || 'all';
            // Fallback to 'all' if not found
            const materialMeta = paletteMetadata.materials[materialType] || paletteMetadata.materials['all'];
            const paletteVersions = Object.keys(materialMeta.palettes || {});
            paletteModal = m("div.palette-modal", {
                style: {
                    position: "fixed",
                    top: "20%",
                    left: "30%",
                    background: "#fff",
                    border: "1px solid #ccc",
                    padding: "1em",
                    zIndex: 1000,
                    maxHeight: "400px",
                    overflowY: "auto",
                    width: "340px"
                }
            }, [
                m("h4", `Select Palette and Color for ${capitalize(opt.material)}`),
                paletteVersions.map(version => [
                    m("div", { style: { fontWeight: "bold", margin: "0.5em 0 0.2em 0" } },
                        paletteMetadata.versions[version]?.label || version
                    ),
                    ...Object.entries(materialMeta.palettes[version]).map(([pal, colors]) =>
                        m("div", {
                            style: { display: "flex", alignItems: "center", marginBottom: "0.5em" }
                        }, [
                            m("strong", { style: { width: "90px", display: "inline-block" } }, pal),
                            m("div",
                                colors.map((color, i) =>
                                    m("span", {
                                        style: {
                                            display: "inline-block",
                                            width: "22px",
                                            height: "22px",
                                            margin: "0 2px",
                                            border: (opt.selectedPalette === pal && opt.selectedColor === color) ? "2px solid #3273dc" : "1px solid #ccc",
                                            borderRadius: "4px",
                                            background: color,
                                            cursor: "pointer"
                                        },
                                        onclick: (e) => {
                                            e.stopPropagation();
                                            if (!rootViewNode.state.selectedPalettes) rootViewNode.state.selectedPalettes = {};
                                            rootViewNode.state.selectedPalettes[idx] = { palette: pal, color };
                                            rootViewNode.state.showPaletteModal = null;
                                            m.redraw();
                                        }
                                    })
                                ).slice(0, materialType === 'eyes' ? 3 : 6)
                            )
                        ])
                    )
                ]),
                m("button", {
                    style: { marginTop: "1em" },
                    onclick: () => { rootViewNode.state.showPaletteModal = null; m.redraw(); }
                }, "Close")
            ]);
        }

        // Find the Selections
        const selectionGroup = getSelectionGroup(itemId);
        const isSelected = state.selections[selectionGroup]?.itemId === itemId &&
            state.selections[selectionGroup]?.variant === selectedColor;

        // Only show the idle preview for the asset
        const previewRow = meta.preview_row ?? 2;
        const previewCol = meta.preview_column ?? 0;
        const previewXOffset = meta.preview_x_offset ?? 0;
        const previewYOffset = meta.preview_y_offset ?? 0;
        const layer1 = meta.layers?.layer_1;
        const basePath = layer1?.[state.bodyType];

        // Check if item uses a palette - if so, load the source variant
        const paletteConfig = getPaletteForItem(itemId, meta);
        const loadColor = paletteConfig ? paletteConfig.sourceColor : selectedColor;

        // Check if this item uses a custom animation
        const hasCustomAnimation = layer1?.custom_animation;
        const layer1CustomAnimation = hasCustomAnimation ? layer1.custom_animation : null;

        let previewSrc = null;
        if (basePath) {
            // Standard animations have animation subfolders (walk, slash, etc.)
            const defaultAnim = meta.animations.includes('walk') ? 'walk' : meta.animations[0];
            previewSrc = `spritesheets/${basePath}${defaultAnim}.png`;
        }

        return m("div", {
            class: classNames({
                "search-result": isSearchMatch,
                "has-text-grey": !isCompatible,
            })
        }, [
            m("div.tree-label", {
                title: tooltipText,
                onclick: () => {
                    state.expandedNodes[nodePath] = !isExpanded;
                }
            }, [
                m("span", displayName),
                !isCompatible ? m("span.ml-1", "⚠️") : null
            ]),
            paletteModal,
            m("div.is-flex.is-align-items-center", [
                m("div", { class: "variant-item is-flex is-flex-direction-column is-align-items-center is-clickable" }, [
                    m("canvas.variant-canvas.box.p-0", {
                        width: 64,
                        height: 64,
                        class: (compactDisplay ? " compact-display" : ""),
                        style: (isSelected ? " hsl(217, 71%, 53%)" : " hsl(0, 0%, 86%)"),
                        //style: (compactDisplay ? "width:32px;height:32px;" : "width:64px;height:64px;"),
                        oncreate: async (canvasVnode) => {
                            const canvas = canvasVnode.dom;
                            const ctx = canvas.getContext('2d', { willReadFrequently: true });

                            // Collect all layers for this item
                            // Only include layers that match layer_1's custom animation (if any)
                            const layersToLoad = [];

                            // Check if item uses a palette - if so, load the source variant
                            const paletteConfig = getPaletteForItem(itemId, meta);
                            const loadColor = paletteConfig ? paletteConfig.sourceVariant : variant;

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

                            // Sort by zPos
                            layersToLoad.sort((a, b) => a.zPos - b.zPos);

                            // Load and draw all layers
                            Promise.all(layersToLoad.map(layer => {
                                return new Promise((resolve) => {
                                    const img = new Image();
                                    img.onload = () => resolve({ img, layer });
                                    img.onerror = () => resolve({ img: null, layer });
                                    img.src = layer.path;
                                });
                            })).then(async loadedLayers => {
                                canvas.loadedLayers = loadedLayers;
                                // Draw each layer in zPos order
                                // Use universalFrameSize (64) for all calculations, matching master branch
                                const universalFrameSize = 64;
                                for (const { img, layer } of loadedLayers) {
                                    if (img) {
                                        const imageToDraw = await getImageToDraw(img, itemId, loadColor);
                                        const size = compactDisplay ? 32 : 64;
                                        // Master branch uses: previewColumn * universalFrameSize + previewXOffset
                                        const srcX = previewCol * universalFrameSize + previewXOffset;
                                        const srcY = previewRow * universalFrameSize + previewYOffset;
                                        ctx.drawImage(
                                            imageToDraw,
                                            srcX, srcY, universalFrameSize, universalFrameSize,
                                            0, 0, size, size
                                        );
                                    }
                                }
                                rootViewNode.state.imagesLoaded++;
                                m.redraw();
                            });
                        }
                    })
                ]),
                // Small color icons for each recolor category
                paletteOptions.length ? m("div.ml-3.is-flex.is-align-items-center",
                    paletteOptions.map(opt =>
                        m("div", {
                            key: opt.material,
                            title: `Choose palette for ${opt.material}`,
                            onclick: (e) => {
                                e.stopPropagation();
                                rootViewNode.state.showPaletteModal = opt.idx;
                                m.redraw();
                            },
                            style: {
                                width: "18px",
                                height: "18px",
                                marginLeft: "6px",
                                border: "1px solid #888",
                                borderRadius: "3px",
                                background: opt.selectedColor,
                                display: "inline-block",
                                cursor: "pointer"
                            }
                        })
                    )
                ) : null
            ])
        ]);
    }
};
