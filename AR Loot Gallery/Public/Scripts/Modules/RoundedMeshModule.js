/**
 * @name RoundedMeshModule
 * @author 2020CV Inc.
 * @version 1.0.1
 * @description 
 *    Builds 3D rectangular mesh with rounded corners

 * 
 * // Import module
 * const RoundedMesh = require("RoundedMeshModule");
 *
 * // Instantiate a RoundedMesh to be used
 * var roundedMesh = new RoundedMesh(script.getSceneObject(), options);
 */

var Builder = function(parent, options) {
    
    this.index = options.index;    
    
    //avoid z-fighting
    this.depth = options.depth + this.index * 0.1; 
    this.sceneObject = parent;
    
    this.borderRadius = options.borderRadius;
    
    
    this.numSides = Math.min(Math.floor(options.borderRadius*20 + 1) * 8, 40);
 
    this.texture = options.texture;
    this.textureSize = new vec2(options.texture.getWidth(), options.texture.getHeight())
    
    this.borderSize = options.borderSize;
    this.borderColor = options.borderColor;
    this.useEnvironmentLighting = options.useEnvironmentLighting;
    var collider = parent.createComponent("Physics.ColliderComponent");
    collider.shape = Shape.createBoxShape();
    //collider.debugDrawEnabled = true;
    this.collider = collider;
    this.renderToMesh = parent.createComponent("Component.RenderMeshVisual");
    this.renderToMesh.setRenderOrder(1)
    this.renderToMesh.mainMaterial = options.material.clone();
    this.mainPass = this.renderToMesh.mainMaterial.mainPass;
    this.mainPass.baseTex = this.texture;
    this.mainPass.opacity = 0;
    this.builder = this.createBuilder()

    this.targetPosition = vec3.zero();
    this.targetRotation = quat.fromEulerAngles(0,0,0);
    this.targetOpacity = 0;
    
    this.startPosition = options.startPosition || vec3.zero();
    this.startRotation = quat.fromEulerAngles(0,0,0);
    this.startOpacity = 0;
    var size = new vec2(1, this.textureSize.y/this.textureSize.x).uniformScale(options.width * 100.);
     
    
    this.sceneObject.getTransform().setWorldPosition(this.startPosition);
    this.resize(size)
}

Builder.prototype.easeToTarget = function(t) {
    var transform = this.sceneObject.getTransform();
    var newPosition = vec3.lerp(this.startPosition, this.targetPosition, t);
    var newRotation = quat.slerp(this.startRotation, this.targetRotation, t);
    transform.setWorldPosition(newPosition);
    transform.setWorldRotation(newRotation);
    
    this.mainPass.opacity = this.startOpacity * (1.0-t) + this.targetOpacity * t;
}

Builder.prototype.createBuilder = function() {
    var builder = new MeshBuilder([
        { name: "position", components: 3 },
        { name: "normal", components: 3, normalized: true }
    ]);
    builder.topology = MeshTopology.Triangles;
    builder.indexType = MeshIndexType.UInt16;
    return builder
}


Builder.prototype.clear = function() {
    var startIndex = 0
    var vertexCount = this.builder.getVerticesCount()
    var indexCount = this.builder.getIndicesCount()
    var vertexStart = startIndex * 2
    var indexStart = startIndex * 6
    if (vertexCount > 0 && indexCount > 0 && vertexStart < vertexCount && indexStart < indexCount) {
        this.builder.eraseVertices(vertexStart, vertexCount)
        this.builder.eraseIndices(indexStart, indexCount)
    } 
}



Builder.prototype.addVerts = function(x0, innerBorder, frontFacing) {
    var verts = []
    var hPI = Math.PI / 2.0;
        
    var scaleFactor = innerBorder ? 0.0 : 1.0;
    var w2 = this.width * scaleFactor/2;
    var h2 = this.height * scaleFactor/2;
    var r = this.borderRadius * Math.min(this.width,this.height) * 0.5 * scaleFactor;
    
  
    var corners = [
        new vec3(w2-r,h2-r,0),
        new vec3(-w2+r,h2-r,0),
        new vec3(-w2+r,-h2+r,0),
        new vec3(w2-r, -h2+r,0)
    ]
    
    var sidesPerCorner = (this.numSides)/4;
    for (var j=0; j < 4; j++) {
        for (var i=0; i<sidesPerCorner; i++) {
            
            var corner = corners[j]
            var angle = j * hPI + (i/(sidesPerCorner - 1)) * hPI
            var rcos = r*Math.cos(angle)
            var rsin = r*Math.sin(angle)
            
            var pc = new vec3(corner.x + rcos, corner.y + rsin, x0.z);
            var norm = frontFacing ? new vec3(0,0,1) : x0.sub(pc).normalize()
            verts = verts.concat([
                // Position          // Normal                      
                pc.x, pc.y, pc.z,    norm.x, norm.y, norm.z
            ])
           
        }
    }
  
    
     this.builder.appendVerticesInterleaved(verts);
     
}

Builder.prototype.addTriangles = function() {
    var count = this.builder.getVerticesCount();
        
    for (var i=0; i<this.numSides; i++) {
        var lastSide = i==this.numSides - 1 ? 0 : i + 1
        var v1 = count - this.numSides + i //8
        var v2 = v1 - this.numSides  //0
        var v3 = count - this.numSides + lastSide //9
        var v4 = v3 - this.numSides  //1
        this.builder.appendIndices([
            v1,v3,v2, // First Triangle
            v2,v4,v3 // Second Triangle
        ]);
    }
}

// resize the mesh
Builder.prototype.resize = function(newSize) {
    this.clear();
    var size = new vec2(newSize.x, newSize.y)
    
    var p1 = vec3.zero();
    var p2 = vec3.zero();
    p1.z = this.depth;
    
    this.width = size.x;
    this.height = size.y;

    //front face
    this.addVerts(p1, true, true)
    this.addVerts(p1, false, true) 
    this.addTriangles()
    
    //sides
    this.addVerts(p1)
    this.addVerts(p2)
    this.addTriangles()
    
    //back face
    this.addVerts(p2, false, true)
    this.addVerts(p2,true, true)
    this.addTriangles()
    
    this.update()
    this.mainPass.widgetSize = new vec3(size.x, size.y, this.depth);
  
    this.mainPass.borderRadius = this.borderRadius;
    this.mainPass.borderSize = this.borderSize;
    this.mainPass.borderColor = this.borderColor;
    this.mainPass.useEnvironmentLighting = this.useEnvironmentLighting;
    
}

Builder.prototype.setOpacity = function(opacity) {
    this.mainPass.opacity = opacity;
}


Builder.prototype.update = function() {
    if(this.builder.isValid()){
    
        this.renderToMesh.mesh = this.builder.getMesh();
        
        this.builder.updateMesh();
        var count = this.builder.getVerticesCount()
        
        
    }
    else{
        print("Mesh data invalid!");
    }

}



module.exports = Builder