
module.exports.findCameraParent = function(obj) {
    while (obj.getParent() != undefined) {
        obj = obj.getParent();
        var camera = obj.getComponent("Component.Camera");
        if (camera) return camera;
    }
    return null;
}