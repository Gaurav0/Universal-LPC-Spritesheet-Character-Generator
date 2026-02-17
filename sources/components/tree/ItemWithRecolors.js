// Item with recolors component
import { state, getSelectionGroup, applyMatchBodyColor } from '../../state/state.js';
import { capitalize, ucwords } from '../../utils/helpers.js';
import { getImageToDraw } from '../../canvas/palette-recolor.js';
import { getPaletteForItem, getPaletteOptions } from '../../state/palettes.js';
import { PaletteSelectModal } from './PaletteSelectModal.js';

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

        // Check Selection Status
        const selectionGroup = getSelectionGroup(itemId);
		const isExpanded = state.expandedNodes[nodePath] || false;
        const isSelected = state.selections[selectionGroup]?.itemId === itemId;

        // Build palette/color options for all recolor fields
        const paletteOptions = getPaletteOptions(itemId, meta);


        // Check Selection Status
        let paletteModal = null;
        if (typeof rootViewNode.state.showPaletteModal === 'number') {
            const idx = rootViewNode.state.showPaletteModal;
            const opt = paletteOptions[idx];
            const recolor = meta.recolors[idx];
            const paletteMetadata = window.paletteMetadata;
            const paletteVersions = Object.keys(recolor.palettes || {}).map(version => {
                let [ver, mat] = version.split('.').reverse();
                if (!mat) mat = recolor.material;
                return [mat, ver];
            });
            paletteModal = m(PaletteSelectModal, {
                opt,
                recolor,
                paletteMetadata,
                paletteVersions,
                onClose: () => { rootViewNode.state.showPaletteModal = null; m.redraw(); },
                onSelect: (pal, color) => {
                    if (!rootViewNode.state.selectedPalettes) rootViewNode.state.selectedPalettes = {};
                    rootViewNode.state.selectedPalettes[idx] = { palette: pal, color };
                    rootViewNode.state.showPaletteModal = null;
                    m.redraw();
                }
            });
        }

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
            }),
            style: {
                "position": "relative"
            }
        }, [
            m("div.tree-label", {
                title: tooltipText,
                onclick: () => {
                    state.expandedNodes[nodePath] = !isExpanded;
                }
            }, [
				m("span.tree-arrow", { class: isExpanded ? 'expanded' : 'collapsed' }),
				m("span", displayName),
				!isCompatible ? m("span.ml-1", "⚠️") : null
			]),
            paletteModal,
			isExpanded ? m("div", [
				m("div", { class: rootViewNode.state.isLoading ? "loading" : "" }),
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
                    paletteOptions.length ? m("div.ml-3.is-align-items-center", {
                            style: { width: "100%" }
                        },
                        paletteOptions.map((opt, idx) =>
                            m("div.is-flex", {
                                style: {
                                    display: "flex",
                                    alignItems: "center",
                                    marginBottom: "0.5em",
                                    cursor: "pointer",
                                    width: "100%"
                                },
                                onclick: (e) => {
                                    e.stopPropagation();
                                    rootViewNode.state.showPaletteModal = idx;
                                    m.redraw();
                                }
                            }, [
                                m("label", {
                                    style: {
                                        width: "50%",
                                        display: "flex",
                                        cursor: "pointer",
                                    }
                                }, paletteMetadata.materials[opt.material]?.label || capitalize(opt.material)),
                                m("div", {
                                        style: {
                                            width: "50%",
                                            border: "1px solid #ccc",
                                            borderRadius: "10px",
                                            display: "flex",
                                            alignItems: "center",
                                            overflowX: "hidden",
                                            lineHeight: "1.5",
                                            cursor: "pointer",
                                        }
                                    },
                                    opt.colors.map((color, i) =>
                                        m("span", {
                                            style: {
                                                display: "inline-block",
                                                width: "1.2rem",
                                                height: "1rem",
                                                padding: "0",
                                                margin: "0",
                                                width: `${100 / opt.colors.length}%`,
                                                background: color
                                            }
                                        })
                                    )
                                )
                            ])
                        )
                    ) : null
                ])
            ]) : null
        ]);
    }
};
