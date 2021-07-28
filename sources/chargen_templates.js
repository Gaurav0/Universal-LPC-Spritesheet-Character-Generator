function createGeneralHTML(json, requiredSex, checkFirst) {
  const definition = JSON.parse(loadFile(json));
  const variants = definition.variants
  const name = definition.name
  const typeName = definition.type_name
  const fileMalePath = definition.file_male_path
  const fileFemalePath = definition.file_female_path

  const requiredSexes = requiredSex.split(",");

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
    for (sex in requiredSexes) {
      var file = "";
      if (requiredSexes[sexIdx] === 'male') {
        file = definition.file.male
      } else if (requiredSexes[sexIdx] === 'female') {
        file = definition.file.female
      } else if (requiredSexes[sexIdx] === 'child') {
        file = definition.file.child
      }
      dataFiles += "data-file_" + requiredSexes[sexIdx] + "=\"" + file + itemName.replaceAll(" ", "_") + ".png\" ";
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
