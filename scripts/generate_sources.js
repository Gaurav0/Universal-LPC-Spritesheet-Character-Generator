const fs = require("fs");
const path = require("path");

const SHEETS_DIR = "sheet_definitions" + path.sep;
const PALETTES_DIR = "palette_definitions" + path.sep;

const DEBUG = false; // change this to print debug log
const onlyIfTemplate = false; // print debugging log only if there is a template

require("child_process").fork("scripts/zPositioning/parse_zpos.js");

/**
 * Helper function to capitalize strings for display
 */
function capitalize(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Helper function to capitalize all words in a string for display
 */
function ucwords(str) {
	return str.split(' ').map(word => capitalize(word)).join(' ');
}

// Collect metadata for runtime use
const licensesFound = [];
const itemMetadata = {};
const paletteMetadata = { versions: {}, materials: {} };
const categoryTree = { items: [], children: {} };

function searchCredit(fileName, credits, origFileName) {
  if (credits.count <= 0) {
    console.error("no credits for filename:", fileName);
    return undefined;
  }
  if (credits.count === 1) {
    if (!credits[0].file.includes(fileName)) {
      console.error("Wrong credit at filename:", fileName);
    }
    return undefined;
  }

  for (let creditsIndex = 0; creditsIndex < credits.length; creditsIndex++) {
    const credit = credits[creditsIndex];
    if (
      credit.file === fileName ||
      credit.file === fileName + ".png" ||
      credit.file + "/" === fileName
    ) {
      return credit;
    }
  }

  const index = fileName.lastIndexOf("/");
  if (index > -1) {
    return searchCredit(fileName.substring(0, index), credits, origFileName);
  } else {
    console.error(
      "missing credit after searching recursively filename:",
      origFileName
    );
    return undefined;
  }
}

// Parse credits from item definition and add to global list
function parseCredits(fileName, credits, listCreditToUse, addedCreditsFor, sex, jdx) {
  let fileNameForCreditSearch = fileName;
  let imageFileName = '"' + fileName + '.png" ';
  if (DEBUG && !onlyIfTemplate)
    console.log(
      `Searching for credits to use for ${imageFileName} in ${fileNameForCreditSearch} for layer ${jdx}`
    );

  const creditToUse = searchCredit(
    fileNameForCreditSearch,
    credits,
    fileNameForCreditSearch
  );
  if (DEBUG && !onlyIfTemplate)
    console.log(
      `file name set for ${sex} is ${imageFileName} for layer ${jdx}`
    );

  if (creditToUse !== undefined) {
    // comparing via JSON.stringify is faster than node-deep-equal library
    if (
      listCreditToUse !== null &&
      JSON.stringify(listCreditToUse) !== JSON.stringify(creditToUse)
    ) {
      // do nothing
    } else if (listCreditToUse === null) {
      listCreditToUse = creditToUse;
    }
    for (const license of creditToUse.licenses) {
      if (!licensesFound.includes(license)) {
        licensesFound.push(license);
      }
    }
    const licenses = '"' + creditToUse.licenses.join(",") + '" ';
    const authors = '"' + creditToUse.authors.join(",") + '" ';
    const urls = '"' + creditToUse.urls.join(",") + '" ';
    const notes = '"' + creditToUse.notes.replaceAll('"', "**") + '" ';
    let lineText = '';
    if (!addedCreditsFor.includes(imageFileName)) {
      const quotedShortName = '"' + fileName + '.png"';
      lineText = `${quotedShortName},${notes},${authors},${licenses},${urls}\n`;
    }
    return [listCreditToUse, lineText, imageFileName];
  } else {
    throw Error(`missing credit inside ${fileName}`);
  } // if creditToUse
}

// Parse Category Tree From Meta Files and Folder Paths
function parseTree(filePath, fileName) {
  // Get Full Path
  const fullPath = path.join(filePath, fileName);
  if (DEBUG && !onlyIfTemplate)
    console.log(`Parsing tree ${fullPath}`);

  let meta = null;
  try {
    meta = JSON.parse(fs.readFileSync(fullPath));
  } catch (e) {
    console.error("error in", fullPath);
    throw e;
  }

  const { label, priority, required, animations } = meta;

  let current = categoryTree;
  const categoryPath = filePath.replace("sheet_definitions" + path.sep, "").split(path.sep);
  const treeId = filePath.split(path.sep).pop();

  for (let segment of categoryPath) {
    if (!current.children[segment]) {
      current.children[segment] = {
        items: [],
        children: {}
      };

      // Only Set Metadata on Current Tree ID
      if (segment === treeId) {
        current.children[segment].label = label;
        current.children[segment].priority = priority || null;
        current.children[segment].required = required || [];
        current.children[segment].animations = animations || [];
      }
    }
    current = current.children[segment];
  }
} // fn parseTree

// Parse Asset JSON File
function parseJson(filePath, fileName) {
  const fullPath = path.join(filePath, fileName);
  const searchFileName = fileName.replace(".json", "");
  if (DEBUG && !onlyIfTemplate)
    console.log(`Parsing ${fullPath}`);

  // Read JSON Definition
  let definition = null;
  try {
    definition = JSON.parse(fs.readFileSync(fullPath));
  } catch (e) {
    console.error("error in", fullPath);
    throw e;
  }

  const {
    variants,
    name,
    credits,
    replace_in_path,
    priority,
    ignore,
    //path: itemPath
  } = definition;

  // Skip Ignored Items
  if (ignore === true) {
    throw Error(`Skipping ignored item: ${searchFileName}`);
  }


  const { tags = [], required_tags = [], excluded_tags = [] } = definition;
  const typeName = definition.type_name;
  const defaultAnimations = [
    "spellcast",
    "thrust",
    "walk",
    "slash",
    "shoot",
    "hurt",
    "watering"
  ];

  const requiredSexes = [];
  const animations = definition.animations ?? defaultAnimations;

  const previewRow = definition.preview_row ?? 2;
  const previewColumn = definition.preview_column ?? 0;
  const previewXOffset = definition.preview_x_offset ?? 0;
  const previewYOffset = definition.preview_y_offset ?? 0;

  const sexes = ["male", "female", "teen", "child", "muscular", "pregnant"];
  for (const sex of sexes) {
    if (definition.layer_1[sex]) {
      requiredSexes.push(sex);
    }
  }

  // Build unique itemId from filename (not from path or type_name)
  // This ensures each item has a unique ID even if they share the same type_name
  let itemId = searchFileName;
  const treePath = filePath.replace("sheet_definitions" + path.sep, "").split(path.sep);
  treePath.push(itemId);

  // Collect layer information (file paths and zPos)
  const layers = {};
  for (let i = 1; i < 10; i++) {
    const layerDef = definition[`layer_${i}`];
    if (layerDef) {
      layers[`layer_${i}`] = layerDef;
    } else {
      break;
    }
  }

  // Collect recolor information
  const recolors = [];
  let hasRecolors = false;
  if (definition.recolors !== undefined) {
    for (let n = 1; n < 10; n++) {
      const colorDef = definition.recolors[`color_${n}`];
      if (colorDef) {
        recolors.push(colorDef);
      } else {
        break;
      }
    }

    // If no multiple recolors, add single recolor definition
    if (recolors.length === 0) {
      recolors.push(definition.recolors);
    }
    if (recolors.length > 0) {
      hasRecolors = true;
    }

    // Add All Palettes
    for (const recolor of recolors) {
      // Get Alt Type if Exists
      const colorPalettes = {};
      const colorVariants = new Set();
      const materialMeta = paletteMetadata.materials[recolor.material];
      if (!materialMeta) {
        console.warn(`Material metadata not found for ${recolor.material}`);
        continue;
      }
      recolor.default = materialMeta.default;
      recolor.type_name = recolor.type_name ?? null;
      recolor.label = recolor.label ?? materialMeta.label ?? ucwords(recolor.key);
      if (!recolor.base) {
        recolor.base = `${materialMeta.default}.${materialMeta.base}`;
      }
      for (const palette of recolor.palettes) {
        let [material, version] = palette.split(".");
        if (!version) {
          version = material;
          material = recolor.material;
        }

        // Append Palettes
        const keys = Object.keys(paletteMetadata.materials[material].palettes[version]);
        colorPalettes[`${material}.${version}`] = keys;

        // Determine if we need to prefix version
        const mappedKeys = keys.map((key) => {
          const matPart = recolor.material !== material ? `${material}.` : "";
          const verPart = recolor.default !== version ? `${version}.` : "";
          return `${matPart}${verPart}${key}`;
        });
        mappedKeys.forEach(key => colorVariants.add(key));
      }
      recolor.palettes = colorPalettes;
      recolor.variants = Array.from(colorVariants);
    }
  }
    


  // Collect metadata for this item
  itemMetadata[itemId] = {
    name: name,
    priority: priority || null,
    type_name: typeName,
    required: requiredSexes,
    animations: animations,
    tags: tags,
    required_tags: required_tags,
    excluded_tags: excluded_tags,
    //path: itemPath || treePath || ["other"], TO DO: clean up item paths in json files and allow itemPath to be an override of the treePath
    path: treePath || ["other"],
    replace_in_path: replace_in_path || {},
    variants: variants || [],
    layers: layers,
    credits: credits || [],
    preview_row: previewRow,
    preview_column: previewColumn,
    preview_x_offset: previewXOffset,
    preview_y_offset: previewYOffset,
    matchBodyColor: definition.match_body_color || false,
    recolors: recolors || []
  };

  // Use type_name for radio button grouping (ensures only one item per type can be selected)
  let listCreditToUse = null;
  let listItemsCSV = [];
  const addedCreditsFor = [];
  for (const anim of animations) {
    const snakeItemName = anim.replaceAll(" ", "_");
    for (const sex of requiredSexes) {
      // TODO: move any non-layer, non-variant specific code here!
      for (let jdx = 1; jdx < 10; jdx++) {
        const layerDefinition = definition[`layer_${jdx}`];
        if (layerDefinition === undefined) {
          break;
        }
        const file = layerDefinition[sex];
        if (file !== null && file !== "") {
          // Check Variants
          /*if (variants && variants.length > 0) {
            for (const variant of variants) {
              const variantItemName = variant.replaceAll(" ", "_");
              const searchFileName = file + snakeItemName + "/" + variantItemName;
              const [newCreditToUse, lineText, creditsFor] = parseCredits(searchFileName, credits, listCreditToUse, addedCreditsFor, sex, jdx);
              listCreditToUse = newCreditToUse;
              listItemsCSV.push({
                priority,
                lineText
              });
              addedCreditsFor.push(creditsFor);
            }
          } else {*/
            const searchFileName = file + snakeItemName;
            const [newCreditToUse, lineText, creditsFor] = parseCredits(searchFileName, credits, listCreditToUse, addedCreditsFor, sex, jdx);
            listCreditToUse = newCreditToUse;
            listItemsCSV.push({
              priority,
              lineText
            });
            addedCreditsFor.push(creditsFor);
          //}
        } // if file
      } // for jdx
    } // for sex
  } // for variant

  // Add license info to metadata
  if (!itemMetadata[itemId].licenses) {
    itemMetadata[itemId].licenses = {};
  }

  for (const sex of requiredSexes) {
    // Store licenses in metadata
    itemMetadata[itemId].licenses[sex] = listCreditToUse.licenses;
  }

  let parsed = {};
  parsed.csv = listItemsCSV;
  return parsed;
} // fn parseJson

// Walk Palettes Definitions and build Metadata
const palettes = fs.readdirSync(PALETTES_DIR, { 
  recursive: true,
  withFileTypes: true 
}).sort((a, b) => {
  const pa = path.join(a.path, a.name);
  const pb = path.join(b.path, b.name);

  const depthA = pa.split(path.sep).length;
  const depthB = pb.split(path.sep).length;
  if (depthA !== depthB) return depthA - depthB;

  return pa.localeCompare(pb, ["en"]);
});

// Read palette_definitions/*.json line by line
palettes.forEach(file => {
  if (file.isDirectory()) {
    return;
  } else {
    const fullPath = path.join(file.path, file.name);
    const json = JSON.parse(fs.readFileSync(fullPath));
    if (file.name.startsWith("meta_")) {
      // Handle Palette Metadata
      const name = file.name.replace("meta_", "").replace(".json", "");
      if (json.type == 'material') {
        if (!paletteMetadata.materials[name]) {
          paletteMetadata.materials[name] = json;
          paletteMetadata.materials[name].palettes = {};
        } else {
          for (const [key, data] of Object.entries(json)) {
            paletteMetadata.materials[name][key] = data;
          }
        }
      } else {
        paletteMetadata.versions[name] = json;
      }
      return;
    } else {
      const filename = file.name;
      const [material, version] = file.name.replace(".json", "").split("_");
      try {
        if (!paletteMetadata.materials[material]) {
          paletteMetadata.materials[material] = { "palettes": {} };
        }
        paletteMetadata.materials[material].palettes[version] = json;
      } catch (e) {
        console.log(`Error parsing palette file: ${filename}`, e);
        return;
      }
    }
  }
});


// Read sheet_definitions/*.json line by line
const files = fs.readdirSync(SHEETS_DIR, { 
  recursive: true,
  withFileTypes: true 
}).sort((a, b) => {
  const pa = path.join(a.path, a.name);
  const pb = path.join(b.path, b.name);

  const depthA = pa.split(path.sep).length;
  const depthB = pb.split(path.sep).length;
  if (depthA !== depthB) return depthA - depthB;

  return pa.localeCompare(pb, ["en"]);
});

// Initialize CSV
const csvList = [];
files.forEach(file => {
  if (file.isDirectory()) {
    return;
  } else if (file.name.startsWith("meta_")) {
    // Handle Category Tree
    parseTree(file.path, file.name);
    return;
  } else {
    let parsedResult = null;
    try {
      parsedResult = parseJson(file.path, file.name);
    } catch (e) {
      if (DEBUG && !onlyIfTemplate)
        console.log(e);
      return;
    }
    csvList.push({path: file.path.replace(SHEETS_DIR, ''), csv: parsedResult.csv});
  }
});

// Generate item-metadata.js for runtime use
for (const [itemId, meta] of Object.entries(itemMetadata)) {
  const itemPath = meta.path || ["Other"];

  // Navigate/create tree structure (skip the last element which is the filename)
  let current = categoryTree;
  // Only use path elements except the last one (which is the filename)
  const categoryPath = itemPath.slice(0, -1);

  for (const segment of categoryPath) {
    if (!current.children[segment]) {
      current.children[segment] = { items: [], children: {} };
    }
    current = current.children[segment];
  }

  // Add item to the category (not as a child)
  current.items.push(itemId);
} // for itemMetadata

// Sort Category Tree and Subitems
function sortCategoryTree(node) {
  const sortedChildren = Object.entries(node.children || {}).sort(
    ([keyA, valA], [keyB, valB]) => {
      const a = valA.priority ?? Number.POSITIVE_INFINITY;
      const b = valB.priority ?? Number.POSITIVE_INFINITY;
      if (a !== b) return a - b;
      const labelA = valA.label ?? keyA;
      const labelB = valB.label ?? keyB;
      return labelA.localeCompare(labelB, ["en"]);
    }
  );

  const reordered = {};
  for (const [key, child] of sortedChildren) {
    sortCategoryTree(child);
    reordered[key] = child;
  }
  node.children = reordered;

  if (node.items) {
    node.items.sort((idA, idB) => {
      const metaA = itemMetadata[idA] || {};
      const metaB = itemMetadata[idB] || {};
      const a = metaA.priority ?? Number.POSITIVE_INFINITY;
      const b = metaB.priority ?? Number.POSITIVE_INFINITY;
      if (a !== b) return a - b;
      const nameA = metaA.name ?? idA;
      const nameB = metaB.name ?? idB;
      return nameA.localeCompare(nameB, ["en"]);
    });
  }

  return node;
}

sortCategoryTree(categoryTree);

// Sort csvList by category tree priorities
csvList.sort((a, b) => {
  const pathA = a.path.split(path.sep).filter(Boolean);
  const pathB = b.path.split(path.sep).filter(Boolean);

  // Compare each path segment
  const maxLen = Math.max(pathA.length, pathB.length);
  for (let i = 0; i < maxLen; i++) {
    if (i >= pathA.length) return -1; // a is shorter, comes first
    if (i >= pathB.length) return 1;  // b is shorter, comes first

    const segA = pathA[i];
    const segB = pathB[i];

    if (segA === segB) continue;

    // Navigate to parent node to get priorities
    let nodeA = categoryTree;
    let nodeB = categoryTree;
    for (let j = 0; j <= i; j++) {
      nodeA = nodeA.children?.[pathA[j]];
      nodeB = nodeB.children?.[pathB[j]];
      if (!nodeA || !nodeB) break;
    }

    const prioA = nodeA?.priority ?? Number.POSITIVE_INFINITY;
    const prioB = nodeB?.priority ?? Number.POSITIVE_INFINITY;

    if (prioA !== prioB) return prioA - prioB;

    const labelA = nodeA?.label ?? segA;
    const labelB = nodeB?.label ?? segB;
    return labelA.localeCompare(labelB, ["en"]);
  }

  return 0;
});

// Generate CREDITS.csv After Sorting Everything
let csvGenerated = "filename,notes,authors,licenses,urls\n";
for (const result of csvList) {
  for (const item of result.csv) {
    csvGenerated += item.lineText;
  }
}
fs.writeFile("CREDITS.csv", csvGenerated, function(err) {
  if (err) {
    return console.error(err);
  } else {
    console.log("CSV Updated!");
    printArray(licensesFound, "Found licenses");
  }
});

const metadataJS = `// THIS FILE IS AUTO-GENERATED. PLEASE DON'T ALTER IT MANUALLY
// Generated from sheet_definitions/*.json by scripts/generate_sources.js
// Contains metadata for all customization items to avoid DOM queries at runtime

window.itemMetadata = ${JSON.stringify(itemMetadata, null, 2)};

window.categoryTree = ${JSON.stringify(categoryTree, null, 2)};

window.paletteMetadata = ${JSON.stringify(paletteMetadata, null, 2)};
`;

fs.writeFile("item-metadata.js", metadataJS, function(err) {
  if (err) {
    return console.error(err);
  } else {
    console.log("Item Metadata JS Updated!");
  }
});

function printArray(array, label) {
  const colors = {
    red: "\x1b[31m",
    reset: "\x1b[0m"
  };
  console.log(`${label}: ${colors.red}[`);
  array.sort();
  for (const item of array) {
    console.log(`  "${item}",`);
  }
  console.log(`]${colors.reset}`);
}
