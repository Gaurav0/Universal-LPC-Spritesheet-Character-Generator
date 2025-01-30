$.expr[":"].icontains = function (a, i, m) {
  return jQuery(a).text().toUpperCase().indexOf(m[3].toUpperCase()) >= 0;
};

// adapted from tiny-debounce
// https://github.com/vuejs-tips/tiny-debounce/blob/ac7eb88715b9fb81124d4d5fa714abde0853dce9/index.js
function debounce(fn, delay) {
  let timeoutID = null;
  return function () {
    clearTimeout(timeoutID);
    const args = arguments;
    timeoutID = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

// DEBUG mode will be turned on if on localhost and off in production
// but this can be overridden by adding debug=(true|false) to the querystring.
/*
debug isLocalhost result
true  true        true
true  false       true
false true        false
false false       false
unset true        true
unset false       false
*/
const boolMap = {
  true: true,
  false: false,
};
const bool = (s) => boolMap[s] ?? null;
const isLocalhost = window.location.hostname === "localhost";
const debugQueryString = () => bool(jHash.val("debug"));
const DEBUG = debugQueryString() ?? isLocalhost;

$(document).ready(function () {
  let matchBodyColor = true;
  let itemsToDraw = [];
  let itemsMeta = {};
  let params = jHash.val();
  let sheetCredits = [];

  let imagesToLoad = 0;
  let imagesLoaded = 0;
  let didStartRenderAfterLoad = false;

  const canvas = $("#spritesheet").get(0);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const images = {};
  const universalFrameSize = 64;
  const universalSheetWidth = 832;
  const universalSheetHeight = 3456;

  const base_animations = {
    spellcast: 0,
    thrust: 4 * universalFrameSize,
    walk: 8 * universalFrameSize,
    slash: 12 * universalFrameSize,
    shoot: 16 * universalFrameSize,
    hurt: 20 * universalFrameSize,
    climb: 21 * universalFrameSize,
    idle: 22 * universalFrameSize,
    jump: 26 * universalFrameSize,
    sit: 30 * universalFrameSize,
    emote: 34 * universalFrameSize,
    run: 38 * universalFrameSize,
    combat_idle: 42 * universalFrameSize,
    backslash: 46 * universalFrameSize,
    halfslash: 50 * universalFrameSize,
  };

  const sexes = ["male", "female", "teen", "child", "muscular", "pregnant"];

  const allElements = document.querySelectorAll("#chooser [id][type=radio]");
  const ids = Array.prototype.map.call(allElements, (el) => el.id);

  const getBodyTypeName = () => {
    return whichPropCheckedExact("sex", sexes);
  };

  // Preview Animation
  let past = Date.now();
  const anim = $("#previewAnimations").get(0);
  const animCtx = anim.getContext("2d");
  let animationItems = [1, 2, 3, 4, 5, 6, 7, 8]; // default for walk
  let animRowStart = 8; // default for walk
  let animRowNum = 4; // default for walk
  let currentAnimationItemIndex = 0;
  let activeCustomAnimation = "";
  let addedCustomAnimations = [];

  // on hash (url) change event, interpret and redraw
  jHash.change(function () {
    params = jHash.val();
    interpretParams();
    redraw();
  });

  interpretParams();
  if (Object.keys(params).length == 0) {
    $("input[type=reset]").click();
    setParams();
    selectDefaults();
  }
  redraw();
  showOrHideElements();
  nextFrame();

  // set params and redraw when any radio button is clicked on
  $("input[type=radio]").each(function () {
    $(this).click(function () {
      if (matchBodyColor) {
        matchBodyColorForThisAsset = $(this).attr("matchBodyColor");
        if (
          matchBodyColorForThisAsset &&
          matchBodyColorForThisAsset != "false"
        ) {
          selectColorsToMatch($(this).attr("variant"));
        }
      }
      setParams();
      redraw();
      showOrHideElements();
    });
  });

  $("#controls>details").on("toggle", function (event) {
    $("#preview-animations").toggleClass(
      "controls-open",
      $(event.target).attr("open")
    );
  });

  // Toggle display of a list elements children when clicked
  // Again, do not multiple toggle when clicking on children
  $("#chooser ul>li").click(function (event) {
    $(this).children("span").toggleClass("condensed").toggleClass("expanded");
    const $ul = $(this).children("ul");
    $ul.toggle("slow").promise().done(drawPreviews);
    event.stopPropagation();
  });

  $("#collapse").click(function () {
    $("#chooser>details>ul ul").hide("slow");
    $("#chooser>details>ul span.expanded")
      .removeClass("expanded")
      .addClass("condensed");
  });
  $("#expand").click(function () {
    let parents = $('input[type="radio"]:checked').parents("ul");
    parents.prev("span").addClass("expanded").removeClass("condensed");
    parents.show().promise().done(drawPreviews);
  });

  function search() {
    $(".search-result").removeClass("search-result");
    let query = $("#searchbox").val();
    if (query != "" && query.length > 1) {
      let results = $("#chooser li>span:icontains(" + query + ")").addClass(
        "search-result"
      );
      const matches = results.length;
      $("#matches").text(`${matches} matches.`);
      let parents = results.parents("ul");
      parents.prev("span").addClass("expanded").removeClass("condensed");
      for (const parent of parents.toArray().reverse()) {
        $(parent)
          .delay(50)
          .show()
          .map((i, el) => {
            setTimeout(() => drawPreviews.call(el), 50 * i);
          });
      }
    }
  }
  $("#searchbox").on("search", search);
  $("#search").click(search);
  $("#searchbox").on("input", function () {
    if ($("#searchbox").val().length >= 3) {
      debounce(search, 500)();
    } else {
      $("#matches").val("");
    }
  });
  $("#customizeChar").on("submit", function (e) {
    search();
    e.preventDefault();
  });

  $("#displayMode-compact").click(function () {
    $("#chooser").toggleClass("compact");
  });

  $("#match_body-color").click(function () {
    matchBodyColor = $(this).is(":checked");
  });

  $("#scroll-to-credits").click(function (e) {
    $("#credits")[0].scrollIntoView();
    e.preventDefault();
  });

  $("#previewFile").change(function () {
    previewFile();
  });

  $("#ZPOS").change(function () {
    previewFile();
  });

  $("#saveAsPNG").click(function () {
    renameImageDownload(
      this,
      canvas,
      "Download" + Math.floor(Math.random() * 100000) + ".png"
    );
    return true;
  });

  $("#resetAll").click(function () {
    window.setTimeout(
      function () {
        document.getElementById("previewFile").value = "";
        images["uploaded"] = null;
        document.getElementById("ZPOS").value = 0;
        params = {};
        jHash.val(params);
        interpretParams();
        selectDefaults();
        redraw();
        showOrHideElements();
      },
      0,
      false
    );
  });

  $(".removeIncompatibleWithLicenses").click(function () {
    const allowedLicenses = getAllowedLicenses();
    $("input[type=radio]").each(function () {
      // Toggle allowed licenses
      const licenses = $(this).data(`layer_1_${getBodyTypeName()}_licenses`);
      if (licenses !== undefined) {
        const licensesForAsset = licenses.split(",");
        if (
          !allowedLicenses.some((allowedLicense) =>
            licensesForAsset.includes(allowedLicense)
          )
        ) {
          if ($(this).prop("checked")) {
            $(this).attr("checked", false).prop("checked", false);
            $(this).closest("ul").find("input[type=radio][id*=none]").click();
          }
        }
      }
    });
    setParams();
    redraw();
    showOrHideElements();
  });

  $(".removeUnsupported").click(function () {
    const selectedAnims = getSelectedAnimations();
    $("input[type=radio]").each(function () {
      const $li = $(this).closest("li[data-animations]");
      if ($li.data("animations") && selectedAnims.length > 0) {
        const requiredAnimations = $li.data("animations").split(",");
        for (const selectedAnim of selectedAnims) {
          if (!requiredAnimations.includes(selectedAnim)) {
            if ($(this).prop("checked")) {
              $(this).attr("checked", false).prop("checked", false);
              $(this)
                .closest("ul")
                .find("input[type=radio][id*=none]:not(:checked)")
                .click();
            }
          }
        }
      }
    });
    setParams();
    redraw();
    showOrHideElements();
    return false;
  });

  $(".replacePinkMask").click(function () {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height),
      pix = imgData.data,
      n = pix.length;

    for (let i = 0; i < n; i += 4) {
      const a = pix[i + 3];
      if (a > 0) {
        const r = pix[i];
        const g = pix[i + 1];
        const b = pix[i + 2];
        if (r === 255 && g === 44 && b === 230) {
          pix[i + 3] = 0;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  });

  $(".generateSheetCreditsCsv").click(function () {
    let bl = new Blob([sheetCreditsToCSV()], {
      type: "text/html",
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

  $(".importFromClipboard").click(async function () {
    const clipboardText = await navigator.clipboard.readText();
    const spritesheet = JSON.parse(clipboardText)["layers"];
    window.setTimeout(
      function () {
        $("#resetAll").click(); //Reset first so defaults are set properly
      },
      1,
      false
    );
    window.setTimeout(
      function () {
        setParamsFromImport(spritesheet); //wait for reset function(s) to complete then apply spritesheet
      },
      2,
      false
    );
  });

  $(".exportToClipboard").click(function () {
    const spritesheet = Object.assign({}, itemsMeta);
    spritesheet["layers"] = itemsToDraw;
    navigator.clipboard.writeText(JSON.stringify(spritesheet, null, "  "));
  });

  $(".generateSheetCreditsTxt").click(function () {
    let bl = new Blob([sheetCreditsToTxt()], {
      type: "text/html",
    });
    let a = document.createElement("a");
    a.href = URL.createObjectURL(bl);
    a.download = "sheet-credits.txt";
    a.hidden = true;
    document.body.appendChild(a);
    a.innerHTML = "dummyhtml";
    a.click();
    document.removeChild(a);
  });

  $("#frame-cycle").text(animationItems.join("-")); // for default animation, walk

  $("#whichAnim").change(function () {
    animationItems = [];
    const selectedAnim = $("#whichAnim>:selected");
    const selectedAnimationValue = $("#whichAnim>:selected").text();
    const animRowFrames = parseInt(selectedAnim.data("cycle"));
    animRowStart = parseInt(selectedAnim.data("row"));
    animRowNum = parseInt(selectedAnim.data("num"));

    function clearClasses() {
      let classes = document.getElementById("preview").classList.values();
      classes = classes.filter((className) =>
        className.startsWith("anim-canvas-")
      );
      for (const className of classes) {
        $("#preview").removeClass(className);
      }
    }

    currentAnimationItemIndex = 0;
    activeCustomAnimation = "";
    if (addedCustomAnimations.includes(selectedAnimationValue)) {
      activeCustomAnimation = selectedAnimationValue;
    }
    if (activeCustomAnimation !== "") {
      const selectedCustomAnimation = customAnimations[activeCustomAnimation];
      const frameSize = selectedCustomAnimation.frameSize;
      anim.setAttribute("width", 4 * frameSize);
      anim.setAttribute("height", frameSize);
      animRowNum = selectedCustomAnimation.frames.length;
      animRowStart = 0;
      for (let i = 0; i < selectedCustomAnimation.frames[0].length; ++i) {
        if (selectedCustomAnimation.skipFirstFrameInPreview && i === 0) {
          continue;
        }
        animationItems.push(i);
      }
      $("#frame-cycle").text(animationItems.join("-"));
      clearClasses();
      $("#preview").addClass(`anim-canvas-${frameSize}`);
      return;
    } else {
      anim.setAttribute("width", 4 * universalFrameSize);
      anim.setAttribute("height", universalFrameSize);
      clearClasses();
      $("#preview").addClass(`anim-canvas-${universalFrameSize}`);
    }
    const animRowFramesCustom = selectedAnim.data("cycle-custom");
    if (animRowFramesCustom !== undefined) {
      animationItems = animRowFramesCustom.split("-").map(Number);
      if (animationItems.length > 0) {
        $("#frame-cycle").text(animRowFramesCustom);
        return;
      }
    }
    for (let i = 1; i < animRowFrames; ++i) {
      animationItems.push(i);
    }
    $("#frame-cycle").text(animationItems.join("-"));
  });

  function clearCustomAnimationPreviews() {
    for (let i = 0; i < addedCustomAnimations.length; ++i) {
      $("#whichAnim")
        .children(`option[value=${addedCustomAnimations[i]}]`)
        .remove();
    }
  }

  function addCustomAnimationPreviews() {
    clearCustomAnimationPreviews();
    for (let i = 0; i < addedCustomAnimations.length; ++i) {
      $("#whichAnim").append(
        new Option(`${addedCustomAnimations[i]}`, `${addedCustomAnimations[i]}`)
      );
    }
  }

  $("#spritesheet,#previewAnimations").on("click", function (e) {
    $(this).toggleClass("zoomed-in");
  });
  $("#spritesheet,#previewAnimations").on("dblclick", function (e) {
    $(this).toggleClass("zoomed-out");
  });

  const spritesheetGesture = new TinyGesture(
    document.getElementById("spritesheet"),
    { mouseSupport: false }
  );
  const previewAnimationsGesture = new TinyGesture(
    document.getElementById("previewAnimations"),
    { mouseSupport: false }
  );

  spritesheetGesture.on("pinch", pinch.bind(spritesheetGesture));
  previewAnimationsGesture.on("pinch", pinch.bind(previewAnimationsGesture));
  spritesheetGesture.on("pinchend", pinchEnd);
  previewAnimationsGesture.on("pinchend", pinchEnd);

  let initialZoom = null;
  function pinch(event) {
    const scale = this.scale;
    const $target = $(event.target);
    if (initialZoom === null) {
      initialZoom = $target.css("zoom") ?? 1;
    }
    $target.css("zoom", initialZoom * scale);
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function pinchEnd() {
    initialZoom = null;
  }

  function selectDefaults() {
    $(`#${"body-Body_color_light"}`).prop("checked", true);
    $(`#${"head-Human_male_light"}`).prop("checked", true);
    setParams();
  }

  function selectColorsToMatch(variant) {
    const colorToMatch = variant;
    $("input[matchBodyColor^=true]:checked").each(function () {
      // 1. Determine the type of asset that is selected (eg. human male)
      const assetType = $(this).attr("parentName").replaceAll(" ", "_");
      // 2. Determine the color of asset that needs to selected (eg. head-human_male_light)
      const assetToSelect =
        $(this).attr("name") + "-" + assetType + "_" + colorToMatch;
      $(`#${assetToSelect}`).prop("checked", true);
    });
    setParams();
  }

  function addCreditFor(fileName, licenses, authors, urls, notes) {
    if (fileName !== "") {
      let credit = {};
      credit.fileName = fileName;
      credit.licenses = licenses;
      credit.authors = authors;
      credit.urls = urls;
      credit.notes = notes;
      sheetCredits.push(credit);
    }
  }

  function sheetCreditsToCSV() {
    const header = "filename,notes,authors,licenses,urls";
    let csvBody = header + "\n";
    sheetCredits.map(function (credit) {
      if (credit.licenses !== undefined) {
        csvBody += `${credit.fileName},\"${credit.notes}\",\"${credit.authors}\",\"${credit.licenses}\",\"${credit.urls}\"`;
        csvBody += "\n";
      }
    });
    return csvBody;
  }

  function sheetCreditsToTxt() {
    let creditString = "";
    sheetCredits.map(function (credit) {
      if (credit.licenses !== undefined) {
        const licensesForDisplay = `- Licenses:\n\t\t- ${credit.licenses.replaceAll(
          ",",
          "\n\t\t- "
        )}`;
        const authorsForDisplay = `- Authors:\n\t\t- ${credit.authors.replaceAll(
          ",",
          "\n\t\t- "
        )}`;
        const linksForDisplay = `- Links:\n\t\t- ${credit.urls.replaceAll(
          ",",
          "\n\t\t- "
        )}`;
        const notesForDisplay = `- Note: ${credit.notes}`;
        let creditEntry = `${credit.fileName}\n\t${notesForDisplay}\n\t${licensesForDisplay}\n\t${authorsForDisplay}\n\t${linksForDisplay}\n\n`;
        creditString += creditEntry;
      }
    });
    return creditString;
  }

  function previewFile() {
    const file = document.querySelector("input[type=file]").files[0];
    const img = new Image();
    img.onload = function () {
      images["uploaded"] = img;
      redraw();
      showOrHideElements();
    };
    img.src = URL.createObjectURL(file);
  }

  function renameImageDownload(link, canvasItem, filename) {
    link.href = canvasItem.toDataURL();
    link.download = filename;
  }

  function findIdsByRegExp(ids, regExps) {
    const reLen = regExps.length;
    const els = new Array(reLen);
    for (let i = 0; i < reLen; ++i) {
      els[i] = false;
      const re = regExps[i];
      for (const id of ids) {
        if (re.test(id)) {
          const el = document.getElementById(id);
          if (el.checked) {
            els[i] = true;
            return els;
          }
        }
      }
    }
    return els;
  }

  function whichPropChecked(ids, key, vals) {
    const regExps = vals.map(val => new RegExp(String.raw`^${key}-${val}`, "i"));
    const els = findIdsByRegExp(ids, regExps);
    for (const i = 0; i < vals.length; ++i) {
      if (els[i] === true) {
        return vals[i];
      }
    }
    return "ERROR";
  }

  function whichPropCheckedExact(key, vals) {
    for (const val of vals) {
      const el = document.getElementById(`${key}-${val}`);
      if (el.checked) {
        return val;
      }
    }
    return "ERROR";
  }

  $("[name=animation]").click(function () {
    showOrHideElements();
  });

  function getSelectedAnimations() {
    const $anims = $("[name=animation]:checked");
    if ($anims.length > 0) {
      return $anims.map(function () {
        return this.id.replace("animation-", "");
      });
    }
    return [];
  }

  $(".licenseCheckBox").click(function () {
    showOrHideElements();
  });

  function getAllowedLicenses() {
    return $(".licenseCheckBox:checkbox:checked")
      .map(function () {
        return $(this).val().split(",");
      })
      .get()
      .map((license) => license.trim());
  }

  function redraw() {
    itemsToDraw = [];
    const bodyTypeName = getBodyTypeName();

    sheetCredits = [];
    const baseUrl = window.location.href.split("/").slice(0, -1).join("/"); // get url until last '/'

    itemsMeta = {
      bodyTypeName: bodyTypeName,
      url: window.location.href,
      spritesheets: baseUrl + "/spritesheets/", // <- holds base URL to spritesheets (used to download them)
      version: 1, // <- to track future compatibilty breaking changes
      datetime: new Date().toLocaleString(),
      credits: "",
    };

    zPosition = 0;
    $("input[type=radio]:checked").each(function (index) {
      const $this = $(this);
      for (jdx = 1; jdx < 10; jdx++) {
        const bodyTypeKey = `layer_${jdx}_${bodyTypeName}`;
        if ($this.data(bodyTypeKey)) {
          const zPos = $this.data(`layer_${jdx}_zpos`);
          const custom_animation = $this.data(`layer_${jdx}_custom_animation`);
          const fileName = $this.data(bodyTypeKey);
          const parentName = $this.attr(`name`);
          const name = $this.attr(`parentName`);
          const variant = $this.attr(`variant`);
          const licenses = $this.data(`${bodyTypeKey}_licenses`);
          const authors = $this.data(`${bodyTypeKey}_authors`);
          const urls = $this.data(`${bodyTypeKey}_urls`);
          const notes = $this.data(`${bodyTypeKey}_notes`);

          if (fileName !== "") {
            const supportedAnimations = $this
              .closest("[data-animations]")
              .data("animations");
            const itemToDraw = {
              fileName,
              zPos,
              custom_animation,
              parentName,
              name,
              variant,
              supportedAnimations,
            };
            addCreditFor(fileName, licenses, authors, urls, notes);
            itemsToDraw.push(itemToDraw);
          }
        } else {
          break;
        }
      }
    });
    loadItemsToDraw();
    const creditsTxt = sheetCreditsToTxt();
    $("textarea#creditsText").val(creditsTxt);
    itemsMeta["credits"] = sheetCredits;

    if (images["uploaded"] != null) {
      const itemToDraw = {};
      itemToDraw.fileName = "uploaded";
      itemToDraw.zPos = parseInt(document.getElementById("ZPOS").value) || 0;
      itemsToDraw.push(itemToDraw);
    }
  }

  function resetLoading() {
    imagesLoaded = 0;
    imagesToLoad = 0;
    didStartRenderAfterLoad = false;
  }

  function loadItemsToDraw() {
    if (!canRender()) {
      return setTimeout(loadItemsToDraw, 100);
    }
    resetLoading();
    let itemIdx = 0;
    for (const item of itemsToDraw) {
      const supportedAnimations = item.supportedAnimations;
      const filePath = item.fileName;
      const custom_animation = item.custom_animation;
      if (custom_animation !== undefined) {
        loadImage(filePath, true);
      } else {
        const { directory, file } = splitFilePath(filePath);

        for (const [key, value] of Object.entries(base_animations)) {
          let animationToCheck = key;
          if (key === "combat_idle") {
            animationToCheck = "combat";
          } else if (key === "backslash") {
            animationToCheck = "1h_slash";
          } else if (key === "halfslash") {
            animationToCheck = "1h_halfslash";
          }
          if (supportedAnimations.includes(animationToCheck)) {
            const newFile = `${directory}/${key}/${file}`;
            loadImage(newFile, true);
          } else {
            // Enable this to see missing animations in the console
            if (DEBUG)
              console.warn(
                `supportedAnimations does not contain ${key} for asset ${file}. skipping render`
              );
          }
        }
      }
      itemIdx += 1;
    }
  }

  function drawItemsToDraw() {
    if (!canRender()) {
      return;
    }
    if (DEBUG) console.log(`Start drawItemsToDraw`);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let requiredCanvasHeight = universalSheetHeight;
    let requiredCanvasWidth = universalSheetWidth;
    clearCustomAnimationPreviews();
    addedCustomAnimations = [];
    for (let i = 0; i < itemsToDraw.length; ++i) {
      const customAnimationString = itemsToDraw[i].custom_animation;
      if (customAnimationString !== undefined) {
        if (addedCustomAnimations.includes(customAnimationString)) {
          continue;
        }
        addedCustomAnimations.push(customAnimationString);
        const customAnimation = customAnimations[customAnimationString];
        const customAnimationWidth =
          customAnimation.frameSize * customAnimation.frames[0].length;
        const customAnimationHeight =
          customAnimation.frameSize * customAnimation.frames.length;
        requiredCanvasWidth = Math.max(
          requiredCanvasWidth,
          customAnimationWidth
        );
        requiredCanvasHeight = requiredCanvasHeight + customAnimationHeight;
      }
    }
    canvas.width = requiredCanvasWidth;
    canvas.height = requiredCanvasHeight;

    let itemIdx = 0;
    let didPutUniversalForCustomAnimation = "";
    itemsToDraw.sort(function (lhs, rhs) {
      return parseInt(lhs.zPos) - parseInt(rhs.zPos);
    });
    for (item in itemsToDraw) {
      const supportedAnimations = itemsToDraw[itemIdx].supportedAnimations;
      const filePath = itemsToDraw[itemIdx].fileName;
      const custom_animation = itemsToDraw[itemIdx].custom_animation;

      if (custom_animation !== undefined) {
        const img = loadImage(filePath, false);
        const customAnimationDefinition = customAnimations[custom_animation];
        const frameSize = customAnimationDefinition.frameSize;

        const customAnimationCanvas = document.createElement("canvas");
        customAnimationCanvas.width = requiredCanvasWidth;
        customAnimationCanvas.height =
          requiredCanvasHeight - universalSheetHeight;
        const customAnimationContext = customAnimationCanvas.getContext("2d");

        const indexInArray = addedCustomAnimations.indexOf(custom_animation);
        let offSetInAdditionToOtherCustomActions = 0;
        for (let i = 0; i < indexInArray; ++i) {
          const otherCustomAction = customAnimations[addedCustomAnimations[i]];
          offSetInAdditionToOtherCustomActions +=
            otherCustomAction.frameSize * otherCustomAction.frames.length;
        }

        if (didPutUniversalForCustomAnimation !== custom_animation) {
          for (let i = 0; i < customAnimationDefinition.frames.length; ++i) {
            const frames = customAnimationDefinition.frames[i];
            for (let j = 0; j < frames.length; ++j) {
              const frameCoordinateX = parseInt(frames[j].split(",")[1]);
              const frameCoordinateRowName = frames[j].split(",")[0];
              const frameCoordinateY =
                animationRowsLayout[frameCoordinateRowName] + 1;
              const offSet = (frameSize - universalFrameSize) / 2;

              const imgDataSingleFrame = ctx.getImageData(
                universalFrameSize * frameCoordinateX,
                universalFrameSize * frameCoordinateY,
                universalFrameSize,
                universalFrameSize
              );
              customAnimationContext.putImageData(
                imgDataSingleFrame,
                frameSize * j + offSet,
                frameSize * i + offSet + offSetInAdditionToOtherCustomActions
              );
            }
          }
          ctx.drawImage(customAnimationCanvas, 0, universalSheetHeight);
          if (itemsToDraw[itemIdx].zPos >= 140) {
            didPutUniversalForCustomAnimation = custom_animation;
          }
        }
        ctx.drawImage(
          img,
          0,
          universalSheetHeight + offSetInAdditionToOtherCustomActions
        );
      } else {
        const splitPath = splitFilePath(filePath);

        for (const [key, value] of Object.entries(base_animations)) {
          let animationToCheck = key;
          if (key === "combat_idle") {
            animationToCheck = "combat";
          } else if (key === "backslash") {
            animationToCheck = "1h_slash";
          } else if (key === "halfslash") {
            animationToCheck = "1h_halfslash";
          }
          if (supportedAnimations.includes(animationToCheck)) {
            const newFile = `${splitPath.directory}/${key}/${splitPath.file}`;
            const img = loadImage(newFile, false);
            drawImage(ctx, img, value);
          } else {
            // Enable this to see missing animations in the console
            // console.warn(`supportedAnimations does not contain ${key} for asset ${file}. skipping render`)
          }
        }
      }
      itemIdx += 1;
    }
    addCustomAnimationPreviews();
  }

  function canRender() {
    if (imagesLoaded >= imagesToLoad) {
      if (DEBUG)
        console.log(`Loaded all ${imagesToLoad} of ${imagesToLoad} assets`);
      return true;
    } else {
      if (DEBUG)
        console.log(
          `Loading... Loaded ${imagesLoaded} of ${imagesToLoad} assets`
        );
      return false;
    }
  }

  function showOrHideElements() {
    const bodyType = getBodyTypeName();
    const selectedAnims = getSelectedAnimations();
    const allowedLicenses = getAllowedLicenses();
    let hasUnsupported = false;
    let hasProhibited = false;

    $("#chooser li").each(function (index) {
      // Toggle Required Body Type
      const $this = $(this);
      const dataRequired = $this.data("required");
      let display = true;
      if (dataRequired) {
        const requiredTypes = dataRequired.split(",");
        if (!requiredTypes.includes(bodyType)) {
          display = false;
        }
      }

      if (display) {
        // Filter by template
        const mungedTemplate = $this
          .find("input[type=radio]")
          .data("layer_1_template");
        if (mungedTemplate) {
          const template = mungedTemplate.replace(/'/g, '"');
          let parsedTemplate = null;
          try {
            parsedTemplate = JSON.parse(template);
          } catch {
            console.error("Error parsing template", template);
          }
          if (parsedTemplate) {
            const keys = Object.keys(parsedTemplate);
            for (const key of keys) {
              const requiredVals = Object.keys(parsedTemplate[key]);
              const prop = whichPropChecked(ids, key, requiredVals);
              if (prop === "ERROR") {
                display = false;
                break;
              }
            }
          }
        }
      }

      if (display) {
        // Toggle Required Animations
        const anims = $this.data("animations");
        if (anims && selectedAnims.length > 0) {
          const requiredAnimations = anims.split(",");
          for (const selectedAnim of selectedAnims) {
            if (!requiredAnimations.includes(selectedAnim)) {
              display = false;
              if (
                $this.find("input[type=radio]:checked:not([id*=none])")
                  .length > 0
              ) {
                hasUnsupported = true;
              }
              break;
            }
          }
        }
      }

      // Display Result
      if (display) {
        $this.show();
      } else {
        $this.hide();
      }
    });

    $("input[type=radio]").each(function () {
      const $this = $(this);
      let display = true;

      // Toggle allowed licenses
      const licenses = $this.data(`layer_1_${getBodyTypeName()}_licenses`);
      if (licenses !== undefined) {
        const licensesForAsset = licenses.split(",");
        if (
          !allowedLicenses.some((allowedLicense) =>
            licensesForAsset.includes(allowedLicense)
          )
        ) {
          display = false;
          if (this.checked) {
            hasProhibited = true;
          }
        }
      }

      // Display Result
      if (display) {
        $this.parent().show();
      } else {
        $this.parent().hide();
      }
    });

    if (hasUnsupported) {
      $(".removeUnsupported").show();
    } else {
      $(".removeUnsupported").hide();
    }

    if (hasProhibited) {
      $(".removeIncompatibleWithLicenses").show();
    } else {
      $(".removeIncompatibleWithLicenses").hide();
    }
  }

  function interpretParams() {
    $("input[type=radio]").each(function () {
      const words = $(this).attr("id").split("-");
      const initial = words[0];
      $(this).prop(
        "checked",
        $(this).attr("checked") || params[initial] == words[1]
      );
    });
  }

  function setParams() {
    $("input[type=radio]:checked").each(function () {
      const words = $(this).attr("id").split("-");
      const initial = words[0];
      if (!$(this).attr("checked") || params[initial]) {
        params[initial] = words[1];
      }
    });
    jHash.val(params);
  }

  function setParamsFromImport(spritesheet) {
    spritesheet.forEach((sprite) => {
      const { name, parentName, variant } = sprite;
      const assetType = name.replaceAll(" ", "_");
      const assetVariant = variant.replaceAll(" ", "_");
      const assetToSelect = parentName + "-" + assetType + "_" + assetVariant;
      $(`#${assetToSelect}`).prop("checked", true);
    });
    setParams();
  }

  function loadImage(imgRef, allowLoading) {
    if (!allowLoading) {
      return images[imgRef];
    }
    imagesToLoad += 1;
    if (images[imgRef]) {
      setTimeout(function () {
        imageLoadDone();
      }, 10);
      return images[imgRef];
    } else {
      if (DEBUG) console.log(`loading new image ${imgRef}`);
      const img = new Image();
      img.src = "spritesheets/" + imgRef;
      img.onload = imageLoadDone;
      img.onerror = imageLoadError;
      images[imgRef] = img;
      return img;
    }
  }

  function imageLoadDone() {
    imagesLoaded += 1;
    if (!didStartRenderAfterLoad && canRender()) {
      didStartRenderAfterLoad = true;
      drawItemsToDraw();
    }
  }

  function imageLoadError(event) {
    if (DEBUG)
      console.error("There was an error loading image:", event.target.src);
    imageLoadDone();
  }

  function getImage2(imgRef, callback, layers, prevctx) {
    if (imgRef && images[imgRef] && images[imgRef].complete) {
      callback(layers, prevctx);
      return images[imgRef];
    } else if (imgRef && images[imgRef]) {
      images[imgRef].addEventListener("load", function () {
        callback(layers, prevctx);
      });
      return images[imgRef];
    } else {
      let img = new Image();
      img.src = "spritesheets/" + imgRef;
      images[imgRef] = img;
      img.addEventListener("load", function () {
        callback(layers, prevctx);
      });
      return img;
    }
  }

  function drawImage(ctx, img, dy) {
    try {
      ctx.drawImage(img, 0, dy);
      zPosition++;
    } catch (err) {
      if (DEBUG) console.error("Error: could not find " + img.src);
    }
  }

  function drawPreviews() {
    const buttons = $(this)
      .find("input[type=radio]")
      .filter(function () {
        return $(this).is(":visible");
      })
      .toArray();
    for (const button of buttons) {
      const $this = $(button);
      if (
        !$this.parent().hasClass("hasPreview") &&
        !$this.parent().hasClass("noPreview")
      ) {
        const prev = document.createElement("canvas");
        prev.setAttribute("width", universalFrameSize);
        prev.setAttribute("height", universalFrameSize);
        const prevctx = prev.getContext("2d");
        let img = null;
        const previewRow = parseInt($this.data("preview_row"));
        const previewColumn = parseInt($this.data("preview_column"));
        const previewXOffset = parseInt($this.data("preview_x_offset"));
        const previewYOffset = parseInt($this.data("preview_y_offset"));
        const callback = function (layers, prevctx) {
          for (index = 0; index < layers.length; index++) {
            if (!images[layers[index].link]) {
              return;
            }
          }
          try {
            const drawLayer = (layer) => {
              if (layer && layer.link) {
                try {
                  const drawThisPreview = () => {
                    prevctx.drawImage(
                      images[layer.link],
                      previewColumn * universalFrameSize + previewXOffset,
                      previewRow * universalFrameSize + previewYOffset,
                      universalFrameSize,
                      universalFrameSize,
                      0,
                      0,
                      universalFrameSize,
                      universalFrameSize
                    );
                  };
                  if (images[layer.link].complete) {
                    drawThisPreview();
                  } else {
                    images[layer.link].addEventListener(
                      "load",
                      drawThisPreview
                    );
                  }
                } catch (e) {
                  if (DEBUG) console.error(e);
                }
              } else if (DEBUG) {
                console.error(`Preview link missing for ${$this.id}`);
              }
            };
            for (const layer of layers) {
              drawLayer(layer);
            }
          } catch (err) {
            if (DEBUG) console.error(err);
          }
        };

        const layers = [];
        const animation = $this.data(`layer_1_custom_animation`);
        const supportedAnimations = $this
          .closest("[data-animations]")
          .data("animations")
          .split(",");
        let defaultAnimation = "walk";
        if (
          supportedAnimations &&
          supportedAnimations.length &&
          !supportedAnimations.includes("walk")
        ) {
          defaultAnimation = supportedAnimations[0];
        }
        const bodyTypeName = getBodyTypeName();
        let imageLink = $this.data(`layer_1_${bodyTypeName}`);

        for (jdx = 1; jdx < 10; jdx++) {
          imageLink = $this.data(`layer_${jdx}_${bodyTypeName}`);
          if (imageLink) {
            if (animation === $this.data(`layer_${jdx}_custom_animation`)) {
              const previewToDraw = {};
              previewToDraw.link = updatePreviewLink(
                imageLink,
                animation,
                defaultAnimation
              );
              previewToDraw.zPos = $this.data(`layer_${jdx}_zpos`);
              layers.push(previewToDraw);
            }
          } else {
            break;
          }
        }

        layers.sort(function (lhs, rhs) {
          return parseInt(lhs.zPos) - parseInt(rhs.zPos);
        });

        for (const layer of layers) {
          img = getImage2(layer.link, callback, layers, prevctx);
        }

        if (img && !$(button).parent().hasClass("hasPreview")) {
          button.parentNode.insertBefore(prev, button);
          $(button)
            .parent()
            .addClass("hasPreview")
            .parent()
            .addClass("hasPreview");
        }
      }
    }
  }

  function nextFrame() {
    const fpsInterval = 1000 / 8;
    let now = Date.now();
    let elapsed = now - past;
    if (elapsed > fpsInterval) {
      past = now - (elapsed % fpsInterval);

      animCtx.clearRect(0, 0, anim.width, anim.height);
      currentAnimationItemIndex =
        (currentAnimationItemIndex + 1) % animationItems.length;
      const currentFrame = animationItems[currentAnimationItemIndex];
      let frameSize = universalFrameSize;
      let offSet = 0;
      if (activeCustomAnimation !== "") {
        const customAnimation = customAnimations[activeCustomAnimation];
        frameSize = customAnimation.frameSize;
        const indexInArray = addedCustomAnimations.indexOf(
          activeCustomAnimation
        );
        offSet = universalSheetHeight;
        for (let i = 0; i < indexInArray; ++i) {
          const otherCustomAction = customAnimations[addedCustomAnimations[i]];
          offSet +=
            otherCustomAction.frameSize * otherCustomAction.frames.length;
        }
      }
      for (let i = 0; i < animRowNum; ++i) {
        animCtx.drawImage(
          canvas,
          currentFrame * frameSize,
          offSet + (animRowStart + i) * frameSize,
          frameSize,
          frameSize,
          i * frameSize,
          0,
          frameSize,
          frameSize
        );
      }
    }
    requestAnimationFrame(nextFrame);
  }

  function updatePreviewLink(imageLink, customWalkAnimation, defaultAnimation) {
    const { directory, file } = splitFilePath(imageLink);
    if (customWalkAnimation) {
      imageLink = `${directory}/${file}`;
    } else if (defaultAnimation) {
      imageLink = `${directory}/${defaultAnimation}/${file}`;
    } else {
      imageLink = `${directory}/walk/${file}`;
    }
    if (DEBUG)
      console.log(
        "preview image:",
        `${window.location.protocol}//${window.location.host}/spritesheets/${imageLink}`
      );
    return imageLink;
  }

  function splitFilePath(filePath) {
    const index = filePath.lastIndexOf("/");
    if (index > -1) {
      return {
        directory: filePath.substring(0, index),
        file: filePath.substring(index + 1),
      };
    } else {
      throw new Error(
        `Could not split to directory and file using path ${filePath}`
      );
    }
  }
});
