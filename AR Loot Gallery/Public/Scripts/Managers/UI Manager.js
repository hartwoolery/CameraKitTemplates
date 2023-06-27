//@input Component.ScriptComponent[] hints
//@input SceneObject carousel;
//@input SceneObject arrangeControl;
//@input Component.Text hintText;
//@input Asset.Texture[] arrangeIcons;

//@input SceneObject infoControl

//@input Component.Camera orthoCamera


var Utils = require("./UtilsModule");

var UIManager = function() {
    this.isEditor = global.deviceInfoSystem.isEditor();
    this.testingUI = false;//this.isEditor;
    
    this.store = global.persistentStorageSystem.store
    this.isFrontCamera = true;
    this.tutorialComplete = false;
    this.worldTrackingInitialized = false;
    
    
    // a list of items to check for the tutorial
    this.checks = [
        {name:"Swap Camera", hint:"Turn to the World Camera"}, 
        {name:"Scan World", hint:"Move your phone around to scan the room"}, 
       
    ];
    
    //override UI touches
    global.touchSystem.touchBlocking = true

    // objects to check if touch event should bubble or not
    this.touchObjects = [script.carousel, script.arrangeControl];
    
}

UIManager.prototype.showInterface = function(doShow) {
    script.arrangeControl.enabled  = doShow;
    script.carousel.enabled = doShow;
}

UIManager.prototype.setupBackground = function(obj, color, size) {
    var bg = obj.getComponent("Component.Image");
    bg.mainMaterial = bg.mainMaterial.clone();
    var pass = bg.mainMaterial.mainPass;
    pass.bgColor = color;
    pass.cornerRadius = 0.05;
    pass.useImage = false;
    pass.size = size;
    bg.enabled = true;
}

UIManager.prototype.setupControls = function(){
    var interface = script.arrangeControl.getComponent("Component.ScriptComponent").api.interface
    if (interface.items.length > 0) return;
    
    var buttons = [];
    for (var i=0; i<script.arrangeIcons.length; i++) {
        var texture = script.arrangeIcons[i];
        buttons.push({
            isSelected: i == 0,
            texture: texture,
            type: Utils.nameForTexture(texture)
        })
    }
    interface.addItems(buttons);
    
    var transform = script.arrangeControl.getComponent("Component.ScreenTransform");
    var controlSize = Utils.transformToPixels(transform, script.orthoCamera);
    this.setupBackground(script.arrangeControl, new vec4(0.5, 0.5, 0.5, 0.8), controlSize);
    
    var canvas = script.infoControl.getComponent("Component.Canvas");
    this.setupBackground(script.infoControl.getChild(0), new vec4(0.25, 0.25, 0.29, 1.0), canvas.getSize())
    
}

// shows/hides the tutorial hints on screen
UIManager.prototype.showHint = function(check) {
    
    for (var i=0; i<script.hints.length; i++) {
        var hint = script.hints[i];
       
        if (hint.getSceneObject().name == "Find Anchor") hint.getSceneObject().getChild(0).enabled = check.name == "Find Anchor"
        if (check.name == hint.getSceneObject().name) {
            
            hint.showHint()
            
        } else {
            
            hint.hideHint()
        }
    }
    
    if (script.hintText) script.hintText.text = check.hint
    return true;
}


UIManager.prototype.updateUI = function() {
    
    for (var i=0; i<this.checks.length; i++) {
        var check = this.checks[i];
        switch(check.name) {
            case "Swap Camera":
                if (this.isFrontCamera) return this.showHint(check);
                break;
            case "Scan World":
                if (!this.worldTrackingInitialized) return this.showHint(check);
                break;

            
            default:
                break;
        }
        
    }
    this.showHint({name:'', hint:''})
    this.tutorialComplete = true;
    
}

var checkTouch = function(evt) {
    var touchPos = evt.getTouchPosition();
    var eventType = evt.getTypeName();
    var type = eventType == "TouchStartEvent" ? "onTouchStart" : (eventType == "TouchMoveEvent" ? "onTouchMove" : "onTouchEnd");

    for (var i=0; i<UI.touchObjects.length; i++) {
        var obj = UI.touchObjects[i];
        var api = obj.getComponent("Component.ScriptComponent").api.interface;
        var callback = api[type];
        var intersects = api.containsScreenPoint != undefined && api.containsScreenPoint.call(api, touchPos);
        if (callback && intersects) {
            return callback.call(api, touchPos);
        } 
       
    }
    
    global.galleryManager[type].call(global.galleryManager, touchPos);
}



script.createEvent("TouchStartEvent").bind(checkTouch)

script.createEvent("TouchMoveEvent").bind(checkTouch)

script.createEvent("TouchEndEvent").bind(checkTouch)

script.createEvent("CameraFrontEvent").bind(function(){
    UI.isFrontCamera = true
    UI.updateUI.call(UI)
    
})

script.createEvent("CameraBackEvent").bind(function(){
    UI.isFrontCamera = false
    if (UI.testingUI) UI.onWorldTrackingStarted()
    UI.updateUI.call(UI)
})





var UI = new UIManager();
global.UIManager = UI;
