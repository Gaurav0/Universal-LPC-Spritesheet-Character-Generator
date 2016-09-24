var Animations2JSON = function () {
    this.animations = [];
    this.jsonName = "lpc.json";
    this.imageName = "lpc.png";
    this.tileWidth = 64;
    this.tileHeight = 64;
    this.imageWidth = 832;
    this.imageHeight = 1344;
    this.animationNamePrefix = "lpc.";
    this.waysNameSuffix = [".back", ".left", ".front", ".right"]; 
};

Animations2JSON.prototype.addAnimation = function (name, rowStart, columnCount) {
    var animation = {name: this.animationNamePrefix + name, frames: []};
    for (var c = 0; c < columnCount; ++c) {
        var frame = {image: this.imageName,
            duration: 125,
            u1: ((c) * this.tileWidth) / this.imageWidth,
            v1: ((rowStart) * this.tileHeight) / this.imageHeight,
            u2: ((c + 1) * this.tileWidth) / this.imageWidth,
            v2: ((rowStart + 1) * this.tileHeight) / this.imageHeight
        };
        animation.frames.push(frame);
    }
    this.animations.push(animation);
};

Animations2JSON.prototype.addFourWayAnimations = function(name, rowStart, columnCount) {
    for(var w = 0; w<this.waysNameSuffix.length; ++w) {
        this.addAnimation(name + this.waysNameSuffix[w], rowStart+w, columnCount);
    }
};

Animations2JSON.prototype.generateNanimJSON = function () {
    this.addFourWayAnimations("spellcast", 0, 7);
    this.addFourWayAnimations("thrust", 4, 8);
    this.addFourWayAnimations("walk", 8, 9);
    this.addFourWayAnimations("slash", 12, 6);
    this.addFourWayAnimations("shoot", 16, 13);
    this.addAnimation("hurt", 20, 6);
    return JSON.stringify({"animations": this.animations});
};
Animations2JSON.prototype.saveAsJSON = function () {
    var a = window.document.createElement('a');
    var json = this.generateNanimJSON();
    a.href = window.URL.createObjectURL(new Blob([json], {type: 'application/json'}));
    a.download = this.jsonName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};