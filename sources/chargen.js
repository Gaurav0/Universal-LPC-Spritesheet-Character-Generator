_.mixin(_.str.exports());

$(document).ready(function() {

  var params = jHash.val();
  var sheetCredits = [];
  const creditColumns = "filename,notes,authors,licenses,url1,url2,url3,url4,url5,status";
  const parsedCredits = loadFile("CREDITS.csv").split("\n");

  var canvas = $("#spritesheet").get(0);
  var ctx = canvas.getContext("2d");
  var images = {};

  // Preview Animation
  var oversize = false;
  var anim = $("#previewAnimations").get(0);
  var animCtx = anim.getContext("2d");
  var $selectedAnim = $("#whichAnim>:selected");
  var animRowStart = parseInt($selectedAnim.data("row"));
  var animRowNum = parseInt($selectedAnim.data("num"));
  var animRowFrames = parseInt($selectedAnim.data("cycle"));
  var currentAnimationItemIndex = 0;
  var animationItems = [1, 2, 3, 4, 5, 6, 7, 8]; // default for walk

  // on hash (url) change event, interpret and redraw
  jHash.change(function() {
    params = jHash.val();
    interpretParams();
    redraw();
    showOrHideElements();
  });

  replaceDivs();

  interpretParams();
  if (Object.keys(params).length == 0) {
    $("input[type=reset]").click();
    setParams();
  }

  redraw();
  showOrHideElements();
  nextFrame();

  $("input[type=radio], input[type=checkbox]").attr('title', function() {
    var name = "";
    if ($(this).data(`layer_1_${getBodyTypeName()}`)) {
      name = $(this).data(`layer_1_${getBodyTypeName()}`);
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

  // set params and redraw when any radio button or checkbox is clicked on
  $("input[type=radio], input[type=checkbox]").each(function() {
    $(this).click(function() {
      setParams();
      redraw();
      showOrHideElements();
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

  $("#collapse").click(function() {
    $("#chooser>ul ul").hide('slow');
    $("#chooser>ul span.expanded").removeClass("expanded").addClass("condensed");
  });

  $("#previewFile").change(function() {
    previewFile();
  });

  $("#ZPOS").change(function() {
    previewFile();
  });

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
      showOrHideElements();
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

  function getCreditFor(fileName) {
    if (fileName !== "") {
      for (let creditEntry of parsedCredits) {
        if (creditEntry.startsWith(fileName)) {
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

  function previewFile(){
    var preview = document.querySelector('img'); //selects the query named img
    var file    = document.querySelector('input[type=file]').files[0]; //sames as here

    var img = new Image;
    img.onload = function() {
      images["uploaded"] = img;
      redraw();
      showOrHideElements();
    }
    img.src = URL.createObjectURL(file);
  }

  function renameImageDownload(link, canvasItem, filename) {
    link.href = canvasItem.toDataURL();
    link.download = filename;
  };

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
    let itemsToDraw = [];
    const bodyTypeName = getBodyTypeName();

    sheetCredits = [creditColumns];
    zPosition = 0;
    $("input[type=radio]:checked, input[type=checkbox]:checked").each(function(index) {
      for (jdx =1; jdx < 10; jdx++) {
        if ($(this).data(`layer_${jdx}_${bodyTypeName}`)) {
          const zPos = $(this).data(`layer_${jdx}_zpos`);
          const oversize = $(this).data(`layer_${jdx}_oversize`);
          const fileName = $(this).data(`layer_${jdx}_${bodyTypeName}`);
          if (fileName !== "") {
            const itemToDraw = {};
            itemToDraw.fileName = fileName;
            itemToDraw.zPos = zPos;
            itemToDraw.oversize = oversize;
            addCreditFor(fileName);
            itemsToDraw.push(itemToDraw);
          }
        } else {
          break;
        }
      }
    });
    if (images["uploaded"] != null) {
      const itemToDraw = {};
      itemToDraw.fileName = "uploaded";
      itemToDraw.zPos = parseInt(document.getElementById("ZPOS").value) || 0;;
      itemsToDraw.push(itemToDraw);
    }
    drawItems(itemsToDraw);
  }

  function drawItems(itemsToDraw) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    oversize = false;
    var oversizeIdx = 0;
    for (item in itemsToDraw) {
      if (itemsToDraw[oversizeIdx].oversize !== undefined) {
        oversize = true;
        break;
      }
      oversizeIdx+=1;
    }

    if (oversize) {
      canvas.width = 1536;
      canvas.height = 1344 + 768;
    } else {
      canvas.width = 832;
      canvas.height = 1344;
    }
    $("#chooser>ul").css("height", canvas.height);

    var itemIdx = 0;
    itemsToDraw.sort(function(lhs, rhs) {
      return parseInt(lhs.zPos) - parseInt(rhs.zPos);
    });

    for (item in itemsToDraw) {
      const fileName = itemsToDraw[itemIdx].fileName;
      const img = getImage(fileName);
      const oversize = itemsToDraw[itemIdx].oversize;
      if (oversize !== undefined) {
        if (oversize == "thrust") {
          for (var i = 0; i < 8; ++i)
          for (var j = 0; j < 4; ++j) {
            var imgData = ctx.getImageData(64 * i, 256 + 64 * j, 64, 64);
            ctx.putImageData(imgData, 64 + 192 * i, 1408 + 192 * j);
          }
        } else if (oversize == "slash") {
          for (var i = 0; i < 6; ++i)
          for (var j = 0; j < 4; ++j) {
            var imgData = ctx.getImageData(64 * i, 768 + 64 * j, 64, 64);
            ctx.putImageData(imgData, 64 + 192 * i, 1408 + 192 * j);
          }
        }
        ctx.drawImage(img, 0, 1344);
      } else {
        drawImage(ctx, img);
      }
      itemIdx+=1;
    }
  }

  function showOrHideElements() {
    $("li").each(function(index) {
      if ($(this).data("required")) {
        var requiredTypes = $(this).data("required").split(",");
        if (!requiredTypes.includes(getBodyTypeName())) {
          $(this).prop("style", "display:none");
        } else {
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

      var img = new Image();
      img.src = "spritesheets/" + imgRef;
      img.onload = function() { callback(img) };
      images[imgRef] = img;
      return img;
    }
  }

  function drawImage(ctx, img) {
    try {
      ctx.drawImage(img, 0, 0);
      zPosition++;
    } catch(err) {
      console.error("Error: could not find " + img.src);
    }
  }

  function drawPreviews() {
    this.find("input[type=radio], input[type=checkbox]").filter(function() {
      return $(this).is(":visible");
    }).each(function() {
      if (!$(this).parent().hasClass("hasPreview")) {
        var prev = document.createElement("canvas");
        var oversize = $(this).data("layer_1_oversize");
        prev.setAttribute("width", 64);
        prev.setAttribute("height", 64);
        var prevctx = prev.getContext("2d");
        var img = null;
        const previewRow = parseInt($(this).data("preview_row"));
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
        img = getImage2($(this).data(`layer_1_${getBodyTypeName()}`), callback);
        if (img != null) {
          this.parentNode.insertBefore(prev, this);
          $(this).parent().addClass("hasPreview").parent().addClass("hasPreview");
        }
      }
    });
  };

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
});
