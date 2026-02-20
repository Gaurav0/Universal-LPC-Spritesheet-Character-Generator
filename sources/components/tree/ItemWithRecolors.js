// Item with recolors component
import { state, getSelectionGroup, getSubSelectionGroup, applyMatchBodyColor } from '../../state/state.js';
import { drawRecolorPreview } from '../../canvas/palette-recolor.js';
import { getMultiRecolors, getPaletteOptions } from '../../state/palettes.js';
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
        const selection = state.selections[selectionGroup]
        const isSelected = selection?.itemId === itemId;
        const selectedColors = getMultiRecolors(itemId, state.selections);

        // Build palette/color options for all recolor fields
        const paletteOptions = getPaletteOptions(itemId, meta);

        // Check Selection Status
        let paletteModal = null;
        if (typeof rootViewNode.state.showPaletteModal === 'number') {
            const idx = rootViewNode.state.showPaletteModal;
            const opt = paletteOptions[idx];
            paletteModal = m(PaletteSelectModal, {
                itemId,
                opt,
                onClose: () => { rootViewNode.state.showPaletteModal = null; m.redraw(); },
                onSelect: (recolor) => {
                    const colorDisplayName = recolor.replaceAll("_", " ");
                    const subSelect = getSubSelectionGroup(itemId, idx);
                    const subDisplayName = opt.type_name ? opt.label : displayName;
                    state.selections[subSelect] = {
                        itemId: itemId,
                        subId: opt.type_name ? idx : null,
                        variant: null,
                        recolor: recolor,
                        name: `${subDisplayName} (${colorDisplayName})`
                    };

                    // If this item has matchBodyColor enabled, apply to all other body-colored items
                    if (recolor.matchBodyColor || (subSelect === selectionGroup && meta.matchBodyColor)) {
                        applyMatchBodyColor(null, recolor);
                    }
                    m.redraw();
                }
            });
        }

        // Only show the idle preview for the asset
        const layer1 = meta.layers?.layer_1;
        const basePath = layer1?.[state.bodyType];

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
                    m("div", {
                        class: classNames({
                            "variant-item is-flex is-flex-direction-column is-align-items-center is-clickable": true,
                            "has-background-link-light has-text-weight-bold has-text-link": isSelected,
                            "is-not-compatible": !isCompatible
                        })
                    }, [
                        m("canvas.variant-canvas.box.p-0", {
                            width: 64,
                            height: 64,
                            class: (compactDisplay ? " compact-display" : ""),
                            onmouseover: (e) => {
                                if (!isCompatible) return;
                                const div = e.currentTarget;
                                if (!isSelected) div.classList.add('has-background-white-ter');
                            },
                            onmouseout: (e) => {
                                if (!isCompatible) return;
                                const div = e.currentTarget;

                                if (!isSelected) div.classList.remove('has-background-white-ter');
                            },
                            oncreate: async (canvasVnode) => {
                                const imagesLoaded = drawRecolorPreview(itemId, meta, canvasVnode.dom, selectedColors);
                                if (imagesLoaded > 0) {
                                    rootViewNode.state.imagesLoaded += imagesLoaded;
                                    rootViewNode.state.oldSelectedColors = selectedColors;
                                }
                            },
                            onupdate: async (canvasVnode) => {
                                if (rootViewNode.state.oldSelectedColors === selectedColors) {
                                    return;
                                }
                                const imagesLoaded = drawRecolorPreview(itemId, meta, canvasVnode.dom, selectedColors);
                                if (imagesLoaded > 0) {
                                    rootViewNode.state.oldSelectedColors = selectedColors;
                                }
                            }
                        })
                    ]),
                    // Small color icons for each recolor category
                    paletteOptions.length ? m("div.ml-3.is-align-items-center", {
                        style: { width: "auto", display: "flex", flexDirection: "column", gap: "0.25em" }
                    },
                        paletteOptions.map((opt, idx) => {
                            const dark = opt.colors[0];
                            const gradient = opt.colors.slice().reverse();
                            return m("div.is-flex", {
                                style: {
                                    display: "flex",
                                    alignItems: "center",
                                    marginBottom: "0.25em",
                                    cursor: "pointer",
                                    width: "auto",
                                    gap: "0.5em"
                                },
                                onclick: (e) => {
                                    e.stopPropagation();
                                    rootViewNode.state.showPaletteModal = idx;
                                    m.redraw();
                                }
                            }, [
                                m("label", {
                                    style: {
                                        width: "90px",
                                        minWidth: "90px",
                                        maxWidth: "90px",
                                        display: "inline-block",
                                        textAlign: "right",
                                        marginRight: "0.5em",
                                        cursor: "pointer",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis"
                                    }
                                }, opt.label),
                                m("div", {
                                    style: {
                                        minWidth: "140px",
                                        maxWidth: "200px",
                                        border: `1px solid ${dark}`,
                                        borderRadius: "10px",
                                        display: "flex",
                                        alignItems: "center",
                                        overflowX: "hidden",
                                        lineHeight: "1.5",
                                        cursor: "pointer",
                                        background: dark,
                                        flexShrink: 0
                                    }
                                },
                                    gradient.map((color, i) =>
                                        m("span", {
                                            style: {
                                                display: "inline-block",
                                                height: "1rem",
                                                padding: "0",
                                                margin: "0",
                                                width: `${100 / gradient.length}%`,
                                                background: color
                                            }
                                        })
                                    )
                                )
                            ])
                        })
                    ) : null
                ])
            ]) : null
        ]);
    }
};
