//@input Asset.Texture carouselImage
// @input Asset.RemoteServiceModule remoteServiceModule

//@input float widgetBorderDepth = 3 {"widget":"slider", "min":0.0, "max":10, "step":0.1}
//@input float widgetBorderSize = 3 {"widget":"slider", "min":0.0, "max":10, "step":0.1}
//@input float widgetBorderRadius = 3 {"widget":"slider", "min":0.0, "max":10, "step":0.1}
//@input vec4 widgetBorderColor = {0.8,0.8,0.8,1.0} {"widget":"color"}

//@input bool useEnvironmentLighting = true

if (!script.carouselImage) {
    print("WARNING: Please set carousel image in the Inspector for: " + script.getSceneObject().name)
}