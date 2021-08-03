function generateListHTML(json, checkFirst) {
  const definition = JSON.parse(loadFile(json));
  const variants = definition.variants
  const name = definition.name
  const typeName = definition.type_name

  var requiredSexes = [];

  if (definition.file !== undefined) {
    if (definition.file.male !== undefined) {
      requiredSexes.push("male");
    }
    if (definition.file.female !== undefined) {
      requiredSexes.push("female");
    }
    if (definition.file.child !== undefined) {
      requiredSexes.push("child");
    }
    if (definition.file.muscular !== undefined) {
      requiredSexes.push("muscular");
    }
    if (definition.file.pregnant !== undefined) {
      requiredSexes.push("pregnant");
    }
  } else {
    if (definition.file_behind.male !== undefined) {
      requiredSexes.push("male");
    }
    if (definition.file_behind.female !== undefined) {
      requiredSexes.push("female");
    }
    if (definition.file_behind.child !== undefined) {
      requiredSexes.push("child");
    }
    if (definition.file_behind.muscular !== undefined) {
      requiredSexes.push("muscular");
    }
    if (definition.file_behind.pregnant !== undefined) {
      requiredSexes.push("pregnant");
    }
  }

  const requiredSex = requiredSexes.join(",");

  const startHTML = `<li data-required="[REQUIRED_SEX]"><span class="condensed"">${name}</span><ul>`.replace("[REQUIRED_SEX]", requiredSex);
  const templateHTML = loadFile("html_templates/template-general.html");
  const endHTML = '</ul></li>';

  var idx = 0;
  var listItemsHTML = `<li><input type="radio" id="${typeName}-none" name="${typeName}"><label for="${typeName}-none">No ${typeName}</label></li>`;
  for (variant in variants) {
    const itemName = variants[idx];
    const itemIdFor = typeName + "-" + name.replaceAll(" ", "_") +  "_" + itemName.replaceAll(" ", "_");

    var dataFiles = "";
    var sexIdx = 0;
    var hasBehind = definition.file_behind !== undefined;
    var hasFile = definition.file !== undefined;
    for (sex in requiredSexes) {
      var file = "";
      var file_behind = "";
      if (requiredSexes[sexIdx] === 'male') {
        if (hasFile) {
          file = definition.file.male;
        }
        if (hasBehind) {
          file_behind = definition.file_behind.male;
        }
      } else if (requiredSexes[sexIdx] === 'female') {
        if (hasFile) {
          file = definition.file.female;
        }
        if (hasBehind) {
          file_behind = definition.file_behind.female;
        }
      } else if (requiredSexes[sexIdx] === 'child') {
        if (hasFile) {
          file = definition.file.child;
        }
        if (hasBehind) {
          file_behind = definition.file_behind.child;
        }
      } else if (requiredSexes[sexIdx] === 'muscular') {
        if (hasFile) {
          file = definition.file.muscular;
        }
        if (hasBehind) {
          file_behind = definition.file_behind.muscular;
        }
      } else if (requiredSexes[sexIdx] === 'pregnant') {
        if (hasFile) {
          file = definition.file.pregnant;
        }
        if (hasBehind) {
          file_behind = definition.file_behind.pregnant;
        }
      }
      if (file !== null && file !== "") {
        dataFiles += "data-file_" + requiredSexes[sexIdx] + "=\"" + file + itemName.replaceAll(" ", "_") + ".png\" ";
      }
      if (file_behind !== null && file_behind !== "") {
        dataFiles += "data-file_" + requiredSexes[sexIdx] + "_behind=\"" + file_behind + itemName.replaceAll(" ", "_") + ".png\" ";
      }
      sexIdx += 1;
    }
    listItemsHTML += templateHTML
      .replace("[ID_FOR]", itemIdFor)
      .replace("[TYPE_NAME]", typeName)
      .replace("[NAME]", itemName)
      .replace("[DATA_FILE]", dataFiles);
    if (checkFirst && idx == 0) {
      listItemsHTML = listItemsHTML.replace("[CHECKED]", "checked");
    } else {
      listItemsHTML = listItemsHTML.replace("[CHECKED]", "");
    }
    idx += 1;

  }
  return startHTML + listItemsHTML + endHTML;
}

function replaceDivs() {
  const matcher = "sheet_";
  $("div").each(function() {
    var id = $(this).attr('id');
    if (id.includes(matcher)) {
      var checkFirst = false;
      if (id === "sheet_body_human") {
        checkFirst = true;
      }
      $(`#${id}`).replaceWith(generateListHTML(`sheet_definitions/${id.replace(matcher,"")}.json`, checkFirst));
    }
  });
}
