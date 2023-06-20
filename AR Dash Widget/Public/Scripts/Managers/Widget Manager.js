//@input Component.Camera mainCamera
//@input SceneObject widgetContainer
//@input Component.Camera[] widgetCameras
//@input Asset.ObjectPrefab widgetPrefab
//@input Asset.Material widgetMaterial
//@input Component.ScriptComponent carousel
//@input Asset.Texture carouselDefaultImage


var eventModule = require("./EventModule");

var WidgetManager = function() {
    this.widgetContainer = script.widgetContainer;
    this.mainCamera = script.mainCamera;
    
    this.isEditor = global.deviceInfoSystem.isEditor()
    this.store = global.persistentStorageSystem.store
    this.saveKey = "WIDGET_DATA"
    
    this.cameraMap = {}
    this.widgetMap = {}
    this.addedWidgetMap = {};
    this.twoFingerTouch = false;
    this.twoFingerPan = false;
    this.touchStartTime = 0;
    
    this.currentWidget = null;
    this.tempWidgetName = null;
    this.highlightedWidget = null;
    
    this.onAdded = new eventModule.EventWrapper(); 
    this.onResized = new eventModule.EventWrapper(); 
    
    this.onResized.add(this.onWidgetResized)
    this.onRotated = new eventModule.EventWrapper(); 
    this.onInitialized = new eventModule.EventWrapper();
    
    this.probe = Physics.createRootProbe();
    this.initialized = false
    this.isEditing = true;
    this.isSaveable = false;
    this.lastIndex = 0;
    
    this.touchCallback = null
    this.touchDelay = script.createEvent("DelayedCallbackEvent");
    this.touchDelay.bind(function() {
        if (WM.touchCallback) WM.touchCallback.call(WM)
    })
    
    script.createEvent("UpdateEvent").bind(function() {
        WM.onUpdate.call(WM)
    })
}


WidgetManager.prototype.initialize = function() {
    script.widgetContainer.enabled = true;    
    
    if (!this.initialized) {
        for (var i=0; i<script.widgetCameras.length; i++) {
            var camera = script.widgetCameras[i];
            if (!camera) continue;
            var cameraObj = camera.getSceneObject();
            cameraObj.enabled = false;
            var widgetConfig = cameraObj.getComponent("Component.ScriptComponent");
            if (!widgetConfig) {
                print("WARNING: No Widget Configuration script detected for camera: " + camerObj.name)
            } else {
                
                this.cameraMap[cameraObj.name] = camera;
                var carouselImage = widgetConfig.carouselImage ? widgetConfig.carouselImage : script.carouselDefaultImage
                script.carousel.add(carouselImage)
            }
        }
        this.onRestore()
        this.initialized = true;
    };
    
    this.selectWidget(0)
}



WidgetManager.prototype.onUpdate = function() {
    //loop through active widgets and update
    
    this.loopWidgets(function( api, widgetName ){ 
        var fixedPosition = this.addedWidgetMap[widgetName] != true;
        
        var opacity = 1.0;
        if (this.isEditing && this.highlightedWidget == widgetName && this.addedWidgetMap[this.highlightedWidget] != true) {
            opacity = 0.75;
        } else if (this.isEditing && this.currentWidget && this.currentWidget.getName() == widgetName) {
            opacity = 0.75
        }
        api.onUpdate(fixedPosition, opacity)
    
    })
}

WidgetManager.prototype.findWidget = function(touchPos, callback) {
    if (this.currentWidget != null) {
        callback(this.currentWidget);
        return;
    }
    var camTran = script.mainCamera.getTransform();
    var origin = camTran.getWorldPosition();
    var end = script.mainCamera.screenSpaceToWorldSpace(touchPos, 10000);
    
    this.probe.rayCast(origin, end, function(hit) {
        if (hit != null) {
            WM.loopWidgets(function( api, widgetName ) { 
                var widget = this.widgetMap[widgetName]
                var collider = widget.getChild(0).getComponent("Physics.ColliderComponent")
          
                if (hit.collider.isSame(collider)) {
                    
                    return callback.call(WM, api, hit)
                    
                }
            })
        }
    });
};

WidgetManager.prototype.getParentWidgetName = function(obj) {
    if (obj.getSceneObject != undefined) obj = obj.getSceneObject();
    while (obj.getParent() != undefined) {
        obj = obj.getParent();
        var camera = obj.getComponent("Component.Camera");
        if (camera) return obj.name;
    }
    return null
}



WidgetManager.prototype.updateTwoFingerTouch = function(touchPos, touchId) {
    if (!this.currentWidget) { return; }
    var touchId2 = parseInt(touchId) + 1;
    var widgetPos = this.currentWidget.getScreenPosition();
    if (!this.twoFingerTouch) this.twoFingerPan = widgetPos.distance(touchPos) < 0.1;
    
    
    var otherTouch = touchPos.sub(widgetPos).uniformScale(-1).add(widgetPos);
    if (this.twoFingerPan) otherTouch = touchPos.sub(new vec2(0.1,0.1))
    
    global.UIManager.updateTwoFingerTouch(touchPos, otherTouch);
    if (!this.twoFingerTouch) {
        this.twoFingerTouch = true;
        this.currentWidget.touchStart(otherTouch, touchId2);
    }
    
    this.currentWidget.touchMove(otherTouch, touchId2);
}

WidgetManager.prototype.touchStart = function(evt) {
    if (!this.isEditing) return;
    var touchPos = evt.getTouchPosition();
    var touchId = evt.getTouchId()
    var callback = function(widget, hit) {
        
        var widgetName = widget.getName();
        if (this.addedWidgetMap[widgetName] != true) {
            //add the widget
            this.isSaveable = true;
            this.addedWidgetMap[widgetName] = true;
            this.tempWidgetName = null;
            WM.updateButtonState()
            widget.onAdded()
            this.onAdded.trigger(widgetName)
        } else if (widget.checkRemoveTap(hit.position)) {
            //check remove 
            WM.onRemove(widgetName)
            return;
        } 
        
            
        this.currentWidget = widget;
        this.currentWidget.touchStart(touchPos, touchId)
        
        if (this.isEditor && this.addedWidgetMap[widgetName]) {
            this.touchCallback = function() {
               if (!this.twoFingerTouch) this.updateTwoFingerTouch(touchPos, touchId)
            } 
            this.touchDelay.reset(0.5)
        } 
        
    }
    
    this.findWidget(touchPos, callback);
}


WidgetManager.prototype.touchMove = function(evt) {
    var touchPos = evt.getTouchPosition();
    var touchId = evt.getTouchId()
    if (this.currentWidget && this.addedWidgetMap[this.currentWidget.getName()]) {
        if (this.isEditor && this.twoFingerTouch) this.updateTwoFingerTouch(touchPos, touchId);
        this.currentWidget.touchMove(touchPos, touchId);
    }
    this.touchDelay.reset(0.5)
}

WidgetManager.prototype.touchEnd = function(evt) {
    var touchPos = evt.getTouchPosition();
    var touchId = evt.getTouchId()
    if (this.currentWidget) {
        var numTouches = this.currentWidget.touchEnd(touchPos, touchId);
        if (numTouches == 0) this.currentWidget = null;
        if (this.twoFingerTouch && numTouches <= 1) {
            var touchId2 = parseInt(touchId) + 1;
            numTouches = this.currentWidget.touchEnd(touchPos, touchId2);
            this.twoFingerTouch = false;
            this.twoFingerPan = false;
            this.touchCallback = null;
            if (numTouches == 0) this.currentWidget = null;
            
            global.UIManager.updateTwoFingerTouch(new vec2(-1,-1), new vec2(-1,-1))
        }
    }
}

WidgetManager.prototype.selectWidget = function(index) {
    
    if (!this.initialized) return;
    var widgetName = null;
    if (index >= 0 && index < script.widgetCameras.length) {
        this.lastIndex = index;
        var widgetName = script.widgetCameras[index].getSceneObject().name;
        this.highlightedWidget = widgetName;
    }
    
    if (this.tempWidgetName != null && this.addedWidgetMap[this.tempWidgetName] != true) {
        //remove current temp widget
        this.destroyWidget(this.tempWidgetName)
    }
    if (widgetName && this.addedWidgetMap[widgetName] != true && this.tempWidgetName != widgetName && widgetName != null) {

        this.createWidget(widgetName)
    }
    
   
    this.updateButtonState()
    
    
}
WidgetManager.prototype.updateButtonState = function() {
    global.UIManager.setButtonState(this.isSaveable, this.isEditing)
        
}

WidgetManager.prototype.loopWidgets = function(callback) {
    var keyArr = Object.keys(this.widgetMap)
    for (var i=0; i<keyArr.length; i++) {
        var widgetName = keyArr[i];
        var widget = this.widgetMap[widgetName]
        var api = widget.getComponent("Component.ScriptComponent").api.widgetInterface
        callback.call(WM, api, widgetName)
    }
}

WidgetManager.prototype.onRestore = function() {
    var saveStr = this.store.getString(this.saveKey);
    
    var saveData = saveStr || '{}';
    this.isSaveable = saveStr != '';
    
    var saveObj = JSON.parse(saveData);
    var savedKeys = Object.keys(saveObj);
    for (var i=0; i<savedKeys.length; i++) {
        var key = savedKeys[i];
        if (this.cameraMap[key]) {
            var restoreData = saveObj[key];
            this.createWidget(key, restoreData)
        } else {
            print("WARNING: No camera found for saved widget '" + key + "'")
        }
    }
}

WidgetManager.prototype.onAnchorReset = function() {
    this.isEditing = true;
    script.widgetContainer.enabled = false;
    global.anchorManager.editAnchor()
    this.updateButtonState()
}



WidgetManager.prototype.onSave = function() {
    
    this.isEditing = false;
    this.isSaveable = false;
    global.anchorManager.showAnchor(false)
    this.selectWidget(-1);
    this.updateButtonState();
    var saveData = {}
    
    
    this.loopWidgets(function( api, widgetName ){ 
        
        saveData[api.getName()] = api.getData();  
        
        api.onSave() 
    })
    
    
    var saveStr = JSON.stringify(saveData);
    this.store.putString(this.saveKey, saveStr)
    
    
}



WidgetManager.prototype.onEdit = function() {
    this.isEditing = true;
    this.isSaveable = true;
    global.anchorManager.showAnchor(true)
    this.loopWidgets(function( api, widgetName ){ api.onEdit() })
    this.selectWidget(this.lastIndex);
}

WidgetManager.prototype.onRemove = function(widgetName) {
    this.destroyWidget(widgetName)
    this.isSaveable = true;
    this.addedWidgetMap[widgetName] = false;
    this.updateButtonState()
}

WidgetManager.prototype.getWidgetIndex = function(widgetName) {
    for (var i=0; i<script.widgetCameras.length; i++) {
        var camera = script.widgetCameras[i];
        if (!camera) continue;
        var cameraObj = camera.getSceneObject();
        if (cameraObj.name == widgetName) return i;
    }
    return 0;
}

WidgetManager.prototype.createWidget = function(widgetName, restoreData) {
    
    var widgetIndex = this.getWidgetIndex(widgetName);
    
    var prefab = script.widgetPrefab.instantiate(script.widgetContainer);
    this.widgetMap[widgetName] = prefab;
    prefab.enabled = true;
 
    var camera = this.cameraMap[widgetName];
    camera.getSceneObject().enabled = true;
    var config = camera.getSceneObject().getComponent("Component.ScriptComponent")
   
    var renderTarget = camera.colorRenderTargets[0];
    var api = prefab.getComponent("Component.ScriptComponent").api.widgetInterface;
    
    var mat = script.widgetMaterial.clone();
    mat.mainPass.baseTex = renderTarget.targetTexture;
    var widgetOptions = {
        name: widgetName,
        index: widgetIndex,
        material: mat,
        useEnvironmentLighting: config.useEnvironmentLighting,
        depth: config.widgetBorderDepth,
        borderSize: config.widgetBorderSize,
        borderRadius: config.widgetBorderRadius,
        borderColor: config.widgetBorderColor,
        transform: {}
        
    }
    
    if (restoreData) {
        widgetOptions.transform = {
            offset: new vec4(restoreData.x, restoreData.y, restoreData.xi, restoreData.yi),
            theta: restoreData.t,
            scale: new vec2(restoreData.w, restoreData.h)
        }
        this.addedWidgetMap[widgetName] = true;
        api.onAdded()
    } else {
        
        this.tempWidgetName = widgetName;
    }    
    
    api.initialize(widgetOptions);
}

WidgetManager.prototype.destroyWidget = function(widgetName){
    var widget = this.widgetMap[widgetName];
    var camera = this.cameraMap[widgetName];
    if (widgetName == this.tempWidgetName) this.tempWidgetName = null;
    camera.getSceneObject().enabled = false;
    widget.destroy()
    delete this.widgetMap[widgetName]
}

WidgetManager.prototype.setLoading = function(widgetName, isLoading, delayTime) {
    var widget = this.widgetMap[widgetName];
    if (widget) {
        var api = widget.getComponent("Component.ScriptComponent").api.widgetInterface;
        var delay = script.createEvent("DelayedCallbackEvent");
        delay.bind(function(){
            api.setLoading(isLoading);
        });
        delay.reset(delayTime || 0)
        
    }
}

WidgetManager.prototype.checkNoOverlap = function(toWidget, pos) {
 
    var size = global.anchorManager.anchorSize()
    var noOverlap = true;
    if (size) {
       this.loopWidgets(function( api, widgetName ){ 
            if (widgetName != toWidget) {
               
                var widget = this.widgetMap[widgetName];
                var widgetPos = widget.getTransform().getLocalPosition();
                //print(Math.min(size.x, size.y) - pos.distance(widgetPos))
                
                if (pos.distance(widgetPos) < Math.max(size.x, size.y) * 0.1) {
                    noOverlap = false;
                } 
            }
        }) 
    }
    
    
    return noOverlap;
}

WidgetManager.prototype.onWidgetResized = function(widgetName, newSize, touchEnded) {

    var camera = WM.cameraMap[widgetName];
    if (!camera) {
        //textLogger.log('no camera for: ' + widgetName)
        return;
    } 
    var renderTarget = camera.colorRenderTargets[0];    
    
    var ratio = newSize.y / newSize.x
    var width = 1024;
    var height = Math.floor(width * ratio / 4) * 4    
    var resolution = new vec2(width, height)
    renderTarget.targetTexture.control.resolution = resolution;
      
    camera.aspect = resolution.x/resolution.y;
    
}


var WM = new WidgetManager();
global.widgetManager = WM;

//entry points for button presses
script.api.onEdit = function(){ WM.onEdit.call(WM) };
script.api.onSave = function(){ WM.onSave.call(WM) };
script.api.onAnchorReset = function(){ WM.onAnchorReset.call(WM) };


