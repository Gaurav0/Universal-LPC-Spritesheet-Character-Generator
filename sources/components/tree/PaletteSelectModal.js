// PaletteSelectModal.js
import { state, getSelectionGroup } from '../../state/state.js';
import { ucwords } from "../../utils/helpers.js";

export const PaletteSelectModal = {
    view: function(vnode) {
        const {
            itemId,
            opt,
            onClose,
            onSelect
        } = vnode.attrs;

        // Selection Group
        const selectionGroup = getSelectionGroup(itemId);
        const selection = state.selections[selectionGroup];

        // Overlay for outside click
        const overlay = m('div', {
            style: {
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0,0,0,0.05)',
                zIndex: 999,
            },
            onclick: onClose
        });

        // Modal positioning: stick to right side of mithril-filters
        const minWidth = 300;
        let modalStyle = {
            position: 'fixed',
            top: window.scrollY + 'px',
            left: 0,
            right: 0,
            margin: '0',
            width: minWidth + 'px',
            maxWidth: minWidth + 'px',
            background: '#fff',
            border: '1px solid #ccc',
            padding: 0,
            zIndex: 1000,
            maxHeight: '80vh',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 2px 16px #0002'
        };

        // Try to align modal to right side of mithril filters and match exact height of chooser-column
        if (typeof window !== 'undefined') {
            const chooser = document.getElementById('chooser-column');
            const filters = document.getElementById('mithril-filters');
            if (chooser && filters) {
                const rect = chooser.getBoundingClientRect();
                const fRect = filters.getBoundingClientRect();
                const newWidth = (rect.width / 4 < minWidth) ? minWidth : rect.width / 4;
                modalStyle.left = (fRect.right - newWidth) + 'px';
                modalStyle.top = rect.top + 'px';
                modalStyle.width = modalStyle.maxWidth = newWidth + 'px';
                modalStyle.height = modalStyle.maxHeight = rect.height + 'px';
                modalStyle.right = 'auto';
            }
        }

        return [
            m('style', `
            @media (max-width: 600px) {
                .palette-modal {
                    max-width: 100vw !important;
                    width: 100vw !important;
                    left: 0 !important;
                    right: 0 !important;
                    border-radius: 0 !important;
                }
            }
            `),
            overlay,
            m("div.palette-modal", {
                style: modalStyle,
                onclick: (e) => e.stopPropagation()
            }, [
                m('header.is-flex', {
                    style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.5rem 1rem",
                        borderBottom: "1px solid #eee",
                        background: "#fafafa",
                        top: 0,
                        zIndex: 2
                    }
                }, [
                    m("h4", {
                        style: {
                            margin: 0,
                            fontWeight: "bold",
                            fontSize: "1.2rem"
                        }
                    }, opt.label),
                    m("button", {
                        style: {
                            background: "none",
                            border: "none",
                            fontSize: "1.5em",
                            cursor: "pointer"
                        },
                        onclick: onClose
                    }, "x")
                ]),
                m('section', {
                    style: {
                        flex: "1 1 auto",
                        minHeight: 0,
                        overflowY: "auto",
                        padding: "0 1em"
                    }
                },
                opt.versions.map((cat) => {
                    const [material, version] = cat.split('.');
                    const paletteMeta = window.paletteMetadata;
                    const paletteVersionMeta = paletteMeta.versions[version];
                    const materialMeta = paletteMeta.materials[material];
                    const recolors = materialMeta.palettes[version];
                    return [
                        m("div", { style: { fontWeight: "bold", margin: "0.5em 0 0.2em 0" } },
                            paletteVersionMeta?.label +
                            (material !== opt.material ? ` - ${materialMeta?.label}` : '')
                        ),
                        ...Object.entries(recolors).map(([palette, colors]) => {
                            const dark = colors[0];
                            const gradient = colors.slice().reverse();
                            const key = (material !== opt.material ? material + '.' : '') + (version !== opt.default ? version + '.' : '') + palette;
                            const isSelected = selection?.itemId === itemId && selection?.recolor === key;
                            return m("div", {
                                class: classNames({
                                    "has-background-link-light has-text-weight-bold has-text-link": isSelected
                                }),
                                style: {
                                    display: "flex",
                                    alignItems: "center",
                                    marginBottom: "0.5em",
                                    cursor: "pointer"
                                },
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
                                    onClose();
                                }
                            }, [
                                m("label", {
                                    style: {
                                        width: "50%",
                                        display: "inline-block",
                                        cursor: "pointer"
                                    }
                                }, ucwords(palette.replace('_', ' '))),
                                m("div", {
                                        style: {
                                            width: "50%",
                                            border: `1px solid ${dark}`,
                                            borderRadius: "10px",
                                            display: "flex",
                                            alignItems: "center",
                                            overflowX: "hidden",
                                            lineHeight: "1.5",
                                            background: dark,
                                            cursor: "pointer"
                                        }
                                    },
                                    gradient.map((color, i) =>
                                        m("span", {
                                            style: {
                                                display: "inline-block",
                                                width: "1.2rem",
                                                height: "1rem",
                                                padding: "0",
                                                margin: "0",
                                                width: `${100 / colors.length}%`,
                                                background: color
                                            }
                                        })
                                    )
                                )
                            ])
                        })
                    ];
                })),
                m('footer', {
                    style: {
                        flex: "1 1 auto",
                        minHeight: "0.5rem"
                    }
                }, " ")
            ])
        ];
    }
};
