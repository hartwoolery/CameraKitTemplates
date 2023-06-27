var Easing = require("./EasingModule");

var Button = function(sceneObject) {
    
    this.image = sceneObject.getComponent("Component.Image");
    this.transform = sceneObject.getComponent("Component.ScreenTransform");
    this.image.enabled = false;
    this.fullScaleSize = vec2.one();
    this.easing = new Easing("easeOutCubic", 0.25);
    this.isSelected = false;
}

Button.prototype.onResize = function(pixelSize) {
    this.fullScaleSize = this.transform.anchors.getSize();
    this.image.mainPass.size = vec2.one().uniformScale(pixelSize);
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
    this.isSelected = isSelected === true;
    this.image.mainPass.isHighlighted = isSelected === true;
}


module.exports = Button;


