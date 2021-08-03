_.mixin(_.str.exports());

$(document).ready(function() {

  var params = jHash.val();
  var zPosition = 0;
  var sheetCredits = [];
  const creditColumns = "filename,notes,authors,licenses,url1,url2,url3,url4,url5,status";
  const hairMalePrefix = "hair/male/"; // used to detect a male hairstyle graphic, which are not added per color to CREDITS.csv
  const hairFemalePrefix = "hair/female/"; // used to detect a female hairstyle graphic, which are not added per color to CREDITS.csv
  const parsedCredits = loadFile("CREDITS.csv").split("\n");

  // on hash (url) change event, interpret and redraw
  jHash.change(function() {
    params = jHash.val();
    interpretParams();
    redraw();
  });

  replaceDivs();

  $("input[type=radio], input[type=checkbox]").attr('title', function() {
    var name = "";
    if ($(this).data("file")) {
      name = $(this).data("file");
    } else if ($(this).data("file_male")) {
      name = $(this).data("file_male");
    } else if ($(this).data("file_female")) {
      name = $(this).data("file_female");
    } else if ($(this).data("file_child")) {
      name = $(this).data("file_child");
    } else if ($(this).data("file_muscular")) {
      name = $(this).data("file_muscular");
    } else if ($(this).data("file_pregnant")) {
      name = $(this).data("file_pregnant");
    }
    const creditEntry = getCreditFor(name);
    if (creditEntry) {
      let parts = splitCsv(creditEntry);
      if (parts.length == 10) {
        return "Created by: " + parts[2];
      }
    } else {
      return "No credits found for this graphic";
    }
    return creditEntry;
  });

  function getCreditFor(fileName) {
    if (fileName !== "") {
      let fileNameParsed = fileName
      if (fileName.startsWith(hairMalePrefix) || fileName.startsWith(hairFemalePrefix)) {
        let parts = fileName.split("/");
        if (parts.length == 4) {
          fileNameParsed = parts[0] + "/" + parts[1] + "/"  + parts[2];
        }
      }
      for (let creditEntry of parsedCredits) {
        if (creditEntry.startsWith(fileNameParsed)) {
          return creditEntry;
        }
      };
    }
  }

  function addCreditFor(fileName) {
    if (fileName !== "") {
      let creditEntry = getCreditFor(fileName);
      if (!creditEntry) {
        sheetCredits.push(fileName+",!MISSING LICENSE INFORMATION! PLEASE CORRECT MANUALY AND REPORT BACK VIA A GITHUB ISSUE,,,,,,,,NOK");
      } else {
        sheetCredits.push(creditEntry);
      }
    }
    displayCredits();
  }

  function displayCredits() {
    $("textarea#creditsText").val(sheetCredits.join('\n'));
  }

  // set params and redraw when any radio button or checkbox is clicked on
  $("input[type=radio], input[type=checkbox]").each(function() {
    $(this).click(function() {
      setParams();
      redraw();
    });
  });

  // Do not multiple toggle when clicking on children
  $("#chooser>ul>li>ul>li>ul>li").click(function(event) {
    event.stopPropagation();
  });

  // Toggle display of a list elements children when clicked
  // Do not do so twice, once on label then on input
  // Again, do not multiple toggle when clicking on children
  $("#chooser>ul>li>ul>li").click(function(event) {
    if (!($(event.target).get(0).tagName == "LABEL")) {
      $(this).children("span").toggleClass("condensed").toggleClass("expanded");
      var $ul = $(this).children("ul");
      $ul.toggle('slow').promise().done(drawPreviews);
    }
    event.stopPropagation();
  });

  // Toggle display of a list elements children when clicked
  // Again, do not multiple toggle when clicking on children
  $("#chooser>ul>li").click(function(event) {
    $(this).children("span").toggleClass("condensed").toggleClass("expanded");
    var $ul = $(this).children("ul");
    $ul.toggle('slow').promise().done(drawPreviews);
    event.stopPropagation();
  });

  // When clicking on collapse all link, collapse all uls in #chooser
  $("#collapse").click(function() {
    $("#chooser>ul ul").hide('slow');
    $("#chooser>ul span.expanded").removeClass("expanded").addClass("condensed");
  });

  var canvas = $("#spritesheet").get(0);
  var ctx = canvas.getContext("2d");

  $("#previewFile").change(function() {
    previewFile();
  });

  $("#ZPOS").change(function() {
    previewFile();
  });

  function previewFile(){
    var preview = document.querySelector('img'); //selects the query named img
    var file    = document.querySelector('input[type=file]').files[0]; //sames as here

    var img = new Image;
    img.onload = function() {
      images["uploaded"] = img;
      redraw();
    }
    img.src = URL.createObjectURL(file);
  }

  function renameImageDownload(link, canvasItem, filename) {
    link.href = canvasItem.toDataURL();
    link.download = filename;
  };

  // Save canvas as PNG
  $("#saveAsPNG").click(function() {
    renameImageDownload(this, canvas, 'Download' + Math.floor(Math.random() * 100000) + '.png');
  });

  $("#resetAll").click(function() {
    window.setTimeout(function() {
      document.getElementById("previewFile").value = "";
      images["uploaded"] = null;
      document.getElementById("ZPOS").value = 0;
      document.getElementById("customFrames").value = "";
      params = {};
      jHash.val(params);
      redraw();
    }, 0, false);
  });

  $("#generateSheetCredits").click(function() {
    let bl = new Blob([sheetCredits.join('\n')], {
      type: "text/html"
    });
    let a = document.createElement("a");
    a.href = URL.createObjectURL(bl);
    a.download = "sheet-credits.csv";
    a.hidden = true;
    document.body.appendChild(a);
    a.innerHTML = "dummyhtml";
    a.click();
    document.removeChild(a);
  });

  $("#generateAllCredits").click(function() {
    let bl = new Blob([parsedCredits.join('\n')], {
      type: "text/html"
    });
    let a = document.createElement("a");
    a.href = URL.createObjectURL(bl);
    a.download = "all-credits.csv";
    a.hidden = true;
    document.body.appendChild(a);
    a.innerHTML = "dummyhtml";
    a.click();
    document.removeChild(a);
  });

  // Determine if an oversize element used
  var oversize = $("input[type=radio]").filter(function() {
    return $(this).data("oversize");
  }).length > 0;

  // Expand canvas if oversize element used
  if (oversize) {
    canvas.width = 1536;
    canvas.height = 1344 + 768;
  } else {
    canvas.width = 832;
    canvas.height = 1344;
  }
  $("#chooser>ul").css("height", canvas.height);

  function getBodyTypeName() {
    if ($("#sex-male").prop("checked")) {
      return "male";
    } else if ($("#sex-female").prop("checked")) {
      return "female";
    } else if ($("#sex-child").prop("checked")) {
      return "child";
    } else if ($("#sex-muscular").prop("checked")) {
      return "muscular";
    } else if ($("#sex-pregnant").prop("checked")) {
      return "pregnant";
    }
    return "ERROR";
  }

  function redraw() {
    const zposPreview = parseInt(document.getElementById("ZPOS").value) || 0;
    const bodyTypeName = getBodyTypeName();
    let didDrawPreview = false;
    let wolfmanBody = "";
    let isBoar = false;

    sheetCredits = [creditColumns];
    zPosition = 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // determine if an oversize element is being used
    oversize = $("input[type=radio]:checked").filter(function() {
      return $(this).data("oversize");
    }).length > 0;

    // If an oversize element is being used, expand canvas,
    // otherwise return it to normal size
    if (oversize) {
      canvas.width = 1536;
      canvas.height = 1344 + 768;
    } else {
      canvas.width = 832;
      canvas.height = 1344;
    }
    $("#chooser>ul").css("height", canvas.height);
    oversize = !!oversize;

    // non oversize elements
    $("input[type=radio]:checked, input[type=checkbox]:checked").filter(function() {
      return !$(this).data("oversize");
    }).each(function(index) {
      if (zposPreview == zPosition) {
        if (!didDrawPreview) {
          drawPreview();
          didDrawPreview = true;
        }
      }
      // save this in closure
      var $this = $(this);
      var fileName = "";

      // if data-file specified
      if ($(this).data("file")) {
        var img = getImage($(this).data("file"));
        fileName = $(this).data("file");
        // if data-behind specified, draw behind existing pixels
        if ($(this).data("behind")) {
          ctx.globalCompositeOperation = "destination-over";
          drawImage(ctx, img);
          ctx.globalCompositeOperation = "source-over";
        } else
        drawImage(ctx, img);
      }

      // if data-file_behind specified
      if ($(this).data(`file_${bodyTypeName}_behind`)) {
        var img = getImage($(this).data(`file_${bodyTypeName}_behind`));
        ctx.globalCompositeOperation = "destination-over";
        drawImage(ctx, img);
        fileName = $(this).data(`file_${bodyTypeName}_behind`);
        ctx.globalCompositeOperation = "source-over";
      }

      // Deal with shield/chain hat overlap issue
      if ($(this).data("file_hat") && $("#hat_chain").prop("checked")) {
        var img = getImage($(this).data("file_hat"));
        drawImage(ctx, img);
        fileName = $(this).data("file_hat");
      }
      if ($(this).data("file_no_hat") && !$("#hat_chain").prop("checked")) {
        var img = getImage($(this).data("file_no_hat"));
        drawImage(ctx, img);
        fileName = $(this).data("file_no_hat");
      }

      // if data-file_male and data-file_female is specified
      if ($(this).data(`file_${bodyTypeName}`)) {
        var img = getImage($(this).data(`file_${bodyTypeName}`));
        drawImage(ctx, img);
        fileName = $(this).data(`file_${bodyTypeName}`);
        if (fileName.includes("/wolf/")) {
          wolfmanBody = fileName.replace(`body/${bodyTypeName}/wolf/`, "")+`${bodyTypeName}`;
        } else if (fileName.includes("/boarman.png")) {
          isBoar = true;
        }
      }

      addCreditFor(fileName);
    });

    if (wolfmanBody !== "") {
      var img = getImage(`/body/${bodyTypeName}/wolf/head/`+wolfmanBody.replace(`${bodyTypeName}`, ""));
      drawImage(ctx, img);
    } else if (isBoar) {
      var img = getImage("/body/male/special/boarman_head.png");
      drawImage(ctx, img);
    }
    if (!didDrawPreview) { // zposition was to high or low, draw anyways over all
      drawPreview();
      didDrawPreview = true;
    }

    // Oversize weapons: Copy existing canvas poses to new locations
    // with 192x192 padding rather than 64x64
    // data-oversize="1" means thrust weapon
    // data-oversize="2" means slash weapon
    // use appropriate thrust or slash pose
    if (oversize) {
      $("input[type=radio]:checked").filter(function() {
        return $(this).data("oversize");
      }).each(function(index) {
        const name = $(this).data(`file_${bodyTypeName}`);
        if (name.includes("flail") || name.includes("halberd") || name.includes("waraxe") || name.includes("rapier") || name.includes("saber") || name.includes("glowsword") || name.includes("scythe") || name.includes("mace") || name.includes("longsword")) {
          var img = getImage(name.replace("attack", "universal"));
          drawImage(ctx, img);
        }
        addCreditFor(name);

        var type = $(this).data("oversize");
        if (type == 1) {
          for (var i = 0; i < 8; ++i)
          for (var j = 0; j < 4; ++j) {
            var imgData = ctx.getImageData(64 * i, 256 + 64 * j, 64, 64);
            ctx.putImageData(imgData, 64 + 192 * i, 1408 + 192 * j);
          }
        } else if (type == 2) {
          for (var i = 0; i < 6; ++i)
          for (var j = 0; j < 4; ++j) {
            var imgData = ctx.getImageData(64 * i, 768 + 64 * j, 64, 64);
            ctx.putImageData(imgData, 64 + 192 * i, 1408 + 192 * j);
          }
        }
        var img = getImage($(this).data(`file_${bodyTypeName}`));
        if ($(this).data("file")) {
          img = getImage($(this).data("file"));
        }
        ctx.drawImage(img, 0, 1344);
      });
    }

    $("li").each(function(index) {
      if ($(this).data("required")) {
        var requiredType = $(this).data("required").split(",");
        if (getBodyTypeName() === "male" && !requiredType.includes('male')) {
          $(this).prop("style", "display:none");
        } else if (getBodyTypeName() === "female" && !requiredType.includes('female')) {
          $(this).prop("style", "display:none");
        } else if (getBodyTypeName() === "child" && !requiredType.includes('child')) {
          $(this).prop("style", "display:none");
        } else if (getBodyTypeName() === "pregnant" && !requiredType.includes('pregnant')) {
          $(this).prop("style", "display:none");
        } else if (getBodyTypeName() === "muscular" && !requiredType.includes('muscular')) {
          $(this).prop("style", "display:none");
        } else  {
          $(this).prop("style", "");
        }
      }
    });
  }

  function loadFile(filePath) {
    var result = null;
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", filePath, false);
    xmlhttp.send();
    return xmlhttp.responseText;
  }

  function drawPreview() {
    if (images["uploaded"] != null) {
      drawImage(ctx, images["uploaded"]);
    }
  }

  // Change checkboxes based on parameters
  function interpretParams() {
    $("input[type=radio]").each(function() {
      var words = _.words($(this).attr('id'), '-');
      var initial = _.initial(words).join('-');
      $(this).prop("checked", $(this).attr("checked") || params[initial] == _.last(words));
    });
    $("input[type=checkbox]").each(function() {
      $(this).prop("checked", _.toBool(params[$(this).attr('id')]));
    });
  }

  // Set parameters in response to click on any radio button or checkbox
  function setParams() {
    $("input[type=radio]:checked").each(function() {
      var words = _.words($(this).attr('id'), '-');
      var initial = _.initial(words).join('-');
      if (!$(this).attr("checked") || params[initial]) {
        params[initial] = _.last(words);
      }
    });
    $("input[type=checkbox]").each(function() {
      if (_.toBool($(this).attr("checked")) != $(this).prop("checked") ||
      _.toBool(params[$(this).attr('id')]) != $(this).prop("checked"))
      params[$(this).attr('id')] = $(this).prop("checked") ? 1 : 0;
    });
    jHash.val(params);
  }

  // Cache images
  var images = {};

  function getImage(imgRef) {
    if (images[imgRef])
    return images[imgRef];
    else {
      var img = new Image();
      img.src = "spritesheets/" + imgRef;
      img.onload = redraw;
      images[imgRef] = img;
      return img;
    }
  }

  function getImage2(imgRef, callback) {
    if (images[imgRef]) {
      callback(images[imgRef]);
      return images[imgRef];
    } else {

      // Load image if not in cache
      var img = new Image();
      img.src = "spritesheets/" + imgRef;
      img.onload = function() { callback(img) };
      images[imgRef] = img;
      return img;
    }
  }

  // Do not stop running all javascript if image not available
  function drawImage(ctx, img) {
    try {
      ctx.drawImage(img, 0, 0);
      zPosition++;
    } catch(err) {
      console.error("Error: could not find " + img.src);
    }
  }

  // Draw now - on ready
  interpretParams();
  if (Object.keys(params).length == 0) {
    $("input[type=reset]").click();
    setParams();
  }
  redraw();

  // Draw preview images
  function drawPreviews() {
    this.find("input[type=radio], input[type=checkbox]").filter(function() {
      return $(this).is(":visible");
    }).each(function() {
      if (!$(this).parent().hasClass("hasPreview")) {
        var prev = document.createElement("canvas");
        var oversize = $(this).data("oversize");
        prev.setAttribute("width", 64);
        prev.setAttribute("height", 64);
        var prevctx = prev.getContext("2d");
        var img = null;
        var previewRow = $(this).data("preview_row");
        if (!previewRow)
        previewRow = 10;
        else
        previewRow = parseInt(previewRow);
        var callback = function(img) {
          try {
            if (oversize)
            prevctx.drawImage(img, 0, 2 * 192, 192, 192, 0, 0, 64, 64);
            else
            prevctx.drawImage(img, 0, previewRow * 64, 64, 64, 0, 0, 64, 64);
          } catch (err) {
            console.log(err);
          }
        };
        if ($(this).data("file"))
        img = getImage2($(this).data("file"), callback);
        if ($(this).data("file_child"))
        img = getImage2($(this).data("file_child"), callback);
        else if ($(this).data("file_male"))
        img = getImage2($(this).data("file_male"), callback);
        else if ($(this).data("file_female"))
        img = getImage2($(this).data("file_female"), callback);
        else if ($(this).data("file_muscular"))
        img = getImage2($(this).data("file_muscular"), callback);
        else if ($(this).data("file_pregnant"))
        img = getImage2($(this).data("file_pregnant"), callback);
        else if ($(this).data("file_no_hat"))
        img = getImage2($(this).data("file_no_hat"), callback);
        if (img != null) {
          this.parentNode.insertBefore(prev, this);
          $(this).parent().addClass("hasPreview").parent().addClass("hasPreview");
        }
      }
    });
  };

  // Preview Animation
  var oversize = $(this).data("oversize");
  var anim = $("#previewAnimations").get(0);
  var animCtx = anim.getContext("2d");
  var $selectedAnim = $("#whichAnim>:selected");
  var animRowStart = parseInt($selectedAnim.data("row"));
  var animRowNum = parseInt($selectedAnim.data("num"));
  var animRowFrames = parseInt($selectedAnim.data("cycle"));
  var currentAnimationItemIndex = 0;
  var animationItems = [1, 2, 3, 4, 5, 6, 7, 8]; // default for walk

  $("#whichAnim").change(function() {
    animationItems = [];
    $selectedAnim = $("#whichAnim>:selected");
    animRowStart = parseInt($selectedAnim.data("row"));
    animRowNum = parseInt($selectedAnim.data("num"));
    animRowFrames = parseInt($selectedAnim.data("cycle"));
    currentAnimationItemIndex = 0;
    const customFrames = document.getElementById("customFrames").value || "";
    if (customFrames !== "") {
      animationItems = customFrames.split(',').map(Number);
      if (animationItems.length > 0) {
        return;
      }
    }
    if ($selectedAnim.val() == "smash")  {
      animationItems = [5, 4, 1, 0];
    } else {
      for (var i = 1; i < animRowFrames; ++i) {
        animationItems.push(i);
      }
    }
  });

  function nextFrame() {
    currentAnimationItemIndex = (currentAnimationItemIndex + 1) % animationItems.length;
    animCtx.clearRect(0, 0, anim.width, anim.height);
    const currentFrame = animationItems[currentAnimationItemIndex];
    for (var i = 0; i < animRowNum; ++i) {
      if (oversize && (animRowStart === 4 || animRowStart === 12)) {
        animCtx.drawImage(canvas, currentFrame * 192, 1344 + (i*192), 192, 192, i * 192, 0, 192, 192);
      } else {
        animCtx.drawImage(canvas, currentFrame * 64, (animRowStart + i) * 64, 64, 64, i * 64, 0, 64, 64);
      }

    }
    setTimeout(nextFrame, 1000 / 8);
  }
  nextFrame();
});
