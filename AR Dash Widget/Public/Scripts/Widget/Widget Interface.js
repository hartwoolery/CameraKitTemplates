//@input Asset.Texture addTexture
//@input Asset.Texture removeTexture


/* 
    This script is attached to every this.widget and provides an interface to handle touch events and manage the state of the this.widget
*/

const RoundedMesh = require("RoundedMeshModule");

var WM = global.widgetManager;
var AM = global.anchorManager;

var WidgetInterface = function() {
    this.initialized = false;
    this.widget = script.getSceneObject();
    this.frame = this.widget.getChild(0);
    this.frame.enabled = false;
    this.addButton = this.frame.getChild(0);
    this.removeButton = this.frame.getChild(1);
    this.collider = this.frame.getComponent("Physics.ColliderComponent");

    
    this.startSize = vec2.zero();
    this.touches = {};
    this.touchOffsets = {};
    
    this.lastSize = new vec2(1,1);
    this.deltaStart = null;
    this.midpointStart = null;
    this.widgetName = null;
    this.widgetIndex = 0;
    this.roundedMesh = null;
    this.cameraTransform = null;
    this.rotationOffset = 0;
    this.currentRotation = 0;
    this.didRotate = false;
    this.didScale = false;
    
    this.targetPosition = null;
}


WidgetInterface.prototype.getTouchDelta = function() {
    var touchKeys = Object.keys(this.touches)
    if (touchKeys.length >= 2) {
        var t1 = this.touches[touchKeys[0]]
        var t2 = this.touches[touchKeys[1]]
        var delta = t1.sub(t2)
        delta.x = Math.abs(delta.x)
        delta.y = Math.abs(delta.y)
        return delta;
    }
    
    return null
}

WidgetInterface.prototype.getTouchMidpoint = function() {
    var touchKeys = Object.keys(this.touches)
    if (touchKeys.length >= 2) {
        var t1 = this.touches[touchKeys[0]]
        var t2 = this.touches[touchKeys[1]]
        return t1.add(t2).uniformScale(0.5)
    }
    return null;
}

WidgetInterface.prototype.updateTouchOffsets = function() {
    var touchKeys = Object.keys(this.touches)
    var widgetCenter = WM.mainCamera.worldSpaceToScreenSpace(this.widget.getTransform().getWorldPosition())
   
    for (var i=0; i<touchKeys.length; i++) {
        this.touchOffsets[touchKeys[i]] = widgetCenter.sub(this.touches[touchKeys[i]])
    }
}




WidgetInterface.prototype.updatePosition = function(fixedPosition, fromOffset) {
    
    var newPos = vec3.zero();
    
    if (fromOffset != undefined) {
        var halfSize = AM.anchorSize().uniformScale(0.5);
        newPos.x = fromOffset.x + (halfSize.x * fromOffset.z);
        newPos.y = fromOffset.y + (halfSize.y * fromOffset.w);
    } else {
        var touchKeys = Object.keys(this.touches);
        var touchAvg = touchKeys.length ? vec2.zero() : new vec2(0.5,0.35);
        var worldToLocalMat = script.getSceneObject().getParent().getTransform().getInvertedWorldTransform();
        
        for (var i=0; i<touchKeys.length; i++) {
            touchAvg = touchAvg.add(this.touches[touchKeys[i]]).add(this.touchOffsets[touchKeys[i]]);
        }
        touchAvg = touchAvg.uniformScale(1.0/Math.max(touchKeys.length,1));
        newPos = AM.screenToAnchorPlane(touchAvg) 
        newPos = worldToLocalMat.multiplyPoint(newPos);
        if (fixedPosition) {
            var localPos = this.widget.getTransform().getLocalPosition();
            var anchorPos = AM.closestAnchorPoint(this.widgetName, localPos,  new vec2(0.5,0.5))
            
            if (anchorPos) {
                
                var currentPos = this.targetPosition == null ? anchorPos : localPos;
                this.targetPosition = anchorPos;
                newPos = currentPos.add(this.targetPosition.sub(currentPos).uniformScale(0.25))     
            }
        }
    }
    
    this.widget.getTransform().setLocalPosition(newPos);
  
}

WidgetInterface.prototype.updateRotation = function() {
    var newRot = quat.fromEulerAngles(0,0,0);
    
    var rotY = this.currentRotation + this.rotationOffset;
    if (rotY > Math.PI/2) rotY = Math.PI/2;
    if (rotY < -Math.PI/2) rotY = Math.PI/2;
    newRot = newRot.multiply(quat.angleAxis(rotY, new vec3(0,1,0)))
    
    this.widget.getTransform().setLocalRotation(newRot);
}

WidgetInterface.prototype.updateSize = function(newSize, updateResolution, touchEnded) {
    newSize = AM.constrainSize(newSize);
    this.lastSize = newSize   
    
  
    if (updateResolution) {
        WM.onResized.trigger(this.widgetName, newSize, touchEnded)    
     
    }
    var border = 2 * this.roundedMesh.borderSize + 5;
    this.collider.shape.size = new vec3(newSize.x + border, newSize.y + border, this.roundedMesh.depth*2);
    
    this.roundedMesh.resize(newSize)
    var offset = -this.roundedMesh.borderSize//this.removeButton.getTransform().getLocalScale().x * 0.25  //- this.roundedMesh.borderSize ;
    var buttonPos = new vec3(newSize.x*0.5 + offset, newSize.y*0.5 + offset, this.roundedMesh.depth);
    
    this.removeButton.getTransform().setLocalPosition(buttonPos);
    this.addButton.getTransform().setLocalPosition(buttonPos);
}


WidgetInterface.prototype.updateScaleAndRotation = function() {
    var delta = this.getTouchDelta()
    if (delta && this.deltaStart) {
        var aspect = new vec2(WM.mainCamera.aspect, 1)
        
        
        //scale
        var touchExpansion = delta.sub(this.deltaStart).mult(aspect).uniformScale(4.).add(vec2.one());
        var newSize = this.startSize.mult(touchExpansion);
          
        this.didScale = touchExpansion.x != 1 && touchExpansion.y != 1;
       
        
        this.updateSize(newSize)
        
        //rotate
        var midpoint = this.getTouchMidpoint();
        var newRotationOffset = midpoint.sub(this.midpointStart).x * 4;
        var rotationThresh = 0.15;
        
        //snap the rotation around 0
        if (Math.abs(newRotationOffset + this.currentRotation) < rotationThresh) newRotationOffset = -this.currentRotation;
        else newRotationOffset += Math.sign(newRotationOffset) * rotationThresh;
        
        
        if (newRotationOffset != this.rotationOffset) {
            this.rotationOffset = newRotationOffset;
            this.didRotate = true;
            this.updateRotation();
            WM.onRotated.trigger(this.widgetName, newRotationOffset + this.currentRotation, false)   
        }
    }
}

WidgetInterface.prototype.initialize = function(widgetOptions) {
    this.widgetName = widgetOptions.name;
    this.widgetIndex = widgetOptions.index;
    this.roundedMesh = new RoundedMesh(script.getSceneObject(), widgetOptions);
    
    var cameraObj = WM.mainCamera.getSceneObject();
    this.cameraTransform = cameraObj.getTransform();
    
  
    
    var size = widgetOptions.transform.scale || AM.anchorSize(); 
    this.currentRotation = widgetOptions.transform.theta || 0;
    
    this.updateRotation()  
    this.updatePosition(false, widgetOptions.transform.offset);
    this.updateSize(size, true)
    
    this.initialized = true
    WM.onInitialized.trigger(this.widgetName);
}

var vectorToString = function(v) {
    
}

WidgetInterface.prototype.onAdded = function() {
    this.addButton.enabled = false;
    this.removeButton.enabled = true;
}

WidgetInterface.prototype.onSave = function() {
    //todo save to local storage
    this.removeButton.enabled = false;
}

WidgetInterface.prototype.onEdit = function() {
    this.removeButton.enabled = true;
}


WidgetInterface.prototype.checkRemoveTap = function(hitPos) {
    var touchDist = hitPos.distance(this.removeButton.getTransform().getWorldPosition());
    
    return (touchDist < this.removeButton.getTransform().getLocalScale().x); 
}

WidgetInterface.prototype.getScreenPosition = function() {
    var worldPos = this.widget.getTransform().getWorldPosition();
    var screenPos = WM.mainCamera.worldSpaceToScreenSpace(worldPos);
    return screenPos;
}

WidgetInterface.prototype.getData = function() {
    var pos = this.widget.getTransform().getLocalPosition();
    var halfSize = AM.anchorSize().uniformScale(0.5);
    var xi = Math.sign(pos.x) 
    var yi = Math.sign(pos.y);
    var xOff = pos.x - xi * halfSize.x;
    var yOff = pos.y - yi * halfSize.y;
      
    var saveData = {
        x: xOff,
        y: yOff,
        t: this.currentRotation,
        w: this.lastSize.x,
        h: this.lastSize.y,
        xi: xi,
        yi: yi
    }
    return saveData;
}

WidgetInterface.prototype.getName = function() {
    return this.widgetName;
}

WidgetInterface.prototype.setLoading = function(isLoading) {
    this.roundedMesh.mainPass.isLoading = isLoading;
}

WidgetInterface.prototype.onUpdate = function(fixedPosition, opacity){
  
    if (!this.initialized) return;
    
    this.roundedMesh.setOpacity(opacity)
   
    var numTouches = Object.keys(this.touches).length

    if (numTouches == 1 || fixedPosition) {
        this.updatePosition(fixedPosition);
        
    }
    if (numTouches >= 2) {
        this.updateScaleAndRotation()
    }
   
    this.frame.enabled = this.initialized;
    
}



WidgetInterface.prototype.touchStart = function(touch, touchId) {
  
   this.touches[touchId] = touch;
   var numTouches = Object.keys(this.touches).length;
   this.updateTouchOffsets()
   if (numTouches == 1) {
        this.startSize = new vec2(this.lastSize.x, this.lastSize.y) 
   } 
   else if (numTouches == 2) {
        this.deltaStart = this.getTouchDelta();
        this.midpointStart = this.getTouchMidpoint();
   }
};

WidgetInterface.prototype.touchMove = function(touch, touchId){
    //var numTouches = Object.keys(this.touches).length;
    this.touches[touchId] = touch
}

WidgetInterface.prototype.touchEnd = function(touch, touchId){
    delete this.touches[touchId];
    var numTouches = Object.keys(this.touches).length;
    this.updateTouchOffsets()
    
    if (numTouches == 0) {
        //touch end
        if (this.didRotate) WM.onRotated.trigger(this.widgetName, this.currentRotation, true)   
        this.currentRotation += this.rotationOffset;
        this.rotationOffset = 0;
        this.didRotate = false;
        
    }
    if (numTouches == 1) {
        this.startSize = new vec2(this.lastSize.x, this.lastSize.y)
        if (this.didScale) this.updateSize(this.lastSize, true, true)
        this.didScale = false;
    }
    return numTouches
}

script.api.widgetInterface = new WidgetInterface();

