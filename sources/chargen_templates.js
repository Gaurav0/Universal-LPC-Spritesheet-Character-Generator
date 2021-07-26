function createMaleAndFemaleHTML(json, checkFirst) {
  const definition = JSON.parse(loadFile(json));
  const variants = definition.variants
  const name = definition.name
  const typeName = definition.type_name
  const fileMalePath = definition.file_male_path
  const fileFemalePath = definition.file_female_path

  const startHTML = `<li><span class="condensed">${name}</span><ul>`;
  const templateHTML = loadFile("html_templates/template-male_and_female.html");
  const endHTML = '</ul></li>';

  var idx = 0;
  var listItemsHTML = '';
  for (const variant in variants) {
    const itemName = variants[idx];
    const itemFileMale = fileMalePath + itemName.replaceAll(" ", "_") + ".png";
    const itemFileFemale = fileFemalePath + itemName.replaceAll(" ", "_") + ".png";
    const itemIdFor = typeName + "-" + name.replaceAll(" ", "_") +  "_" + itemName.replaceAll(" ", "_");

    listItemsHTML += templateHTML.replace("[ID_FOR]", itemIdFor).replace("[TYPE_NAME]", typeName).replace("[MALE_FILE]", itemFileMale).replace("[FEMALE_FILE]", itemFileFemale).replace("[NAME]", itemName);
    if (idx === 0 && checkFirst) {
      listItemsHTML = listItemsHTML.replace("[EXTRA_PROPS]", "checked")
    } else {
      listItemsHTML = listItemsHTML.replace("[EXTRA_PROPS]", "")
    }
    idx+=1;
  }
  return startHTML + listItemsHTML + endHTML;
}

function createMaleOrFemaleHTML(json, sex) {
  const definition = JSON.parse(loadFile(json));
  const variants = definition.variants
  const name = definition.name
  const typeName = definition.type_name
  const filePath = definition.file_path

  const startHTML = `<li><span class="condensed">${name}</span><ul>`;
  const templateHTML = loadFile("html_templates/template-male_or_female.html");
  const endHTML = '</ul></li>';

  var idx = 0;
  var listItemsHTML = '';
  for (const variant in variants) {
    const itemName = variants[idx];
    const itemFile = filePath + itemName.replaceAll(" ", "_") + ".png";
    const itemIdFor = typeName + "-" + name.replaceAll(" ", "_") +  "_" + itemName.replaceAll(" ", "_");

    listItemsHTML += templateHTML.replace("[ID_FOR]", itemIdFor).replace("[TYPE_NAME]", typeName).replace("[FILE]", itemFile).replace("[NAME]", itemName);
    listItemsHTML = listItemsHTML.replace("[REQUIRED_SEX]", sex)
    idx+=1;
  }
  return startHTML + listItemsHTML + endHTML;
}
