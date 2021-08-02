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
      } else if (requiredSexes[sexIdx] === 'muscular') {
        file = definition.file.muscular
      } else if (requiredSexes[sexIdx] === 'pregnant') {
        file = definition.file.pregnant
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

function replaceDivs() {
  $('#body-human').replaceWith(createGeneralHTML("sheet_definitions/body/human.json", "male,female", true));
  $('#body-reptile').replaceWith(createGeneralHTML("sheet_definitions/body/reptile.json", "male,female"));
  $('#body-orc').replaceWith(createGeneralHTML("sheet_definitions/body/orc.json", "male,female"));
  $('#body-wolfman').replaceWith(createGeneralHTML("sheet_definitions/body/wolfman.json", "male,female"));
  $('#body-skeleton').replaceWith(createGeneralHTML("sheet_definitions/body/skeleton.json", "male,female"));
  $('#body-special').replaceWith(createGeneralHTML("sheet_definitions/body/special.json", "male"));
  $('#body-pregnant').replaceWith(createGeneralHTML("sheet_definitions/body/pregnant.json", "pregnant"));
  $('#body-muscular').replaceWith(createGeneralHTML("sheet_definitions/body/muscular.json", "muscular"));
  $('#body-child').replaceWith(createGeneralHTML("sheet_definitions/body/child.json", "child"));

  $('#eyes').replaceWith(createGeneralHTML("sheet_definitions/eyes.json", "male,female,muscular,pregnant"));

  $('#beards-bigstache').replaceWith(createGeneralHTML("sheet_definitions/beards/bigstache.json", "male,muscular"));
  $('#beards-mustache').replaceWith(createGeneralHTML("sheet_definitions/beards/mustache.json", "male,muscular"));
  $('#beards-beard').replaceWith(createGeneralHTML("sheet_definitions/beards/beard.json", "male,muscular"));

  $('#facial').replaceWith(createGeneralHTML("sheet_definitions/facial.json", "male,female,muscular,pregnant"));

  $('#shoes-armour').replaceWith(createGeneralHTML("sheet_definitions/shoes/armour.json", "male,female,muscular,pregnant"));
  $('#shoes-slippers').replaceWith(createGeneralHTML("sheet_definitions/shoes/slippers.json", "female,pregnant"));
  $('#shoes-shoes').replaceWith(createGeneralHTML("sheet_definitions/shoes/shoes.json", "male,female,muscular,pregnant"));
  $('#shoes-sara').replaceWith(createGeneralHTML("sheet_definitions/shoes/sara.json", "female,pregnant"));
  $('#shoes-hoofs').replaceWith(createGeneralHTML("sheet_definitions/shoes/hoofs.json", "male,muscular"));
  $('#shoes-sandals').replaceWith(createGeneralHTML("sheet_definitions/shoes/sandals.json", "male,female,muscular,pregnant"));

  $('#legs-widepants').replaceWith(createGeneralHTML("sheet_definitions/legs/widepants.json", "muscular"));
  $('#legs-pantalons').replaceWith(createGeneralHTML("sheet_definitions/legs/pantalons.json", "male"));
  $('#legs-pants').replaceWith(createGeneralHTML("sheet_definitions/legs/pants.json", "male,female"));
  $('#legs-pregnantpants').replaceWith(createGeneralHTML("sheet_definitions/legs/pregnantpants.json", "pregnant"));
  $('#legs-leggings').replaceWith(createGeneralHTML("sheet_definitions/legs/leggings.json", "female"));
  $('#legs-childpants').replaceWith(createGeneralHTML("sheet_definitions/legs/childpants.json", "child"));
  $('#legs-childskirts').replaceWith(createGeneralHTML("sheet_definitions/legs/childskirts.json", "child"));
  $('#legs-skirts').replaceWith(createGeneralHTML("sheet_definitions/legs/skirts.json", "male,female"));
  $('#legs-armour').replaceWith(createGeneralHTML("sheet_definitions/legs/armour.json", "male,female"));

  $('#dress').replaceWith(createGeneralHTML("sheet_definitions/torso/dress.json", "female"));

  $('#boots').replaceWith(createGeneralHTML("sheet_definitions/shoes/boots.json", "female,pregnant"));

  $('#clothes-child_shirt').replaceWith(createGeneralHTML("sheet_definitions/torso/clothes/child_shirt.json", "child"));
  $('#clothes-male_longsleeve').replaceWith(createGeneralHTML("sheet_definitions/torso/clothes/male_longsleeve.json", "male"));
  $('#clothes-male_sleeveless').replaceWith(createGeneralHTML("sheet_definitions/torso/clothes/male_sleeveless.json", "male"));
  $('#clothes-tanktop').replaceWith(createGeneralHTML("sheet_definitions/torso/clothes/tanktop.json", "female,pregnant"));
  $('#clothes-female_sleeveless').replaceWith(createGeneralHTML("sheet_definitions/torso/clothes/female_sleeveless.json", "female"));
  $('#clothes-corset').replaceWith(createGeneralHTML("sheet_definitions/torso/clothes/corset.json", "female"));
  $('#clothes-blouse').replaceWith(createGeneralHTML("sheet_definitions/torso/clothes/blouse.json", "female"));
  $('#clothes-blouse_longsleeve').replaceWith(createGeneralHTML("sheet_definitions/torso/clothes/blouse_longsleeve.json", "female"));
  $('#clothes-scoop_shirt').replaceWith(createGeneralHTML("sheet_definitions/torso/clothes/scoop_shirt.json", "female"));
  $('#clothes-female_longsleeve').replaceWith(createGeneralHTML("sheet_definitions/torso/clothes/female_longsleeve.json", "female"));
  $('#clothes-tunic').replaceWith(createGeneralHTML("sheet_definitions/torso/clothes/tunic.json", "female"));
  $('#clothes-robe').replaceWith(createGeneralHTML("sheet_definitions/torso/clothes/robe.json", "female"));

  $('#apron').replaceWith(createGeneralHTML("sheet_definitions/torso/apron.json", "male,female"));
  $('#bandages').replaceWith(createGeneralHTML("sheet_definitions/torso/bandages.json", "male,female"));
  $('#chainmail').replaceWith(createGeneralHTML("sheet_definitions/torso/chainmail.json", "male,female"));

  $('#armour_plate').replaceWith(createGeneralHTML("sheet_definitions/torso/armour_plate.json", "male,female"));
  $('#armour_legion').replaceWith(createGeneralHTML("sheet_definitions/torso/armour_legion.json", "male,female"));
  $('#armour_leather').replaceWith(createGeneralHTML("sheet_definitions/torso/armour_leather.json", "male,female"));

  $('#jackets_male_tabard').replaceWith(createGeneralHTML("sheet_definitions/torso/clothes/male_tabard.json", "male"));
  $('#jackets_female_tabard').replaceWith(createGeneralHTML("sheet_definitions/torso/clothes/female_tabard.json", "female"));
  $('#jackets_gentleman').replaceWith(createGeneralHTML("sheet_definitions/torso/clothes/jacket_gentleman.json", "male"));

  $('#arms').replaceWith(createGeneralHTML("sheet_definitions/arms.json", "male,female,pregnant"));
  $('#bracers').replaceWith(createGeneralHTML("sheet_definitions/bracers.json", "male,female,pregnant,muscular"));

  $('#shoulders_plate').replaceWith(createGeneralHTML("sheet_definitions/shoulders/plate.json", "male,female,pregnant,muscular"));
  $('#shoulders_legion').replaceWith(createGeneralHTML("sheet_definitions/shoulders/legion.json", "male,female,pregnant,muscular"));
  $('#shoulders_leather').replaceWith(createGeneralHTML("sheet_definitions/shoulders/leather.json", "male,female,pregnant,muscular"));

  $('#belt_male').replaceWith(createGeneralHTML("sheet_definitions/torso/belt_male.json", "male"));
  $('#belt_female').replaceWith(createGeneralHTML("sheet_definitions/torso/belt_female.json", "female"));

  $('#buckles').replaceWith(createGeneralHTML("sheet_definitions/torso/buckles.json", "female"));

  $('#hair-long_straight').replaceWith(createGeneralHTML("sheet_definitions/hair/long_straight.json", "male,female,muscular,pregnant"));
  $('#hair-long_tied').replaceWith(createGeneralHTML("sheet_definitions/hair/long_tied.json", "male,female,muscular,pregnant"));
  $('#hair-idol').replaceWith(createGeneralHTML("sheet_definitions/hair/idol.json", "male,muscular"));
}
