const fs = require('fs');
const readline = require('readline');

require('child_process').fork('scripts/zPositioning/parse_zpos.js');

var licensesFound = [];
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

  for (var creditsIndex = 0; creditsIndex < credits.length; creditsIndex++) {
    const credit = credits[creditsIndex];
    if (credit.file === fileName || credit.file === fileName + ".png" || credit.file + "/" === fileName) {
      return credit;
    }
  }
  
  const index = fileName.lastIndexOf("\/");
  if (index > -1) {
    return searchCredit(fileName.substring(0, index), credits, origFileName);
  } else {
    console.error("missing credit after searching recursively filename:", origFileName);
    return undefined;
  }
}

function parseJson(json) {
  const definition = JSON.parse(fs.readFileSync(`sheet_definitions/${json}`));
  const variants = definition.variants;
  const name = definition.name;
  const typeName = definition.type_name;
  const credits = definition.credits;
  const template = definition.template;
  const defaultAnimations = ['spellcast', 'thrust', 'walk', 'slash', 'shoot', 'hurt', 'watering'];

  const requiredSexes = [];
  const animations = definition.animations ?? defaultAnimations;

  const previewRow = definition.preview_row ?? 2;
  const previewColumn = definition.preview_column ?? 0;
  const previewXOffset = definition.preview_x_offset ?? 0;
  const previewYOffset = definition.preview_y_offset ?? 0;

  const sexes = [
    "male",
    "female",
    "teen",
    "child",
    "muscular",
    "pregnant"
  ];
  for (const sex of sexes) {
    if (definition.layer_1[sex]) {
      requiredSexes.push(sex);
    }
  }

  const requiredSex = requiredSexes.join(",");
  const supportedAnimations = animations.join(",");

  const startHTML = `<li data-required="[REQUIRED_SEX]" data-animations="[SUPPORTED_ANIMATIONS]"><span class="condensed">${name}</span><ul>`.replace("[REQUIRED_SEX]", requiredSex).replace("[SUPPORTED_ANIMATIONS]", supportedAnimations);
  const templateHTML = fs.readFileSync("scripts/template-general.html", 'utf8');

  const endHTML = '</ul></li>';

  var idx = 0;
  var listItemsHTML = `<li><input type="radio" id="${typeName}-none_${name}" name="${typeName}"> <label for="${typeName}-none">No ${typeName}</label></li>`;
  var listItemsCSV = "";
  var addedCreditsFor = [];
  for (const variant of variants) {
    const itemName = variants[idx];
    const itemIdFor = typeName + "-" + name.replaceAll(" ", "_") +  "_" + itemName.replaceAll(" ", "_");
    var matchBodyColor = false;
    if (definition[`match_body_color`] !== undefined) {
      matchBodyColor = true;
    }
    var dataFiles = "";
    var sexIdx = 0;
    for (const sex of requiredSexes) {
      for (jdx =1; jdx < 10; jdx++) {
        const layerDefinition = definition[`layer_${jdx}`];
        if (layerDefinition !== undefined) {
          if (sexIdx === 0) {
            const zPos = definition[`layer_${jdx}`].zPos;
            dataFiles += "data-preview_row=" + previewRow + " data-preview_column=" + previewColumn + " data-preview_x_offset=" + previewXOffset + " data-preview_y_offset=" + previewYOffset +  " data-layer_" + jdx + "_zpos=" + zPos + " ";
            const custom_animation = layerDefinition.custom_animation;
            if (custom_animation !== undefined) {
              dataFiles += `data-layer_${jdx}_custom_animation=` + custom_animation + " "
            }
          }
          const file = layerDefinition[requiredSexes[sexIdx]]
          if (file !== null && file !== "") {
            const imageFileName = "\"" + file + itemName.replaceAll(" ", "_") + ".png\" ";
            const fileNameForCreditSearch = file + itemName.replaceAll(" ", "_");
            dataFiles += "data-layer_" + jdx + "_" + requiredSexes[sexIdx] + "=" + imageFileName;
            const creditToUse = searchCredit(fileNameForCreditSearch, credits, fileNameForCreditSearch);
            if (creditToUse !== undefined) {
              var licenseIdx = 0;
              for (license in creditToUse.licenses) {
                var licenseName = creditToUse.licenses[licenseIdx];
                if (!licensesFound.includes(licenseName)) {
                  licensesFound.push(licenseName);
                }
                licenseIdx+=1
              }
              const licenses = "\"" + creditToUse.licenses.join(',') + "\"";
              dataFiles += "data-layer_" + jdx + "_" + requiredSexes[sexIdx] + "_licenses=" + licenses;
              const authors = "\"" + creditToUse.authors.join(',') + "\"";
              dataFiles += "data-layer_" + jdx + "_" + requiredSexes[sexIdx] + "_authors=" + authors;
              const urls = "\"" + creditToUse.urls.join(',') + "\"";
              dataFiles += "data-layer_" + jdx + "_" + requiredSexes[sexIdx] + "_urls=" + urls;
              const notes = "\"" + creditToUse.notes.replaceAll("\"", "**") + "\"";
              dataFiles += "data-layer_" + jdx + "_" + requiredSexes[sexIdx] + "_notes=" + notes;
              if (!addedCreditsFor.includes(imageFileName)) {
                listItemsCSV += `${"\"" + file + itemName + ".png\""},${notes},${authors},${licenses},${urls}\n`;
                addedCreditsFor.push(imageFileName);
              }
            } else {
              throw Error(`missing credit inside ${json}`);
            }
          }
        } else {
          break;
        }
      }
      sexIdx += 1;
    }
    listItemsHTML += templateHTML
      .replaceAll("[ID_FOR]", itemIdFor)
      .replaceAll("[TYPE_NAME]", typeName)
      .replaceAll("[NAME]", itemName)
      .replaceAll("[PARENT_NAME]", name)
      .replaceAll("[MATCH_BODY_COLOR]", matchBodyColor)
      .replaceAll("[VARIANT]", itemName)
      .replaceAll("[DATA_FILE]", dataFiles);
    idx += 1;
  }
  const html = startHTML + listItemsHTML + endHTML;
  let parsed = {};
  parsed.html = html;
  parsed.csv = listItemsCSV;
  return parsed;
}

var lineReader = readline.createInterface({
  input: fs.createReadStream('sources/source_index.html')
});
var htmlGenerated = '<!-- THIS FILE IS AUTO-GENERATED. PLEASE DONT ALTER IT MANUALLY -->\n';
var csvGenerated = "filename,notes,authors,licenses,urls\n"

lineReader.on('line', function (line) {
  if (line.includes('div_sheet_')) {
    const definition = line.replace("div_sheet_","");
    const parsedResult = parseJson(`${definition}.json`.replaceAll("\t", ""));
    const newLineHTML = parsedResult.html;
    htmlGenerated+=newLineHTML+"\n";
    csvGenerated+=parsedResult.csv;
  } else {
    htmlGenerated+=line+"\n";
  }
});

lineReader.on('close', function (line) {
  fs.writeFile('index.html', htmlGenerated, function(err) {
    if (err) {
        return console.log(err);
    } else {
        console.log('HTML Updated!');
    }
  });
  fs.writeFile('CREDITS.csv', csvGenerated, function(err) {
    if (err) {
        return console.log(err);
    } else {
        console.log('CSV Updated!');
        console.log('Found licenses:', licensesFound)
    }
  });
});