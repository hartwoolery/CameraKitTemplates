
//@input SceneObject saveButton
//@input SceneObject editButton
//@input SceneObject anchorButton
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
    
    var editorHintScale = this.isEditor ? "\n\n(long press in widget corner for editor)" : ""
    var editorHintRotate = this.isEditor ? "\n\n(long press in widget center for editor)" : ""
    var draggingCarousel = false;
    
    // a list of items to check for the tutorial
    this.checks = [
        {name:"Swap Camera", hint:"Turn to the World Camera"}, 
        {name:"Scan World", hint:"Move your phone around to scan the room"}, 
        {name:"Find Anchor", hint:"Touch and drag on a vertical surface\nto create an anchor area"}, 
        {name:"Tap", hint:"Move phone to snap widget\n\nTap on it to add to the scene"}, 
        {name:"Scale", hint:"Pinch a widget with two fingers to scale it"+editorHintScale}, 
        {name:"Rotate", hint:"Rotate a widget with a two-finger swipe"+editorHintRotate}
    ];
    
    //clear the other manipulation keys if tutorial incomplete
    if (!this.checkstore("widget_rotated")) {
        this.store.putBool("widget_added", false)
        this.store.putBool("widget_scaled", false);
        this.store.putBool("widget_rotated", false);
    }
    
    //override UI touches
    global.touchSystem.touchBlocking = true

    // objects to check if touch event should bubble or not
    this.touchObjects = [ script.carousel,  script.editButton, script.saveButton, script.anchorButton ];
    
    //initialize touch indicator material
    this.updateTwoFingerTouch(new vec2(-1,-1), new vec2(-1,-1))
    
}

// visualizes the simulated two-finger touch in the editor
UIManager.prototype.updateTwoFingerTouch = function(touch1, touch2) {
    script.twoFingerTouchMaterial.mainPass.touch1 = touch1;
    script.twoFingerTouchMaterial.mainPass.touch2 = touch2;
}


UIManager.prototype.onWorldTrackingStarted = function() {
    UI.worldTrackingInitialized = true
    AM.editAnchor();
}

// updates the state of the UI buttons
UIManager.prototype.setButtonState = function(saveable, isEditing) {
    var hasAnchor = AM.hasAnchor();
    script.anchorButton.enabled = hasAnchor && isEditing
    script.editButton.enabled = !isEditing && this.tutorialComplete && hasAnchor;
    var shouldShowCarousel = isEditing && this.tutorialComplete && hasAnchor;
    
    //carousel has bug if disabled so we move off screen
    var anchors = script.carousel.getComponent("Component.ScreenTransform").anchors
    anchors.left = shouldShowCarousel ? -1 : 1;
    anchors.right = shouldShowCarousel ? 1 : 2;
    script.saveButton.enabled = saveable && this.tutorialComplete && hasAnchor;
}

// called when the carousel changes index
script.onCarouselIndexChange = function(index) {
    WM.selectWidget(index)
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
    
    script.hintText.text = check.hint
    return true;
}

UIManager.prototype.checkstore = function(key) {
    //print("key: " + key + ": " + this.store.getBool(key))
    return this.store.getBool(key) || this.testingUI
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
            case "Find Anchor":
                if (!AM.hasAnchor()) return this.showHint(check)
                break;
            case "Tap":
                if (!this.checkstore("widget_added")) return this.showHint(check);
                break;
            case "Scale":
                if (!this.checkstore("widget_scaled")) return this.showHint(check);
                break;
            case "Rotate":
                if (!this.checkstore("widget_rotated")) return this.showHint(check);
                break;
            
            default:
                break;
        }
        
    }
    this.showHint({name:'', hint:''})
    this.tutorialComplete = true;
    WM.updateButtonState() 
}

// determine if touch event should bubble up
UIManager.prototype.shouldIgnoreTouch = function(touchPos, type) {
    var dragging = type == "move";
    for (var i=0; i<this.touchObjects.length; i++) {
        var obj = this.touchObjects[i]
        
        if (obj.enabled) {
            var scr = obj.getComponent("Component.ScriptComponent");
            if (scr.disableInteractable && dragging) scr.disableInteractable();
            if (scr.enableInteractable && !dragging) scr.enableInteractable();
            if (!draggingCarousel) {
                if (scr.disableInteraction && dragging) scr.disableInteraction();
                if (scr.enableInteraction && !dragging) scr.enableInteraction();
            }
            
            var screenTransform = obj.getComponent("Component.ScreenTransform");
            
            if (screenTransform.containsScreenPoint(touchPos) && !dragging) {
                if (type == "end") {
                    var api = obj.getComponent("Component.ScriptComponent").api
                    if (api.onButtonPress) api.onButtonPress()
                } 
                return true;
            }
                
        }
    }
    return false;
}

script.createEvent("TouchStartEvent").bind(function(evt){
    var screenTransform = script.carousel.getComponent("Component.ScreenTransform")
    var touchPos = evt.getTouchPosition();
    draggingCarousel = screenTransform.containsScreenPoint(touchPos)
    if (UI.shouldIgnoreTouch.call(UI, touchPos,  "start")) return;
    if (AM.isEditingAnchor()) AM.touchStart.call(AM, evt);
    else WM.touchStart.call(WM, evt);
})

script.createEvent("TouchMoveEvent").bind(function(evt){
    if (UI.shouldIgnoreTouch.call(UI, evt.getTouchPosition(), "move")) return;
    if (AM.isEditingAnchor()) AM.touchMove.call(AM, evt);
    else WM.touchMove.call(WM, evt);
})

script.createEvent("TouchEndEvent").bind(function(evt){
    if (UI.shouldIgnoreTouch.call(UI, evt.getTouchPosition(), "end")) return;
    if (AM.isEditingAnchor()) AM.touchEnd.call(AM, evt);
    else WM.touchEnd.call(WM, evt);
    
})

script.createEvent("WorldTrackingMeshesUpdatedEvent").bind(function(){
    if (!UI.worldTrackingInitialized) {
        UI.onWorldTrackingStarted()
    }
})

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





// called when a widget has been added to the scene
WM.onAdded.add(function(widgetName){
    UI.store.putBool("widget_added", true);
    UI.updateUI.call(UI)
})

// called when a widget has been resized
WM.onResized.add(function(widgetName, newSize, touchEnded){
    if (touchEnded && UI.store.getBool("widget_added") == true) {
    
        UI.store.putBool("widget_scaled", true);
        UI.updateUI.call(UI)
    }
})

// called when a widget has been rotated
WM.onRotated.add(function(widgetName, newRotation, touchEnded){
   
    if (UI.store.getBool("widget_scaled") == true && touchEnded) {
        UI.store.putBool("widget_rotated", true);
        UI.updateUI.call(UI)
    }
})

// called when the anchor creation has begun
AM.onAnchorStarted.add(function(){
    UI.showHint.call(UI, {name:'', hint: ''})
})

// called when the anchor area has been created
AM.onAnchorCreated.add(function() {
    WM.initialize()
    UI.updateUI.call(UI)
})

// called when the anchor is reset
AM.onAnchorReset.add(function(){
    UI.updateUI.call(UI)
})

global.UIManager = new UIManager();
var UI = global.UIManager;

