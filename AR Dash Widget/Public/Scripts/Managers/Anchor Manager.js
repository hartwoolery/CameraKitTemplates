// -----JS CODE-----

// Area Select.js
// Lens Studio Version 4.34.0
// Event: Lens Initialized
// This script controls an area select UI element

//@ui {"widget":"group_start", "label":"Options"}
//@input float distanceThreshold = 60 {"widget":"slider", "min":0.1, "max":100.0, "step":0.01}
//@ui {"widget":"group_end"}

//@ui {"widget":"separator"}

//@ui {"widget":"group_start", "label":"Advanced"}
//@input Component.Camera worldCamera
//@input SceneObject anchorPlane
//@ui {"widget":"group_end"}

var eventModule = require("./EventModule");

var AnchorManager = function() {
    this.deviceTracking = script.worldCamera.getSceneObject().getComponent("Component.DeviceTracking");
    this.startPosition = new vec2(-1,-1);
    this.endPosition = new vec2(-1,-1);
    this.isEditing = false;
    this.anchorCreated = false;
    this.anchorSaved = false;
    this.currentBounds = null;
    this.firstHit = null;
    
    this.onAnchorCreated = new eventModule.EventWrapper(); 
    this.onAnchorStarted = new eventModule.EventWrapper(); 
    this.onAnchorReset = new eventModule.EventWrapper(); 
    
    script.createEvent("UpdateEvent").bind(function() {
        AM.onUpdate.call(AM);
    })
}



// convert from screen coordinates to shader coordinates
var screenToShader = function(position) {
    //flip coordinate system y-axis
    return new vec2(position.x, 1.0 - position.y);
}

// find the minimum and maximum of two points
var getMinMax = function(pos1, pos2) {
    var minX = Math.min(pos1.x, pos2.x);
    var minY = Math.min(pos1.y,pos2.y);
    var maxX = Math.max(pos1.x, pos2.x);
    var maxY = Math.max(pos1.y,pos2.y);
    return new vec4(minX, minY, maxX, maxY);
};

// find the midpoint between two points
var getMidpoint = function(p1,p2) {
    return p1.add(p2).uniformScale(0.5)
}


AnchorManager.prototype.hitTest = function(screenPos, includeHorizontal) {
    var results = this.deviceTracking.hitTestWorldMesh(screenPos);

    if (results.length > 0) {
        var point = results[0].position;
        var normal = results[0].normal;
        
        if (Math.abs(normal.y) > 0.5 && !includeHorizontal) {
            //don't return horizontal surfaces
            return null;
        }
        normal.y = 0;
        normal = normal.normalize();
        return {pos: point, norm:normal}
    }
    return null;
}


AnchorManager.prototype.intersectPlane = function(hitCenter, screenPos) { 
    var planePos = hitCenter.pos, planeNormal = hitCenter.norm
    // assuming vectors are all normalized
    var rayPos = script.worldCamera.getSceneObject().getTransform().getWorldPosition()
    var rayDir = script.worldCamera.screenSpaceToWorldSpace(screenPos,1).sub(rayPos).normalize()
    var denom = -planeNormal.dot(rayDir); 
    if (denom > 1e-6) {
        var offset = planePos.sub(rayPos);
        var dist = -offset.dot(planeNormal) / denom;
        if (dist >= 0) {
            var pos = rayPos.add(rayDir.uniformScale(dist))
            return pos;
            
        }
    } 
    return null;
}
 

AnchorManager.prototype.constrainSize = function(newSize) {
    var minSize = 10;
    var maxSize = minSize * 50;
    
    var maxRatio = 1.8;
    var minRatio = 0.5;
    if (newSize.x < minSize) newSize.x = minSize;
    if (newSize.y < minSize) newSize.y = minSize;
    if (newSize.x > maxSize) newSize.x = maxSize;
    if (newSize.y > maxSize) newSize.y = maxSize;
    
    //fixes issue with camera aspect ratio not rendering

    
    if ((newSize.x / newSize.y) > maxRatio) {
        newSize.y = newSize.x / maxRatio;
    }
    if ((newSize.x / newSize.y) < minRatio) {
        newSize.y = newSize.x / minRatio;
    }
    
    return newSize;
}


AnchorManager.prototype.anchorCenter = function() {
    if (this.currentBounds) return this.currentBounds.center;
    return null;
}

AnchorManager.prototype.anchorSize = function() {
    if (this.currentBounds) return this.currentBounds.size;
    return null;
}

AnchorManager.prototype.screenToAnchorPlane = function(screenPos) {
    if (!this.currentBounds) return null;
    return this.intersectPlane(this.currentBounds.center, screenPos);
}

AnchorManager.prototype.closestAnchorPoint = function(widgetName, localPos, screenPos) {
    
    var hitPoint = this.screenToAnchorPlane(screenPos)
    if (hitPoint) {
        
        var c = this.currentBounds.corners;
        //[hitTL, hitTR, hitBL, hitBR],
        var l =  getMidpoint(c[0], c[2]); 
        var t =  getMidpoint(c[0], c[1]); 
        var r =  getMidpoint(c[1], c[3]); 
        var b =  getMidpoint(c[2], c[3]); 
        var sides = [l,t,r,b,c[0], c[1], c[2], c[3]];
        var closestSide = null;
        var closestDist = 10000;
        var worldToLocalMat = global.widgetManager.widgetContainer.getTransform().getInvertedWorldTransform();
        var anchorSize = global.anchorManager.anchorSize()
        var hitPointInner = worldToLocalMat.multiplyPoint(hitPoint)
        for (var i=0; i<sides.length; i++) {
            var posInner = worldToLocalMat.multiplyPoint(sides[i])
            
            
            var anchorPos = posInner.normalize();
            anchorPos.x = Math.abs(anchorPos.x) > 0.3 ? Math.sign(anchorPos.x) : 0;
            anchorPos.y = Math.abs(anchorPos.y) > 0.3 ? Math.sign(anchorPos.y) : 0;
            anchorPos = anchorPos.mult(new vec3(anchorSize.x, anchorSize.y, 1.)).add(anchorPos.uniformScale(5))//add(offset);
            
            
            var localDist = localPos.distance(anchorPos);
            var distanceFactor = localDist < anchorSize.x ? 0.8 : 1.0;
            var dist = anchorPos.distance(hitPointInner) * distanceFactor;
            if (dist < closestDist && global.widgetManager.checkNoOverlap(widgetName, anchorPos)) {
                closestDist = dist;
                closestSide = anchorPos
            }
        }
        //if (hitPointInner.length < closestDist && global.widgetManager.checkNoOverlap(widgetName, vec3.zero())) return vec3.zero()
        return closestSide;
    }
    return null;
}

//average the normal value from a spread of points around the anchor area
AnchorManager.prototype.hitAverage = function(bounds) {
    var interval = 0.25;
    var numHits = 0;
    //var pointAvg = vec3.zero();
    var normAvg = vec3.zero();
    for (var i=0; i<=1; i+=interval) {
        for (var j=0; j<=1; j+=interval){
            var testPoint = new vec2(bounds.x + (bounds.z-bounds.x)*i, bounds.y + (bounds.w-bounds.y)*j);
            var hit = this.hitTest(testPoint)
            if (hit) {
                numHits += 1
                //pointAvg = pointAvg.add(hit.pos);
                normAvg = normAvg.add(hit.norm)
            }
        }
    }
    if (numHits == 0) return null;
    var testPointMid = new vec2(bounds.x + (bounds.z-bounds.x)*0.5, bounds.y + (bounds.w-bounds.y)*0.5);
    var midHit = this.hitTest(testPointMid, true)
    if (!midHit) return null;
    return {pos: midHit.pos, norm:normAvg.uniformScale(1/numHits)}
}

//create an anchor at the selected position
AnchorManager.prototype.updateAnchor = function() {
    if (!this.isEditingAnchor() || this.startPosition.x < 0 || this.endPosition.x < 0){
     
        return;
    } 
    
    if (!this.firstHit) {
        this.firstHit = this.hitTest(this.startPosition)
    }
    
    if (!this.firstHit) return;
    
   
    var startPositionFirst = script.worldCamera.worldSpaceToScreenSpace(this.firstHit.pos)
    var bounds = getMinMax(startPositionFirst, this.endPosition);    

    var hitCenter = this.hitAverage(bounds);    
    
    
    if (!hitCenter) {
        var midpoint2D = new vec2(bounds.x + (bounds.z-bounds.x)*0.5, bounds.y + (bounds.w-bounds.y)*0.5);
        var midpoint = script.worldCamera.screenSpaceToWorldSpace(midpoint2D, 150);
        var defaultNorm = script.worldCamera.getTransform().getWorldPosition().sub(midpoint);
        defaultNorm.y = 0;
        defaultNorm = defaultNorm.normalize();
     
        hitCenter = {pos: midpoint, norm: defaultNorm};
    }
    
        
    var tl = new vec2(bounds.x,bounds.y);
    var tr = new vec2(bounds.z,bounds.y);
    var bl = new vec2(bounds.x,bounds.w);
    var br = new vec2(bounds.z,bounds.w);
    var hitTL = this.intersectPlane(hitCenter,tl)
    var hitTR = this.intersectPlane(hitCenter,tr)
    var hitBL = this.intersectPlane(hitCenter,bl)
    var hitBR = this.intersectPlane(hitCenter,br)  
    if (hitTL && hitTR && hitBL && hitBR) {
        var plane = script.anchorPlane;
        plane.getParent().getTransform().setWorldPosition(hitCenter.pos);
        
        var axis = quat.angleAxis(Math.PI/2, new vec3(-1,0,0))
        var up = vec3.down()//.mult();
        var forwardDir = up.projectOnPlane(hitCenter.norm);
        var rot = quat.lookAt(forwardDir, hitCenter.norm);
        plane.getParent().getTransform().setWorldRotation(rot.multiply(axis));
        
        var dx = hitTL.sub(hitTR).length;
        var dy = hitTL.sub(hitBL).length;
        var size = new vec2(dx,dy);
        size = this.constrainSize(size)
        
        plane.getTransform().setWorldScale(new vec3(size.x,size.y,1.).uniformScale(1));  
        plane.getChild(0).getTransform().setWorldScale(new vec3(size.x * 0.05, size.x * 0.05,1.).uniformScale(1));  
       
        plane.getComponent("Component.RenderMeshVisual").mainMaterial.mainPass.size = size;
        
        return {
            corners: [hitTL, hitTR, hitBL, hitBR],
            center: hitCenter,
            size: size
           // diagonal: diagonalInches
        }
    } 
        
    
    return null;
 
};


AnchorManager.prototype.isEditingAnchor = function() {
    return this.isEditing;
}

AnchorManager.prototype.editAnchor = function() {
    this.isEditing = true;
    this.anchorSaved = false;
    script.anchorPlane.enabled = false;
    this.onAnchorReset.trigger();
}

AnchorManager.prototype.saveAnchor = function() {
   this.anchorSaved = true;
   this.isEditing = false;
}


AnchorManager.prototype.hasAnchor = function() {
    return this.anchorSaved;
}

AnchorManager.prototype.showAnchor = function(doShow) {
    script.anchorPlane.enabled = doShow;
}

AnchorManager.prototype.touchStart = function(event) {   
    if (!this.isEditingAnchor()) return;
    this.endPosition = new vec2(-1,-1);
    this.startPosition = event.getTouchPosition();    
    script.anchorPlane.getComponent("Component.RenderMeshVisual").mainMaterial.mainPass.drawMarquee = 1;
    
};

AnchorManager.prototype.touchMove = function(event) {
  
    if (!this.isEditingAnchor()) return;
    this.endPosition = event.getTouchPosition();
    
};

AnchorManager.prototype.touchEnd = function(event) {
    if (!this.isEditingAnchor()) return;
    this.endPosition = event.getTouchPosition();    
    

    
    script.anchorPlane.getComponent("Component.RenderMeshVisual").mainMaterial.mainPass.drawMarquee = 0;
    this.endPosition = new vec2(-1,-1);
    this.startPosition = new vec2(-1,-1)
    
    if (script.anchorPlane.enabled) {
        this.saveAnchor()
        this.onAnchorCreated.trigger();
    }
};

AnchorManager.prototype.onUpdate = function() {
  
    var selectionDistance = this.startPosition.distance(this.endPosition);
    if (selectionDistance > 0.01) {
        var tempBounds = this.updateAnchor();
        
        if (tempBounds) {
            this.currentBounds = tempBounds;
            this.anchorCreated = true;
        } 
        if (!script.anchorPlane.enabled && this.anchorCreated) {
            script.anchorPlane.enabled = true;
            this.onAnchorStarted.trigger();
        }
        
    }
}

var AM = new AnchorManager();
global.anchorManager = AM;


