//@input float thickness = 2 {"widget":"slider", "min":0.0, "max":10, "step":0.1}
//@input float paddingPercent = 0.05 {"widget":"slider", "min":0.0, "max":1.0, "step":0.01}
//@input vec4 color = {0.5,0.5,0.5,1} {"widget":"color"}


var findCameraParent = function(obj) {
    while (obj.getParent() != undefined) {
        obj = obj.getParent();
        var camera = obj.getComponent("Component.Camera");
        if (camera) return camera;
    }
    return null
}

script.createEvent("OnStartEvent").bind(function(){
    var camera = findCameraParent(script.getSceneObject())
    if (!camera){
        print("No camera parent found for Divider object")
        return;
    } 
    var trans = script.getSceneObject().getComponent("Component.ScreenTransform")
    
    var one = vec2.one();
    var bl = trans.localPointToScreenPoint(one.uniformScale(-1))
    var tr = trans.localPointToScreenPoint(one)
    var diff = bl.sub(tr);
    var rt = camera.renderTarget;
    var pixelSize = new vec2(Math.round(Math.abs(diff.x)*rt.getWidth()), Math.round(Math.abs(diff.y)*rt.getHeight()))
    
    
    var image = script.getSceneObject().getComponent("Component.Image")
    image.mainMaterial = image.mainMaterial.clone()
    image.mainPass.size = pixelSize;
    image.mainPass.thickness = script.thickness;
    image.mainPass.padding = script.paddingPercent
    
    image.mainPass.bgColor = script.color;
})