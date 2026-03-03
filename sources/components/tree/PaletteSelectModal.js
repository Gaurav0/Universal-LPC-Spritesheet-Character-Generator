// PaletteSelectModal.js
import { drawRecolorPreview } from '../../canvas/palette-recolor.js';
import { state, getSelectionGroup } from '../../state/state.js';
import { ucwords } from "../../utils/helpers.js";

const classNames = window.classNames;

export const PaletteSelectModal = {
    view: function(vnode) {
        const {
            itemId,
            opt,
            selectedColors,
            compactDisplay,
            rootViewNode,
            onClose,
            onSelect
        } = vnode.attrs;

        // Selection Group
        const meta = window.itemMetadata[itemId];
        const selectionGroup = opt.type_name ?? getSelectionGroup(itemId);
        const selection = state.selections[selectionGroup];

        // Overlay for outside click
        const overlay = m('div.palette-modal-overlay', {
            onclick: onClose
        });

        // Try to align modal to right side of mithril filters and match exact height of chooser-column
        const modalStyle = {};
        const minWidth = 300;
        if (typeof window !== 'undefined') {
            const header = document.getElementById('header-left');
            const chooser = document.getElementById('chooser-column');
            const filters = document.getElementById('mithril-filters');
            if (chooser && filters) {
                const rect = chooser.getBoundingClientRect();
                const hRect = header.getBoundingClientRect();
                const fRect = filters.getBoundingClientRect();
                const windowHeight = window.innerHeight || rect.height;
                const clampedHeight = Math.min(rect.height, windowHeight - hRect.height - 20);
                const newWidth = (rect.width / 4 < minWidth) ? minWidth : rect.width / 4;
                modalStyle.left = (fRect.right - newWidth) + 'px';
                modalStyle.top = hRect.height + 'px';
                modalStyle.width = modalStyle.maxWidth = newWidth + 'px';
                modalStyle.height = rect.height + 'px';
                modalStyle.maxHeight = clampedHeight + 'px';
                modalStyle.right = 'auto';
            }
        }

        return [
            overlay,
            m("div.palette-modal", {
                style: modalStyle,
                onclick: (e) => e.stopPropagation()
            }, [
                m('header.is-flex', [
                    m("h4", opt.label),
                    m("button", {
                        onclick: onClose
                    }, "x")
                ]),
                m('section',
                opt.versions.map((cat) => {
                    const [material, version] = cat.split('.');
                    const paletteMeta = window.paletteMetadata;
                    const paletteVersionMeta = paletteMeta.versions[version];
                    const materialMeta = paletteMeta.materials[material];
                    const recolors = materialMeta.palettes[version];
                    return [
                        m("div.palette-version",
                            paletteVersionMeta?.label +
                            (material !== opt.material ? ` - ${materialMeta?.label}` : '')
                        ),
                        m("div.variants-container.is-flex.is-flex-wrap-wrap", [
                            ...Object.entries(recolors).map(([palette, colors]) => {
                                const dark = colors[0];
                                const gradient = colors.slice().reverse();
                                const key = (material !== opt.material ? material + '.' : '') + (version !== opt.default ? version + '.' : '') + palette;
                                const isSelected = selection?.itemId === itemId && selection?.recolor === key;
                                const itemColors = {
                                    ...selectedColors,
                                    [selectionGroup]: key
                                };
                                return m("div.variant-item.is-flex.is-flex-direction-column.is-align-items-center.is-clickable", {
                                    class: classNames({
                                        "has-background-link-light has-text-weight-bold has-text-link": isSelected
                                    }),
                                    onmouseover: (e) => {
                                        const div = e.currentTarget;
                                        if (!isSelected) div.classList.add('has-background-white-ter');
                                    },
                                    onmouseout: (e) => {
                                        const div = e.currentTarget;

                                        if (!isSelected) div.classList.remove('has-background-white-ter');
                                    },
                                    onclick: (e) => {
                                        e.stopPropagation();
                                        onSelect(key);
                                    }
                                }, [
                                    m("span.variant-display-name.has-text-centered.is-size-7", ucwords(palette.replaceAll('_', ' '))),
                                    m("canvas.variant-canvas.box.p-0", {
                                        width: compactDisplay ? 32 : 64,
                                        height: compactDisplay ? 32 : 64,
                                        class: (compactDisplay ? " compact-display" : ""),
                                        onremove: (canvasVnode) => {
                                            canvasVnode.dom._recolorRenderId = (canvasVnode.dom._recolorRenderId || 0) + 1;
                                        },
                                        oncreate: async (canvasVnode) => {
                                            const renderId = (canvasVnode.dom._recolorRenderId || 0) + 1;
                                            canvasVnode.dom._recolorRenderId = renderId;
                                            const imagesLoaded = await drawRecolorPreview(itemId, meta, canvasVnode.dom, itemColors, renderId);
                                            if (imagesLoaded > 0) {
                                                rootViewNode.state.imagesLoaded += imagesLoaded;
                                            }
                                        },
                                        onupdate: async (canvasVnode) => {
                                            const renderId = (canvasVnode.dom._recolorRenderId || 0) + 1;
                                            canvasVnode.dom._recolorRenderId = renderId;
                                            await drawRecolorPreview(itemId, meta, canvasVnode.dom, itemColors, renderId);
                                        }
                                    }),
                                    m("div.palette-swatch",
                                        {
                                            style: {
                                                borderColor: dark,
                                                backgroundColor: dark
                                            }
                                        },
                                        gradient.map((color, i) =>
                                            m("span", {
                                                style: {
                                                    width: `${100 / colors.length}%`,
                                                    backgroundColor: color
                                                }
                                            })
                                        )
                                    )
                                ])
                            })
                        ])
                    ];
                })),
                m('footer', " ")
            ])
        ];
    }
};
