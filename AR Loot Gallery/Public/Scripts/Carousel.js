//@input Asset.Material buttonMaterial

//@input bool multiSelect = true;
//@input bool scrollable = true;
//@input float itemRadius = 10 {"widget":"slider", "min":0.0, "max":50, "step":0.1}
//@input float itemBorderWidth = 10 {"widget":"slider", "min":0.0, "max":20, "step":0.1}

//@input float itemSpacing = 20 {"widget":"slider", "min":0.0, "max":100, "step":0.1}
//@input float verticalPadding = 0 {"widget":"slider", "min":0.0, "max":100, "step":0.1}

//@input vec4 itemColor = {0.5,0.5,0.5,1.} {"widget":"color"}
//@input vec4 itemHighlightColor = {1.,1.,1.,1.} {"widget":"color"}
//@input vec4 itemBorderColor = {1.,1.,1.,0.5} {"widget":"color"}




var eventModule = require("./EventModule");
var Utils = require("./UtilsModule");
var Button = require("./CarouselButton")

const Carousel = function() {
    this.touchDidMove = false;
    this.multiSelect = script.multiSelect;
    this.scrollable = script.scrollable;
    this.items = [];
    this.selectedIndices = []
    this.isDragging = false;
    this.touchStartPosition = vec2.zero();
    this.touchStartCenter = vec2.zero();
    this.container = script.getSceneObject();
    this.anchors = script.getSceneObject().getComponent("Component.ScreenTransform").anchors;
    
    this.onSelectItem = new eventModule.EventWrapper();
    this.onDeselectItem = new eventModule.EventWrapper();
    
    this.maxCenter = 0;
    this.minCenter = 0;
    this.targetPosition = 0;
    this.momentum = 0;
    
    this.touchIndex = null;
    
    this.camera = Utils.findCameraParent(script.getSceneObject())
}

Carousel.prototype.removeAllItems = function() {
    for (var i=0; i<this.items.length; i++) {
        this.items[i].button.destroy()
    }
    this.items = [];
    this.selectedIndices = [];
}

Carousel.prototype.createButton = function(texture, index) {
    var button = global.scene.createSceneObject("button_" + index);
    button.layer = this.camera.renderLayer;

    var transform = button.createComponent("Component.ScreenTransform");
    var image = button.createComponent("Component.Image");
    image.setRenderOrder(10)
    image.mainMaterial = script.buttonMaterial.clone();
    
    var pass = image.mainMaterial.mainPass;
    pass.useImage = true;
    pass.cornerRadius = script.itemRadius/100;
    pass.borderPercent = script.itemBorderWidth/100;
    pass.bgColor = script.itemColor;
    pass.borderColor = script.itemBorderColor;
    pass.borderHighlightColor = script.itemHighlightColor;
    pass.baseTex = texture;    
    button.setParent(script.getSceneObject())
    return button;
}

Carousel.prototype.addItems = function(dataArr) {
    for (var i=0; i<dataArr.length; i++) {
        var data = dataArr[i];
        var button = this.createButton(data.texture, i)
        
        
        var interface = new Button(button)
        
        
        this.items.push({
            name: button.name,
            button: button,
            data: data,
            interface: interface
        })
        
        if (data.isSelected) {
            this.toggleItemAtIndex(i, true)
        }
        
        //button.enabled = true;
    }
    
    this.onResize();
}

Carousel.prototype.addItem = function(data) {
    this.addItems([data]);
}



Carousel.prototype.onResize = function() {
    var trans = script.getSceneObject().getParent().getComponent("Component.ScreenTransform")
    
    
    

    
    if (this.camera && trans){ 
        
        var pixelSize = Utils.transformToPixels(trans, this.camera);
        var carouselSize = this.anchors.getSize();
        var carouselPercent = carouselSize.uniformScale(0.5);
        var carouselPixels = pixelSize.mult(carouselPercent);
        
        var itemPixels = carouselPixels.y * (1 - script.verticalPadding/100);
        var itemPixelSpacing = itemPixels * (script.itemSpacing/100.);
        
        
        var numItems = this.items.length;
        
        var totalPixelsWidth = numItems * itemPixels + (numItems + 1) * itemPixelSpacing;
        
        var screenWidth = 2.0*totalPixelsWidth/pixelSize.x;
        var overflow = totalPixelsWidth > pixelSize.x;
        
        var leftPos = overflow ? -1 : screenWidth * -0.5;
         
        if (script.getSceneObject().name == "Arrange Control") {
            
        }
        this.anchors.left = leftPos;
        
        this.anchors.right = screenWidth + leftPos;
        
        this.targetPosition = leftPos + screenWidth/2;
        
        var screenSpacing = 2.0 * itemPixelSpacing / totalPixelsWidth;
        var screenItemWidth = 2.0 * itemPixels / totalPixelsWidth;
        
        
        this.minCenter = overflow ? -screenWidth * 0.5 + (screenItemWidth  - screenSpacing) : 0;
        this.maxCenter = overflow ? screenWidth * 0.5 - (screenItemWidth -  screenSpacing): 0;
        
        
        
        for (var i=0; i<numItems; i++) {
            var button = this.items[i].button;
            var anchors = button.getComponent("Component.ScreenTransform").anchors;
            var api = this.items[i].interface;
            
            anchors.top = 1 - script.verticalPadding/100;
            anchors.bottom = -1 + script.verticalPadding/100;
            anchors.left = (i+1) * screenSpacing + i * screenItemWidth - 1;
            
            anchors.right = anchors.left + screenItemWidth
            
            api.onResize.call(api, itemPixels)
        }
    } else {
        print("WARNING: PLEASE PLACE CAROUSEL UNDER AN ORTHOGRAPHIC CAMERA, UNDER A SCREEN REGION")
    }
}

Carousel.prototype.toggleItemAtIndex = function(index, avoidTrigger) {
    var interface = this.items[index].interface;
    interface.onSelected(!interface.isSelected);
    
    if (interface.isSelected) {
        this.selectedIndices.push(index);
    } 
    else {
         this.selectedIndices = this.selectedIndices.filter(function(val, i, a) {
            return (val !== index);
         });
    }    
    var event = interface.isSelected ? this.onSelectItem : this.onDeselectItem;
    if (avoidTrigger != true) event.trigger(index, this.items[index].data);
}

Carousel.prototype.selectItem = function(index) {
    if (index == null) return;
    
    if (!this.multiSelect) {
        
        //deselect current if needed
        if (this.selectedIndices.length) {
            var deselectIndex = this.selectedIndices[0];
            if (index == deselectIndex) return;
            this.toggleItemAtIndex(deselectIndex)  
            
        }
        
    }
    this.toggleItemAtIndex(index)
}

Carousel.prototype.indexForScreenPoint = function(screenPoint) {
    for (var i=0; i<this.items.length; i++) {
        var button = this.items[i].button;
        var transform = button.getComponent("Component.ScreenTransform");
        if (transform.containsScreenPoint(screenPoint)) return i;
    }
    return null;
}

Carousel.prototype.update = function() {
    //var t = this.easing.update();
    if (this.scrollable) {
        var currentCenter = carousel.anchors.getCenter();
        var newXPosition = currentCenter.x + this.momentum ; //this.dragging ? this.targetPosition : 
        if (newXPosition < this.minCenter) newXPosition += (this.minCenter - newXPosition) * 0.4 ;
        if (newXPosition > this.maxCenter) newXPosition += (this.maxCenter - newXPosition) * 0.4;
        this.momentum *= 0.92;
        
        var newCenter = new vec2(newXPosition, currentCenter.y)
        carousel.anchors.setCenter(newCenter);
    }
    
    
    for (var i=0; i<this.items.length; i++) {
        var api = this.items[i].interface;
        api.update.call(api, i)
    }
}

Carousel.prototype.checkButtonPress = function(state) {
    
    if (this.touchIndex != null) {
        var interface = this.items[this.touchIndex].interface;
        interface[state]();
        if (!this.dragging && state == "onButtonUp") {
            this.selectItem(this.touchIndex);
        }
    }
}

Carousel.prototype.onTouchStart = function(touchPos) {
    this.touchStartPosition = touchPos;
    this.touchStartCenter = this.anchors.getCenter();
    var index = this.indexForScreenPoint(touchPos);
    this.touchIndex = index;
    this.checkButtonPress("onButtonDown");
}

Carousel.prototype.onTouchMove = function(touchPos) {
    var touchDeltaX = touchPos.sub(this.touchStartPosition).x * 2.;
    if (Math.abs(touchDeltaX) > 0.01) {
        this.dragging = true;
        this.checkButtonPress("onButtonOff")
    }    
    
    
    var newXPosition = this.touchStartCenter.x + touchDeltaX;
    var lastXPosition = this.anchors.getCenter().x;
    this.momentum = (newXPosition - lastXPosition) * 0.25;
    if (newXPosition < this.minCenter) newXPosition = this.minCenter + (newXPosition-this.minCenter) / 4
    if (newXPosition > this.maxCenter) newXPosition = this.maxCenter + (newXPosition-this.maxCenter) / 4
    this.targetPosition = newXPosition;
    
}

Carousel.prototype.onTouchEnd = function(touchPos) {
    this.checkButtonPress("onButtonUp")
    carousel.dragging = false;   
    this.currentButton = null;
}


Carousel.prototype.containsScreenPoint = function(touchPos) {
    return this.container.getComponent("Component.ScreenTransform").containsScreenPoint(touchPos)
}


script.createEvent("UpdateEvent").bind(function(){
    carousel.update.call(carousel)
})



var carousel = new Carousel()
script.api.interface = carousel;


