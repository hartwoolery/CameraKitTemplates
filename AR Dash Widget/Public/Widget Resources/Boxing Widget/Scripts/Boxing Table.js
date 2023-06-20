// @input Asset.RemoteServiceModule remoteServiceModule
// @input Component.Text[] namesText
// @input Component.Image[] profileImages
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

function remoteCallback(isError, data) {
    if (!isError) {
        global.widgetManager.setLoading(parentWidgetName, false, mockDelayTime);
        setupRows(data)
    }
}


//this event is triggered when the widget is ready
var onInitialized = function(widgetName) {
    //make sure the widget name matches!
    if (widgetName != parentWidgetName) return
    
    
    global.widgetManager.setLoading(widgetName, true);
    var matchId =  "test_match_123";
    
    ApiModule.test_boxing_match_statistics(matchId, remoteCallback);
    
}


//this event is triggered when the widget is resized
var onResized = function(widgetName, newSize){
    
    //make sure the widget name matches!
    if (widgetName != parentWidgetName) return
    
}

global.widgetManager.onInitialized.add(onInitialized);
global.widgetManager.onResized.add(onResized);


var rowFields = ["country", "age", "record", "ko", "height", "reach", "stance"]

var percentToTransform = function(val) {
    return -2.0 * val + 1.0; 
}

var setupRows = function(rowData) {
    var numRows = rowFields.length;
   
    //remove excess rows
    while (parent.getChildrenCount() > Math.max(numRows, 1)) {
        parent.getChild(1).destroy()
    }
    
    //create rows from template
    while (parent.getChildrenCount() < numRows) {
        parent.copyWholeHierarchy(parent.getChild(0))
    }   
    
       
    var dataLeft = rowData.matchup[0];
    var dataRight = rowData.matchup[1];
    
    script.profileImages[0].mainPass.baseTex = texMap[dataLeft.name];
    script.profileImages[1].mainPass.baseTex = texMap[dataRight.name];
    
    script.namesText[0].text = dataLeft.name.replace(" ", "\n");
    script.namesText[1].text = dataRight.name.replace(" ", "\n");
    
    for (var i=0; i<numRows; i++) {
        
        var row = parent.getChild(i);
        
        var left = row.getChild(0).getComponent("Component.Text")
        var middle = row.getChild(1).getComponent("Component.Text")
        var right = row.getChild(2).getComponent("Component.Text")  
       
        left.text = dataLeft[rowFields[i]].toString().toUpperCase();
        middle.text = rowFields[i].toUpperCase();
        right.text = dataRight[rowFields[i]].toString().toUpperCase();
    }
    
    updateLayout()
}

var updateLayout = function() {
    var numRows = rowFields.length;
    var rowHeight = 1.0/numRows;
    for (var i=0; i<numRows; i++) {
        var row = parent.getChild(i);
        var rowAnchors = row.getComponent("Component.ScreenTransform").anchors;
        rowAnchors.bottom = percentToTransform((i+1) * rowHeight);
        rowAnchors.top = percentToTransform(i * rowHeight);
        
        
    }
}

