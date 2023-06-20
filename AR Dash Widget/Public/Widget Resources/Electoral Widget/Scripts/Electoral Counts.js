// @input Asset.RemoteServiceModule remoteServiceModule
// @input SceneObject[] candidates

//@input Asset.Texture[] assets


var texMap = {}

//map the logo names to their textures
for (var i=0;i<script.assets.length; i++) {
    var tex = script.assets[i]
    var nameArr = tex.name.split("/")
    var name = nameArr[nameArr.length - 1].split('.')[0]
    texMap[name] = tex
}

// Import module
const Module = require("./Placeholder API Module"); //replace this with 
const ApiModule = new Module.ApiModule(script.remoteServiceModule);

//this is just used to simulate a loading delay for a remote API call.
//set the value to 0 with real API calls
var mockDelayTime = 1.0


var parent = script.getSceneObject();
var parentWidgetName = global.widgetManager.getParentWidgetName(parent);

var startTime = getTime()


function remoteCallback(isError, data) {
    if (!isError) {
        global.widgetManager.setLoading(parentWidgetName, false, mockDelayTime);
        
        updateCounts(data)
        
        //update every 5 seconds
        delay.reset(5)
    }
}

var loadData = function() {
    ApiModule.test_electoral_counts(remoteCallback);
}

var delay = script.createEvent("DelayedCallbackEvent")
delay.bind(loadData)


//this event is triggered when the widget is ready
var onInitialized = function(widgetName) {
    //make sure the widget name matches!
    if (widgetName != parentWidgetName) return
    
    
    global.widgetManager.setLoading(widgetName, true);
    
    loadData()
    
}


//this event is triggered when the widget is resized
var onResized = function(widgetName, newSize){
    
    //make sure the widget name matches!
    if (widgetName != parentWidgetName) return
    
}

var updateCounts = function(data) {
    var countOffset = Math.floor(Math.random() * 4)
    var swayFactor = Math.random() > 0.5 ? -1 : 1;
    
    for (var i=0; i<2; i++) {
        var rowData = data[i]
        var candidate = script.candidates[i];
        var profileImage = candidate.getChild(0).getComponent("Component.Image");
        var countText = candidate.getChild(1).getComponent("Component.Text");
        var nameText = candidate.getChild(2).getComponent("Component.Text");
        
        //simulate a changing count total        
        var sway = i == 0 ? swayFactor : swayFactor * -1
        var count = rowData.count + (countOffset * sway);
        
        profileImage.mainPass.baseTex = texMap[rowData.name];
        countText.text = count.toString();
        nameText.text = rowData.name.toUpperCase();
        
    }
}

global.widgetManager.onInitialized.add(onInitialized);
global.widgetManager.onResized.add(onResized);