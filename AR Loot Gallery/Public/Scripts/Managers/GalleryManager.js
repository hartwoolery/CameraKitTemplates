//@ui {"widget":"group_start", "label":"Frame"}
//@input bool useEnvironmentLighting = true {"label":"Use Lighting"}
//@input float frameWidth = 1 {"label":"Width (m)", "widget":"slider", "min":0.0, "max":10, "step":0.1}
//@input float frameDepth = 3 {"label":"Depth (cm)", "widget":"slider", "min":0.0, "max":10, "step":0.1}
//@input float frameThickness = 10 {"label":"Border (%)", "widget":"slider", "min":0.0, "max":100, "step":1}
//@input float frameRadius = 10 {"label":"Radius (%)", "widget":"slider", "min":0.0, "max":100, "step":1.0}
//@input vec4 frameColor = {0.8,0.8,0.8,1.0} {"label":"Color", "widget":"color"}
//@ui {"widget":"group_end"}
//@ui {"widget":"separator"}
//@input Component.Camera worldCamera
//@input Component.ScriptComponent carouselScript
//@input Component.ScriptComponent arrangeScript
//@input SceneObject infoControl;
//@input Asset.Material frameMaterial
//@input Asset.Texture[] testTextures


var Utils = require("./UtilsModule");
var Easing = require("./EasingModule")
var RoundedMesh = require("./RoundedMeshModule");

const GalleryManager = function() {
    this.carousel = script.carouselScript.api.interface;
    this.arrangement = script.arrangeScript.api.interface;
    this.arrangeType = "circle";
    this.frames = [];
    this.arrangement.onSelectItem.add(this.onSelectArrangement);
    this.carousel.onSelectItem.add(this.onSelect);
    this.carousel.onDeselectItem.add(this.onDeselect);
    this.cameraTransform = this.getCameraTransform();
    this.easing = new Easing("easeOutCubic", 1.0);    
    this.probe = Physics.createRootProbe();
    this.highlightFrame = null;
    this.previousPosition = vec3.zero();
    this.previousRotation = quat.fromEulerAngles(0,0,0);
}

GalleryManager.prototype.onDeselect = function(index, data) {
    galleryManager.removeFrameAtIndex.call(galleryManager, index);
}

GalleryManager.prototype.onSelect = function(index, data) {
    var GM = global.galleryManager;
    GM.createFrameFromImage.call(GM, data.texture, index);
    GM.frames = GM.frames.sort(function(a,b) {
        return a.index - b.index;
    });
    GM.arrange.call(GM);
}

GalleryManager.prototype.onSelectArrangement = function(index, data) {
    global.galleryManager.arrangeType = data.type;
    global.galleryManager.arrange();
}

GalleryManager.prototype.removeFrameAtIndex = function(index) {
    //remove frame at index
    this.frames = this.frames.filter(function(val, i, a) {
        if (val.index === index) {
            val.sceneObject.destroy()
            return false;
        }
        return true;
    });
    this.arrange();
}

GalleryManager.prototype.findGalleryItem = function(touchPos, callback) {

    var camTran = script.worldCamera.getTransform();
    var origin = camTran.getWorldPosition();
    var end = script.worldCamera.screenSpaceToWorldSpace(touchPos, 10000);
    
    this.probe.rayCast(origin, end, function(hit) {
        if (hit != null) {
            global.galleryManager.loopItems(function( index, frame ) { 
                
                if (hit.collider.isSame(frame.collider)) {
                    return callback.call(global.galleryManager, frame);
                }
            })
        }
    });
};


GalleryManager.prototype.createFrameFromImage = function(texture, index) {
    
    var name = Utils.nameForTexture(texture)
    var options = {
        name: name,
        index: index,
        material: script.frameMaterial,
        texture: texture,
        useEnvironmentLighting: script.useEnvironmentLighting,
        depth: script.frameDepth,
        width: script.frameWidth,
        borderSize: script.frameThickness/100,
        borderRadius: script.frameRadius/100,
        borderColor: script.frameColor,
        startPosition: this.cameraTransform.center
    }
    var frame = global.scene.createSceneObject(name);
    frame.layer = script.worldCamera.renderLayer;
    var roundedMesh = new RoundedMesh(frame, options)
    this.frames.push(roundedMesh);
}

GalleryManager.prototype.arrange = function(doNotUpdateCamera) {
    if (this.frames.length == 0) return;
    if (!doNotUpdateCamera) this.cameraTransform = this.getCameraTransform();
    switch(this.arrangeType) {
        case "circle":
            this.arrangeCircle(false);
            break;
        case "semi":
            this.arrangeCircle(true);
            break;
        case "grid":
            this.arrangeGrid(false);
            break;
        case "line":
            this.arrangeGrid(true);
            break;
        default:
            break;
    }
    
    this.loopItems(function(index, frame) {
        var transform = frame.sceneObject.getTransform();
        frame.startPosition = transform.getWorldPosition();
        frame.startRotation = transform.getWorldRotation();
        frame.startOpacity = frame.mainPass.opacity;
        frame.targetOpacity = 1;
        
        if (this.highlightFrame) {
            var isHighlighted = index == this.highlightFrame.index;
            if (isHighlighted) {
                var camTrans = this.getCameraTransform();
                var forward = camTrans.forward;
                frame.targetPosition = camTrans.center.add(forward.uniformScale(150)).add(new vec3(0,30,0));
                frame.targetRotation = quat.lookAt(forward.uniformScale(-1), vec3.up());
                
                script.infoControl.setParent(frame.sceneObject);
                var canvas = script.infoControl.getComponent("Component.Canvas");
                canvas.setSize(new vec2(frame.width, frame.width * 0.5));
                
                var yOffset = (frame.height + canvas.getSize().y + 10) * 0.5
                script.infoControl.getTransform().setLocalPosition(new vec3(0,-yOffset,0))
                script.infoControl.enabled = true;
                
            } 
            frame.targetOpacity = isHighlighted ? 1 : 0;
        }
        
        
    })
    
    this.easing.startEasing()
}

GalleryManager.prototype.onTouchStart = function(touchPos) {
    
}

GalleryManager.prototype.onTouchMove = function(touchPos) {
        
}

GalleryManager.prototype.onTouchEnd = function(touchPos) {
    var highlight = this.highlightFrame == null;
    if (highlight) {
        this.findGalleryItem(touchPos, function(frame) {
            this.highlightFrame = frame;
            this.arrange(true)
        });
    } else {
        this.highlightFrame = null;  
        script.infoControl.enabled = false; 
        this.arrange(true)
    }
    
    global.UIManager.showInterface(!highlight);
}



GalleryManager.prototype.getCameraTransform = function() {
    var transform = script.worldCamera.getSceneObject().getTransform();
    var center = transform.getWorldPosition();
    
    
    //adjust for the current angle of the camera
    var forward = script.worldCamera.screenSpaceToWorldSpace(new vec2(0.5,0.5), 10.).sub(center);
    
    //zero out the y to level camera
    forward.y = 0;
    forward = forward.normalize();
    
    left = new vec3(-forward.z, 0, forward.x);
    var cameraAngle = Math.atan2(forward.z, forward.x);
    
    return {
        transform: transform,
        center: center,
        forward: forward,
        left: left,
        up: vec3.up(),
        angle: cameraAngle 
    }
}

GalleryManager.prototype.loopItems = function(callback) {
    for (var i=0; i<this.frames.length; i++) {
        var frame = this.frames[i];

        var frameTransform = callback.call(galleryManager, i, frame);
        
    }
}


GalleryManager.prototype.arrangeGrid = function(isLine) {
    
    //reduce to squarest possible grid size
    var n = this.frames.length;
    var w = Math.ceil(Math.sqrt(n));
    var h = Math.ceil(n / w);
    
    if (isLine) {
        w = n;
        h = 1;
    }
    
    this.loopItems(function(index, frame) {
        var x = index % w;
        var y = Math.floor(index / w);
        
        
        var xOff = w * -0.5;
        var yOff = h * 0.5 - 0.5;
        
        
        var forward = this.cameraTransform.forward;
        var left = this.cameraTransform.left;
        var up = this.cameraTransform.up;
        var gridCenter = this.cameraTransform.center.add(forward.uniformScale(200));
   
        var spacing = 10.0;
        
        if (isLine) {
            yOff = 0;
            left = forward.add(left).uniformScale(0.5);
            forward = new vec3(left.z, 0, -left.x);
            spacing = 60;
        } 
        
        //arrange in a grid along a plane parallel to the camera's plane
        
        var xPos = left.uniformScale((xOff + x) * (frame.width + spacing));
        var yPos = up.uniformScale((yOff - y) * (frame.height + spacing));
        var newPosition = gridCenter.add(xPos).add(yPos)
        var newRotation = quat.lookAt(forward.uniformScale(-1), vec3.up())
        
        frame.targetPosition = newPosition;
        frame.targetRotation = newRotation;
        
    })
}


GalleryManager.prototype.arrangeCircle = function(isSemi) {
    
    var multiplier = isSemi ? 2 : 1;
    var n = Math.max(8 / multiplier, this.frames.length);
 
    n *= multiplier;
    
    var angleOffset = 2 * Math.PI / n;
    var startOffset = -angleOffset * Math.floor(this.frames.length / 2 );
    
    var interiorAngle = Math.PI * (n - 2) / n;
    var sideLength = this.frames[0].width;
    var radius = n/3 * sideLength / (2 * Math.sin(interiorAngle / 2));    
    
    startOffset += this.cameraTransform.angle;
    
    //center even number of frames
    if (this.frames.length % 2 == 0) startOffset += angleOffset * 0.5;
    
    this.loopItems(function(index, frame) {
        var angle = startOffset + angleOffset * index;
        var newPosition = this.cameraTransform.center.add(new vec3(radius*Math.cos(angle), 0, radius*Math.sin(angle)))
        newPosition.y = this.cameraTransform.center.y;
        var newRotation = quat.lookAt(this.cameraTransform.center.sub(newPosition).normalize(), vec3.up())
        frame.targetPosition = newPosition;
        frame.targetRotation = newRotation;
    })
}

var numImages = 15;//imageArray.length;

GalleryManager.prototype.createGalleryFromImages = function(imageArray) {
    var carouselData = [];
    for (var i=0; i<numImages; i++) {
        var isEnabled = true;
        var texture = imageArray[i%imageArray.length];
        if (texture) {
            carouselData.push({
                isSelected: isEnabled,
                texture: texture
            })
            
            if (isEnabled) this.createFrameFromImage(texture, i);
        }
        
    }
    this.carousel.addItems(carouselData);
    this.arrange();
}

GalleryManager.prototype.update = function() {
    if (this.easing.running) {
        var t = this.easing.update();
        
        this.loopItems(function(index, frame) {
            frame.easeToTarget(t);
        })
    }
    
}

script.createEvent("UpdateEvent").bind(function(){
    var GM = global.galleryManager;
    if (GM) GM.update.call(GM);
})

var delay = script.createEvent("DelayedCallbackEvent");
delay.bind(function() {
    var galleryManager = new GalleryManager();
    global.galleryManager = galleryManager;
    galleryManager.createGalleryFromImages.call(galleryManager, script.testTextures);
    
    global.UIManager.setupControls();
    
});

delay.reset(0.1)
    

