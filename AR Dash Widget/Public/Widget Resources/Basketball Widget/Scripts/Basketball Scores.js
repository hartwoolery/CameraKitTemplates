
// @input Asset.RemoteServiceModule remoteServiceModule
// @input Component.Text[] namesText
//@input Asset.Texture[] logos


var texMap = {}

//map the logo names to their textures
for (var i=0;i<script.logos.length; i++) {
    var tex = script.logos[i]
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
        
        setupRows(data)
        
        //update every 5 seconds
        delay.reset(5)
    }
}

var loadData = function() {
    ApiModule.test_live_basketball_scores(remoteCallback);
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

global.widgetManager.onInitialized.add(onInitialized);
global.widgetManager.onResized.add(onResized);


/*
//team and score data, the team names map to the script.logos names
var rowData = [
    {home:'team-1', away:'team-2', score:'84-79', quarter:'3rd', clock:'8:21', shot:':15'},
    {home:'team-3', away:'team-4', score:'55-62', quarter:'2nd', clock:'2:45', shot:':24'},
    {home:'team-5', away:'team-6', score:'105-99', quarter:'4th', clock:'7:12', shot:':13'}
]*/


var percentToTransform = function(val) {
    return -2.0 * val + 1.0; 
}

var setupRows = function(rowData) {
    var numRows = rowData.length;
   
    
    //remove excess rows
    while (parent.getChildrenCount() > Math.max(numRows, 1)) {
        parent.getChild(1).destroy()
    }
    
    //create rows from template
    while (parent.getChildrenCount() < numRows) {
        parent.copyWholeHierarchy(parent.getChild(0))
    }    
    
    for (var i=0; i<numRows; i++) {
        
        var row = parent.getChild(i);
        var imgBackground = row.getComponent("Component.Image");
        var scoreText = row.getChild(0).getComponent("Component.Text")
        var time = row.getChild(2).getComponent("Component.Text")
        var away = row.getChild(3).getComponent("Component.Image")
        var home = row.getChild(4).getComponent("Component.Image")  
       
        away.mainMaterial = away.mainMaterial.clone()    
        home.mainMaterial = home.mainMaterial.clone()    
        
        imgBackground.mainMaterial = imgBackground.mainMaterial.clone()
        var rowColor = i % 2 == 0 ? 0.4 : 0.3
        
        imgBackground.mainPass.baseColor = new vec4(rowColor,rowColor,rowColor,1)
       
        var data = rowData[i];
      
        
        var homeScore = data.home.score;
        var awayScore = data.away.score;
        
        //simulate score growing over time
        var dt = getTime() - startTime;
        var pointsAdded = Math.floor(dt*0.04);
        homeScore += pointsAdded;
        awayScore += pointsAdded;
        
        //simulate clock going down:
        var totalTime = data.time.mins * 60 + data.time.secs;
        totalTime -= Math.floor(dt);
        totalTime = Math.max(totalTime, 0);
        data.time.mins = Math.floor(totalTime/60);
        data.time.secs = totalTime % 60;
        
        scoreText.text = awayScore + '-' + homeScore;
        home.mainPass.baseTex = texMap[data.home.name];
        away.mainPass.baseTex = texMap[data.away.name];
        
        //simulate random shot clock
        data.time.shot = Math.round(Math.random() * 24);
        
        if (data.time.secs < 10) data.time.secs = '0' + data.time.secs;
        if (data.time.shot < 10) data.time.shot = '0' + data.time.shot;
        
        time.text = data.time.quarter + '    ' + data.time.mins + ':' + data.time.secs + '    :' + data.time.shot
    }
    updateLayout()
}

var updateLayout = function() {
    var numRows = parent.getChildrenCount();
    var rowHeight = 1.0/numRows;
    for (var i=0; i<numRows; i++) {
        var row = parent.getChild(i);
        var rowAnchors = row.getComponent("Component.ScreenTransform").anchors;
        rowAnchors.bottom = percentToTransform((i+1) * rowHeight);
        rowAnchors.top = percentToTransform(i * rowHeight);
        
        
        
    }
}
