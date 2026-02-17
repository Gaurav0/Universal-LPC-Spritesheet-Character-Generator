// PaletteModal.js
import { capitalize, ucwords } from "../../utils/helpers.js";

export const PaletteSelectModal = {
    view: function(vnode) {
        const {
            opt,
            recolor,
            paletteMetadata,
            paletteVersions,
            onClose,
            onSelect
        } = vnode.attrs;

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
            m("div.palette-modal", {
                style: {
                    position: "absolute",
                    left: 0,
                    right: 0,
                    margin: "0 auto",
                    width: "100%",
                    maxWidth: "340px",
                    background: "#fff",
                    border: "1px solid #ccc",
                    padding: 0,
                    zIndex: 1000,
                    maxHeight: "80vh",
                    borderRadius: "10px",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 2px 16px #0002"
                }
            }, [
                m('header.is-flex', {
                    style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.5rem 1rem",
                        borderBottom: "1px solid #eee",
                        background: "#fafafa",
                        position: "sticky",
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
                        padding: "1em"
                    }
                },
                paletteVersions.map(([material, version]) => [
                    m("div", { style: { fontWeight: "bold", margin: "0.5em 0 0.2em 0" } },
                        (paletteMetadata.versions[version]?.label || version) +
                        (material !== recolor.material ? ` - ${paletteMetadata.materials[material]?.label || capitalize(material)}` : '')
                    ),
                    ...Object.entries(paletteMetadata.materials[material].palettes[version]).map(([pal, colors]) =>
                        m("div", {
                            style: {
                                display: "flex",
                                alignItems: "center",
                                marginBottom: "0.5em",
                                cursor: "pointer"
                            },
                            onclick: (e) => {
                                e.stopPropagation();
                                onSelect(pal, recolor.color);
                            }
                        }, [
                            m("label", {
                                style: {
                                    width: "50%",
                                    display: "inline-block"
                                }
                            }, ucwords(pal.replace('_', ' '))),
                            m("div", {
                                    style: {
                                        width: "50%",
                                        border: "1px solid #ccc",
                                        borderRadius: "10px",
                                        display: "flex",
                                        alignItems: "center",
                                        overflowX: "hidden",
                                        lineHeight: "1.5"
                                    }
                                },
                                colors.map((color, i) =>
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
                    )
                ]))
            ])
        ];
    }
};
