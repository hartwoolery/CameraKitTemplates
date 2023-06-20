
//@input Component.ScriptComponent[] hints
//@input SceneObject carousel;
//@input Component.Text hintText;
//@input Asset.Material twoFingerTouchMaterial


var AM = global.anchorManager;
var WM = global.widgetManager;

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
    this.touchObjects = [script.carousel];
    
    
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
        if (callback && obj.getComponent("Component.ScreenTransform").containsScreenPoint(touchPos)) callback.call(api, touchPos)
       
    }
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

script.createEvent("UpdateEvent").bind(function() {
    //todo: have hints follow widget
})




global.UIManager = new UIManager();
var UI = global.UIManager;

