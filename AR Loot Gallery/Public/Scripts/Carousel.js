//@input Asset.Material buttonMaterial
//@input float itemRadius = 10 {"widget":"slider", "min":0.0, "max":50, "step":0.1}
//@input float itemBorderWidth = 10 {"widget":"slider", "min":0.0, "max":20, "step":0.1}

//@input float itemSpacing = 20 {"widget":"slider", "min":0.0, "max":100, "step":0.1}
//@input vec4 itemColor = {0.5,0.5,0.5,1.} {"widget":"color"}
//@input vec4 itemHighlightColor = {1.,1.,1.,1.} {"widget":"color"}
//@input vec4 itemBorderColor = {1.,1.,1.,0.5} {"widget":"color"}
//@input Asset.Texture[] testTextures



var eventModule = require("./EventModule");
var Utils = require("./UtilsModule");
var Button = require("./CarouselButton")

const Carousel = function() {
    this.touchDidMove = false;
    this.multiSelect = false;
    this.items = [];
    this.selectedIndices = []
    this.isDragging = false;
    this.touchStartPosition = vec2.zero();
    this.touchStartCenter = vec2.zero();
    this.container = script.getSceneObject();
    this.anchors = script.getSceneObject().getComponent("Component.ScreenTransform").anchors
    
    this.onSelectItem = new eventModule.KeyedEventWrapper();
    this.onDeselectItem = new eventModule.KeyedEventWrapper();
    
    this.maxCenter = 0;
    this.minCenter = 0;
    this.targetPosition = 0;
    this.momentum = 0;
    
    this.touchIndex = null;
    
    this.camera = Utils.findCameraParent(script.getSceneObject())
}

Carousel.prototype.addItems = function(dataArr) {
    for (var i=0; i<dataArr.length; i++) {
        var button = global.scene.createSceneObject("button_"+i);
        var transform = button.createComponent("Component.ScreenTransform");
  
        var image = button.createComponent("Component.Image");
        button.layer = this.camera.renderLayer;
        image.mainMaterial = script.buttonMaterial.clone();
        
        button.setParent(script.getSceneObject())
        var data = dataArr[i];
        
        var options = {
            image: image,
            texture: data.texture,
            camera: this.camera,
            transform: transform,
            cornerRadius: script.itemRadius/100,
            borderWidth: script.itemBorderWidth/100,
            color: script.itemColor,
            borderColor: script.itemBorderColor,
            borderHighlightColor: script.itemHighlightColor
        }
        
        var interface = new Button(options)
        
        this.items.push({
            name: button.name,
            button: button,
            data: data,
            interface: interface
        })
        
        
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
        var one = vec2.one();
        var bl = trans.localPointToScreenPoint(one.uniformScale(-1))
        var tr = trans.localPointToScreenPoint(one)
        var diff = bl.sub(tr);
        
        
        var rt = this.camera.renderTarget;
        var pixelSize = new vec2(Math.round(Math.abs(diff.x)*rt.getWidth()), Math.round(Math.abs(diff.y)*rt.getHeight()));
        
        var carouselSize = this.anchors.getSize();
        var carouselPercent = carouselSize.uniformScale(0.5);
        var carouselPixels = pixelSize.mult(carouselPercent);
        
        var itemPixels = carouselPixels.y;
        var itemPixelSpacing = itemPixels * (script.itemSpacing/100.);
        
        
        var numItems = this.items.length;
        
        var totalPixelsWidth = numItems * itemPixels + (numItems + 1) * itemPixelSpacing;

        var screenWidth = 2.0*totalPixelsWidth/pixelSize.x;
        var overflow = totalPixelsWidth > pixelSize.x;
        
        var leftPos = overflow ? -1 : (((pixelSize.x - totalPixelsWidth) / totalPixelsWidth) - 1.) 

        this.anchors.left = leftPos;
       
        this.anchors.right = screenWidth + leftPos;
        
        this.targetPosition = leftPos + screenWidth/2;
        
        
        var screenSpacing = 2.0 * itemPixelSpacing / totalPixelsWidth;
        var screenItemWidth = 2.0 * itemPixels / totalPixelsWidth;
        
        
        this.minCenter = overflow ? -screenWidth * 0.5 + (screenItemWidth * 2 - screenSpacing) : 0;
        this.maxCenter = overflow ? screenWidth * 0.5 - (screenItemWidth * 2 - screenSpacing): 0;
        
        for (var i=0; i<numItems; i++) {
            var button = this.items[i].button;
            var anchors = button.getComponent("Component.ScreenTransform").anchors;
            var api = this.items[i].interface;
            
            anchors.top = 1;
            anchors.bottom = -1;
            anchors.left = (i+1) * screenSpacing + i * screenItemWidth - 1;
            
            anchors.right = anchors.left + screenItemWidth
            
            api.onResize.call(api)
        }
        
    } else {
        print("WARNING: PLEASE PLACE CAROUSEL UNDER AN ORTHOGRAPHIC CAMERA, UNDER A SCREEN REGION")
    }
}

Carousel.prototype.selectItem = function(index) {
    if (index == null) return;
    
    if (this.multiSelect) {
        var interface = this.items[index].interface;
        this.items[index].interface.onSelected()
    } else {
        //deselect current
        if (this.selectedIndices.length) {
            
        }
    }
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
    var currentCenter = carousel.anchors.getCenter();
    var newXPosition = currentCenter.x + this.momentum ; //this.dragging ? this.targetPosition : 
    if (newXPosition < this.minCenter) newXPosition += (this.minCenter - newXPosition) * 0.4 ;
    if (newXPosition > this.maxCenter) newXPosition += (this.maxCenter - newXPosition) * 0.4;
    this.momentum *= 0.92;
    
    var newCenter = new vec2(newXPosition, currentCenter.y)
    carousel.anchors.setCenter(newCenter);
    
    for (var i=0; i<this.items.length; i++) {
        var api = this.items[i].interface;
        api.update.call(api, i)
    }
}

Carousel.prototype.checkButtonPress = function(state) {
    
    if (this.touchIndex != null) {
        var interface = this.items[this.touchIndex].interface;
        interface[state]();
        if (!this.dragging && state == "OnButtonUp") {
            this.selectItem(this.touchIndex)
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
    this.dragging = true;
    this.checkButtonPress("onButtonOff")
    var touchDeltaX = touchPos.sub(this.touchStartPosition).x * 2.;
    var newXPosition = this.touchStartCenter.x + touchDeltaX;
    var lastXPosition = this.anchors.getCenter().x;
    this.momentum = (newXPosition - lastXPosition) * 0.5;
    if (newXPosition < this.minCenter) newXPosition = this.minCenter + (newXPosition-this.minCenter) / 4
    if (newXPosition > this.maxCenter) newXPosition = this.maxCenter + (newXPosition-this.maxCenter) / 4
    this.targetPosition = newXPosition;
    
}

Carousel.prototype.onTouchEnd = function(touchPos) {
    this.checkButtonPress("onButtonUp")
    carousel.dragging = false;   
    this.currentButton = null;
}

script.createEvent("UpdateEvent").bind(function(){
    carousel.update.call(carousel)
})






var delay = script.createEvent("DelayedCallbackEvent")

delay.bind(function(){
    var testData = [];
    for (var i=0; i<script.testTextures.length; i++) {
        testData.push({
            texture: script.testTextures[i]
        })
    }
    carousel.addItems(testData)
})

delay.reset(0.1)



var carousel = new Carousel()
script.api.interface = carousel;


