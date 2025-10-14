// Item with variants component
import { state, getSelectionGroup, applyMatchBodyColor } from '../../state/state.js';
import { variantToFilename, capitalize } from '../../utils/helpers.js';
import { getImageToDraw } from '../../canvas/renderer.js';
import { getPaletteForItem } from '../../canvas/palette-recolor.js';

export const ItemWithVariants = {
	view: function(vnode) {
		const { itemId, meta, isSearchMatch } = vnode.attrs;
		const isExpanded = state.expandedNodes[itemId] || false;
		const displayName = meta.name;

		return m("div", {
			class: isSearchMatch ? "search-result" : ""
		}, [
			m("div.tree-label", {
				onclick: () => {
					state.expandedNodes[itemId] = !isExpanded;
				}
			}, [
				m("span.tree-arrow", { class: isExpanded ? 'expanded' : 'collapsed' }),
				m("span", displayName)
			]),
			isExpanded ? m("div", [
				m("div.title.is-6.mt-2.mb-2.ml-5.has-text-weight-semibold", displayName),
				m("div.ml-5.is-flex.is-flex-wrap-wrap", {
					style: "gap: 0.5rem;"
				},
					meta.variants.map(variant => {
					const selectionGroup = getSelectionGroup(itemId);
					const isSelected = state.selections[selectionGroup]?.itemId === itemId &&
					                    state.selections[selectionGroup]?.variant === variant;
					const variantDisplayName = variant.replaceAll("_", " ");

					// Get preview metadata from item metadata
					const previewRow = meta.preview_row ?? 2;
					const previewCol = meta.preview_column ?? 0;
					const previewXOffset = meta.preview_x_offset ?? 0;
					const previewYOffset = meta.preview_y_offset ?? 0;

					// Get sprite path for preview image from first layer
					const layer1 = meta.layers?.layer_1;
					const basePath = layer1?.[state.bodyType];

					// Check if this item uses a custom animation
					const hasCustomAnimation = layer1?.custom_animation;

					let previewSrc = null;
					let actualVariant = variant; // Track actual variant for file loading

					// Check if item uses a palette - if so, load the source variant
					const paletteConfig = getPaletteForItem(itemId, meta);
					if (paletteConfig) {
						actualVariant = paletteConfig.sourceVariant;
					}

					if (basePath) {
						if (hasCustomAnimation) {
							// Custom animations don't have animation subfolders
							previewSrc = `spritesheets/${basePath}${variantToFilename(actualVariant)}.png`;
						} else {
							// Standard animations have animation subfolders (walk, slash, etc.)
							const defaultAnim = meta.animations.includes('walk') ? 'walk' : meta.animations[0];
							previewSrc = `spritesheets/${basePath}${defaultAnim}/${variantToFilename(actualVariant)}.png`;
						}
					}

					// Calculate object position for cropping
					// Negative position shifts the image left/up to show that part in the viewport
					// Positive offset values shift the viewport right/down (to see more left/top of sprite)
					// Negative offset values shift the viewport left/up (to see more right/bottom of sprite)
					const objectPosX = -(previewCol * 64 - previewXOffset);
					const objectPosY = -(previewRow * 64 - previewYOffset);

					return m("div.variant-item.is-flex.is-flex-direction-column.is-align-items-center.is-clickable", {
						key: variant,
						class: isSelected ? "has-background-link-light has-text-weight-bold has-text-link" : "",
						style: "gap: 0.25rem; border-radius: 4px; transition: background-color 0.15s; min-width: 80px; max-width: 120px; padding: 0.5rem 0.5rem 0.25rem 0.5rem;",
						onmouseover: (e) => {
							const div = e.currentTarget;
							if (!isSelected) div.classList.add('has-background-white-ter');
						},
						onmouseout: (e) => {
							const div = e.currentTarget;

							if (!isSelected) div.classList.remove('has-background-white-ter');
						},
						onclick: () => {
							const selectionGroup = getSelectionGroup(itemId);

							if (isSelected) {
								delete state.selections[selectionGroup];
							} else {
								state.selections[selectionGroup] = {
									itemId: itemId,
									variant: variant,
									name: `${displayName} (${variantDisplayName})`
								};

								// If this is the body color, apply match body color to other items
								if (itemId === 'body-body') {
									applyMatchBodyColor();
								}
							}
						}
					}, [
						m("span.has-text-centered.is-size-7", {
							style: "word-break: break-word; line-height: 1.2;"
						}, capitalize(variantDisplayName)),
						m("canvas", {
							width: 64,
							height: 64,
							class: "box p-0",
							style: "width: 64px; height: 64px; image-rendering: pixelated; flex-shrink: 0; border: 2px solid" + (isSelected ? " hsl(217, 71%, 53%)" : " hsl(0, 0%, 86%)"),
							oncreate: (canvasVnode) => {
								const canvas = canvasVnode.dom;
								const ctx = canvas.getContext('2d');

								// Collect all layers for this item
								const layersToLoad = [];

								// Check if item uses a palette - if so, load the source variant
								const paletteConfig = getPaletteForItem(itemId, meta);
								const loadVariant = paletteConfig ? paletteConfig.sourceVariant : variant;

								for (let layerNum = 1; layerNum < 10; layerNum++) {
									const layer = meta.layers?.[`layer_${layerNum}`];
									if (!layer) break;

									let layerPath = layer[state.bodyType];
									if (!layerPath) continue;

									// Replace template variables like ${head}
									if (layerPath.includes('${head}')) {
										// Determine head type from current selections
										const headSelection = Object.values(state.selections).find(sel =>
											sel.itemId?.startsWith('head-heads-')
										);

										// Get the head name (e.g., "Human_male")
										const headSelectionName = headSelection?.name || 'Human_male';

										// Use replace_in_path mapping if available
										let replacementValue = 'male'; // default
										if (meta.replace_in_path?.head) {
											replacementValue = meta.replace_in_path.head[headSelectionName] || 'male';
										}

										layerPath = layerPath.replace('${head}', replacementValue);
									}

									const hasCustomAnim = layer.custom_animation;
									let imagePath;
									if (hasCustomAnim) {
										imagePath = `spritesheets/${layerPath}${variantToFilename(loadVariant)}.png`;
									} else {
										const defaultAnim = meta.animations.includes('walk') ? 'walk' : meta.animations[0];
										imagePath = `spritesheets/${layerPath}${defaultAnim}/${variantToFilename(loadVariant)}.png`;
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
								})).then(loadedLayers => {
									// Draw each layer in zPos order
									for (const { img, layer } of loadedLayers) {
										if (img) {
											const imageToDraw = getImageToDraw(img, itemId, variant);
											ctx.drawImage(
												imageToDraw,
												previewCol * 64 - previewXOffset, previewRow * 64 - previewYOffset, 64, 64,
												0, 0, 64, 64
											);
										}
									}
								});
							}
						})
					]);
				})
				)
			]) : null
		]);
	}
};
