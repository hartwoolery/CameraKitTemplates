var Easing = require("./EasingModule");

var Button = function(options) {
    this.image = options.image;
    this.pass = this.image.mainPass;
    this.fullScaleSize = vec2.one();
    this.easing = new Easing("easeInCubic", 0.25)
    
    this.camera = options.camera;
    this.transform = options.transform;
    
    this.isSelected = false;

    
    this.pass.useImage = options.texture != undefined;
    this.pass.cornerRadius = options.cornerRadius;
    this.pass.borderPercent = options.borderWidth;
    if (this.pass.useImage) this.pass.baseTex = options.texture;
    this.pass.bgColor = options.color;
    this.pass.borderColor = options.borderColor;
    this.pass.borderHighlightColor = options.borderHighlightColor;
}

Button.prototype.onResize = function() {
   
    this.fullScaleSize = this.transform.anchors.getSize();
    
    var pixelSize = new vec2(0,0);
   
    var one = vec2.one();
    var bl = this.transform.localPointToScreenPoint(one.uniformScale(-1))
    var tr = this.transform.localPointToScreenPoint(one)
    var diff = bl.sub(tr);
    var rt = this.camera.renderTarget;
    
    pixelSize = new vec2(Math.round(Math.abs(diff.x)*rt.getWidth()), Math.round(Math.abs(diff.y)*rt.getHeight()));
            
    
    this.pass.size = pixelSize;
 
    this.image.enabled = true;
    
}


Button.prototype.update = function(i) {
    var scaleDown = 0.1;
    var t = this.easing.update.call(this.easing);
    var newSize = (1.0 - t) * scaleDown + (1.0-scaleDown);
    this.transform.anchors.setSize(this.fullScaleSize.uniformScale(newSize))
}

Button.prototype.onButtonDown = function() {
    this.easing.startEasing.call(this.easing);
}

Button.prototype.onButtonOff = function() {
    this.easing.reverseEasing.call(this.easing);
}

Button.prototype.onButtonUp = function() {
    this.easing.reverseEasing.call(this.easing);
   
}

Button.prototype.onSelected = function(isSelected) {
    this.isSelected = isSelected;
    this.pass.isHighlighted = isSelected;
   
}


module.exports = Button;


