function createGeneralHTML(json, checkFirst) {
  const definition = JSON.parse(loadFile(json));
  const variants = definition.variants
  const name = definition.name
  const typeName = definition.type_name

  var requiredSexes = [];

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
    for (sex in requiredSexes) {
      var file = "";
      var file_behind = "";
      if (requiredSexes[sexIdx] === 'male') {
        file = definition.file.male;
        if (hasBehind) {
          file_behind = definition.file_behind.male;
        }
      } else if (requiredSexes[sexIdx] === 'female') {
        file = definition.file.female;
        if (hasBehind) {
          file_behind = definition.file_behind.female;
        }
      } else if (requiredSexes[sexIdx] === 'child') {
        file = definition.file.child;
        if (hasBehind) {
          file_behind = definition.file_behind.child;
        }
      } else if (requiredSexes[sexIdx] === 'muscular') {
        file = definition.file.muscular;
        if (hasBehind) {
          file_behind = definition.file_behind.muscular;
        }
      } else if (requiredSexes[sexIdx] === 'pregnant') {
        file = definition.file.pregnant;
        if (hasBehind) {
          file_behind = definition.file_behind.pregnant;
        }
      }
      dataFiles += "data-file_" + requiredSexes[sexIdx] + "=\"" + file + itemName.replaceAll(" ", "_") + ".png\" ";
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
  $('#body-human').replaceWith(createGeneralHTML("sheet_definitions/body/human.json", true));
  $('#body-reptile').replaceWith(createGeneralHTML("sheet_definitions/body/reptile.json"));
  $('#body-orc').replaceWith(createGeneralHTML("sheet_definitions/body/orc.json"));
  $('#body-wolfman').replaceWith(createGeneralHTML("sheet_definitions/body/wolfman.json"));
  $('#body-skeleton').replaceWith(createGeneralHTML("sheet_definitions/body/skeleton.json"));
  $('#body-special').replaceWith(createGeneralHTML("sheet_definitions/body/special.json"));
  $('#body-pregnant').replaceWith(createGeneralHTML("sheet_definitions/body/pregnant.json"));
  $('#body-muscular').replaceWith(createGeneralHTML("sheet_definitions/body/muscular.json"));
  $('#body-child').replaceWith(createGeneralHTML("sheet_definitions/body/child.json"));

  $('#eyes').replaceWith(createGeneralHTML("sheet_definitions/eyes.json"));

  $('#beards-bigstache').replaceWith(createGeneralHTML("sheet_definitions/beards/bigstache.json"));
  $('#beards-mustache').replaceWith(createGeneralHTML("sheet_definitions/beards/mustache.json"));
  $('#beards-beard').replaceWith(createGeneralHTML("sheet_definitions/beards/beard.json"));

  $('#facial').replaceWith(createGeneralHTML("sheet_definitions/facial.json"));

  $('#shoes-armour').replaceWith(createGeneralHTML("sheet_definitions/shoes/armour.json"));
  $('#shoes-slippers').replaceWith(createGeneralHTML("sheet_definitions/shoes/slippers.json"));
  $('#shoes-shoes').replaceWith(createGeneralHTML("sheet_definitions/shoes/shoes.json"));
  $('#shoes-sara').replaceWith(createGeneralHTML("sheet_definitions/shoes/sara.json"));
  $('#shoes-hoofs').replaceWith(createGeneralHTML("sheet_definitions/shoes/hoofs.json"));
  $('#shoes-sandals').replaceWith(createGeneralHTML("sheet_definitions/shoes/sandals.json"));

  $('#legs-widepants').replaceWith(createGeneralHTML("sheet_definitions/legs/widepants.json"));
  $('#legs-pantalons').replaceWith(createGeneralHTML("sheet_definitions/legs/pantalons.json"));
  $('#legs-pants').replaceWith(createGeneralHTML("sheet_definitions/legs/pants.json"));
  $('#legs-pregnantpants').replaceWith(createGeneralHTML("sheet_definitions/legs/pregnantpants.json"));
  $('#legs-leggings').replaceWith(createGeneralHTML("sheet_definitions/legs/leggings.json"));
  $('#legs-childpants').replaceWith(createGeneralHTML("sheet_definitions/legs/childpants.json"));
  $('#legs-childskirts').replaceWith(createGeneralHTML("sheet_definitions/legs/childskirts.json"));
  $('#legs-skirts').replaceWith(createGeneralHTML("sheet_definitions/legs/skirts.json"));
  $('#legs-armour').replaceWith(createGeneralHTML("sheet_definitions/legs/armour.json"));

  $('#dress').replaceWith(createGeneralHTML("sheet_definitions/torso/dress.json"));

  $('#boots').replaceWith(createGeneralHTML("sheet_definitions/shoes/boots.json"));

  $('#clothes-child_shirt').replaceWith(createGeneralHTML("sheet_definitions/torso/clothes/child_shirt.json"));
  $('#clothes-male_longsleeve').replaceWith(createGeneralHTML("sheet_definitions/torso/clothes/male_longsleeve.json"));
  $('#clothes-male_sleeveless').replaceWith(createGeneralHTML("sheet_definitions/torso/clothes/male_sleeveless.json"));
  $('#clothes-tanktop').replaceWith(createGeneralHTML("sheet_definitions/torso/clothes/tanktop.json"));
  $('#clothes-female_sleeveless').replaceWith(createGeneralHTML("sheet_definitions/torso/clothes/female_sleeveless.json"));
  $('#clothes-corset').replaceWith(createGeneralHTML("sheet_definitions/torso/clothes/corset.json"));
  $('#clothes-blouse').replaceWith(createGeneralHTML("sheet_definitions/torso/clothes/blouse.json"));
  $('#clothes-blouse_longsleeve').replaceWith(createGeneralHTML("sheet_definitions/torso/clothes/blouse_longsleeve.json"));
  $('#clothes-scoop_shirt').replaceWith(createGeneralHTML("sheet_definitions/torso/clothes/scoop_shirt.json"));
  $('#clothes-female_longsleeve').replaceWith(createGeneralHTML("sheet_definitions/torso/clothes/female_longsleeve.json"));
  $('#clothes-tunic').replaceWith(createGeneralHTML("sheet_definitions/torso/clothes/tunic.json"));
  $('#clothes-robe').replaceWith(createGeneralHTML("sheet_definitions/torso/clothes/robe.json"));

  $('#apron').replaceWith(createGeneralHTML("sheet_definitions/torso/apron.json"));
  $('#bandages').replaceWith(createGeneralHTML("sheet_definitions/torso/bandages.json"));
  $('#chainmail').replaceWith(createGeneralHTML("sheet_definitions/torso/chainmail.json"));

  $('#armour_plate').replaceWith(createGeneralHTML("sheet_definitions/torso/armour_plate.json"));
  $('#armour_legion').replaceWith(createGeneralHTML("sheet_definitions/torso/armour_legion.json"));
  $('#armour_leather').replaceWith(createGeneralHTML("sheet_definitions/torso/armour_leather.json"));

  $('#jackets_male_tabard').replaceWith(createGeneralHTML("sheet_definitions/torso/clothes/male_tabard.json"));
  $('#jackets_female_tabard').replaceWith(createGeneralHTML("sheet_definitions/torso/clothes/female_tabard.json"));
  $('#jackets_gentleman').replaceWith(createGeneralHTML("sheet_definitions/torso/clothes/jacket_gentleman.json"));

  $('#arms').replaceWith(createGeneralHTML("sheet_definitions/arms.json"));
  $('#bracers').replaceWith(createGeneralHTML("sheet_definitions/bracers.json"));

  $('#shoulders_plate').replaceWith(createGeneralHTML("sheet_definitions/shoulders/plate.json"));
  $('#shoulders_legion').replaceWith(createGeneralHTML("sheet_definitions/shoulders/legion.json"));
  $('#shoulders_leather').replaceWith(createGeneralHTML("sheet_definitions/shoulders/leather.json"));

  $('#belt_male').replaceWith(createGeneralHTML("sheet_definitions/torso/belt_male.json"));
  $('#belt_female').replaceWith(createGeneralHTML("sheet_definitions/torso/belt_female.json"));

  $('#buckles').replaceWith(createGeneralHTML("sheet_definitions/torso/buckles.json"));
  $('#necklace').replaceWith(createGeneralHTML("sheet_definitions/necklace.json"));

  $('#cape_solid').replaceWith(createGeneralHTML("sheet_definitions/cape_solid.json"));
  $('#cape_trimmed').replaceWith(createGeneralHTML("sheet_definitions/cape_trimmed.json"));
  $('#cape_tattered').replaceWith(createGeneralHTML("sheet_definitions/cape_tattered.json"));

  $('#hair-long_straight').replaceWith(createGeneralHTML("sheet_definitions/hair/long_straight.json"));
  $('#hair-long_tied').replaceWith(createGeneralHTML("sheet_definitions/hair/long_tied.json"));
  $('#hair-idol').replaceWith(createGeneralHTML("sheet_definitions/hair/idol.json"));
}
