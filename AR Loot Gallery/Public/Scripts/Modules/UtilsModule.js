module.exports.transformToPixels = function(transform, camera) {
    var one = vec2.one();
    var bl = transform.localPointToScreenPoint(one.uniformScale(-1))
    var tr = transform.localPointToScreenPoint(one)
    var diff = bl.sub(tr);
    var rt = camera.renderTarget;
    var pixelSize = new vec2(Math.round(Math.abs(diff.x)*rt.getWidth()), Math.round(Math.abs(diff.y)*rt.getHeight()));
    return pixelSize;
}

module.exports.findCameraParent = function(obj) {
    while (obj.getParent() != undefined) {
        obj = obj.getParent();
        var camera = obj.getComponent("Component.Camera");
        if (camera) return camera;
    }
    return null;
}

module.exports.nameForTexture = function(texture) {
     var nameArr = texture.name.split("/")
     return nameArr[nameArr.length - 1].split('.')[0]
}

module.exports.mapTextures = function(textures) {
    var texMap = {}
    
    //map the texture names to their textures
    for (var i=0;i<textures.length; i++) {
        var texture = textures[i]
        var nameArr = texture.name.split("/")
        var name = nameArr[nameArr.length - 1].split('.')[0]
        texMap[name] = texture
    }
    return texMap;
}