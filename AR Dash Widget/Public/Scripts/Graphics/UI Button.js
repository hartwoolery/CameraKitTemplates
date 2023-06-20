//@input float cornerRadiusPercent = 10 {"widget":"slider", "min":0.0, "max":100, "step":0.1}
//@input vec4 color = {0.5,0.5,0.5,1} {"widget":"color"}

//@input bool useImage
//@input Asset.Texture image {"showIf":"useImage"}

//@input Component.ScriptComponent callbackScript
//@input string callbackFunction

var findCameraParent = function(obj) {
    while (obj.getParent() != undefined) {
        obj = obj.getParent();
        var camera = obj.getComponent("Component.Camera");
        if (camera) return camera;
    }
    return null
}

var trans = script.getSceneObject().getComponent("Component.ScreenTransform")
var image = script.getSceneObject().getComponent("Component.Image")

image.enabled = false;


script.createEvent("OnStartEvent").bind(function(){
   
    var camera = findCameraParent(script.getSceneObject())
    var pixelSize = new vec2(0,0);
    if (camera){ 
        //for orthographic cameras
        if (!trans) {
            camera = null;
        } else {
            var one = vec2.one();
            var bl = trans.localPointToScreenPoint(one.uniformScale(-1))
            var tr = trans.localPointToScreenPoint(one)
            var diff = bl.sub(tr);
            var rt = camera.renderTarget;
       
            pixelSize = new vec2(Math.round(Math.abs(diff.x)*rt.getWidth()), Math.round(Math.abs(diff.y)*rt.getHeight()))
        }
 
        
    } 
    
    if (!camera) { 
        //for 3d cameras
        var size = script.getSceneObject().getTransform().getLocalScale();
        pixelSize = new vec2(size.x, size.y)
        
    }
    
 
    image.mainMaterial = image.mainMaterial.clone()
    image.mainPass.size = pixelSize;
    
    image.mainPass.useImage = script.useImage;
    image.mainPass.cornerRadius = script.cornerRadiusPercent/100;
    if (script.useImage) image.mainPass.baseTex = script.image;
    image.mainPass.bgColor = script.color;
    
    image.enabled = true;
  
})

script.api.onButtonPress = function() {
    
    if (script.callbackScript && script.callbackFunction && script.callbackScript.api[script.callbackFunction]) {
        script.callbackScript.api[script.callbackFunction]()
    }
}