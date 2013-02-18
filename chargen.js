$(document).ready(function() {
    $("input[type=radio]").each(function(index) {
        $(this).click(redraw);
    });
    
    $("#saveAsPNG").click(function() {
        Canvas2Image.saveAsPNG(document.getElementsByTagName('canvas')[0]);
    });        
    
    var ctx = $("canvas").get(0).getContext("2d");

    function redraw() {
        ctx.clearRect(0, 0, 832, 1344);
        $("input[type=radio]:checked").each(function(index) {
            var isMale = $("#sex-male").prop("checked");
            var isFemale = $("#sex-female").prop("checked");
            if ($(this).data("file")) {
                var img = getImage($(this).data("file"));
                if ($(this).data("behind")) {
                    ctx.globalCompositeOperation = "destination-over";
                    ctx.drawImage(img, 0, 0);
                    ctx.globalCompositeOperation = "source-over";
                } else
                    ctx.drawImage(img, 0, 0);
            }
            if (isMale && $(this).data("file_male")) {
                var img = getImage($(this).data("file_male"));
                ctx.drawImage(img, 0, 0);
            }
            if (isFemale && $(this).data("file_female")) {
                var img = getImage($(this).data("file_female"));
                ctx.drawImage(img, 0, 0);
            }
            if ($(this).attr("id").substr(0, 5) == "body-")
                if (!$("#hair-none").prop("checked")) {
                    if (isMale && $(this).data("hs_male")) {
                        var img = getImage($(this).data("hs_male"))
                        ctx.drawImage(img, 0, 0);
                    }
                    if (isFemale && $(this).data("hs_female")) {
                        var img = getImage($(this).data("hs_female"))
                        ctx.drawImage(img, 0, 0);
                    }
                }
        });
        $("input[type=radio]").each(function(index) {
            if ($(this).data("required")) {
                var requirement = $(this).data("required").replace("=", "-");
                if ($("#" + requirement).prop("checked"))
                    $(this).prop("disabled", false);
                else {
                    $(this).prop("disabled", true);
                    if ($(this).prop("checked"))
                        ctx.clearRect(0, 0, 832, 1344);
                }
            }
        });
    }
    
    var images = {};
    
    function getImage(imgRef) {
        if (images[imgRef])
            return images[imgRef];
        else {
            var img = new Image();
            img.src = "Universal-LPC-spritesheet/" + imgRef;
            img.onload = redraw;
            images[imgRef] = img;
            return img;
        }
    }
    
    redraw();
});