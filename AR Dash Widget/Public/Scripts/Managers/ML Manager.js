// -----JS CODE-----
// MLController.js
// Version: 0.0.1
// Event: Initialized
// Description: Manages Ml Controller input and ouput data
// Provides a getBoxes api that returns list of bounding boxes of detected objects 

//@input Component.DeviceTracking deviceTracking
// @input Component.MLComponent mlComponent
// @input int lostFramesThreshold = 3
// @input float matchingThreshold = 0.4
// @input float smoothing = 0.5;
//@input SceneObject lookHint

//@input Component.Camera camera
//@input SceneObject testPlane

// @input bool advanced = false
// @input string outputCls = "cls"   {"showIf":"advanced"}
// @input string outputLoc = "loc"   {"showIf":"advanced"}
//@input float confidenceThreshold = 0.45 {"showIf":"advanced"}
//@input float nmsThreshold = 0.45 {"showIf":"advanced"} 
//@input int topK = 10 {"showIf":"advanced", "hint" : "Filter only top_k boxes (before nms) with the highest confidence"}
// @input SceneObject loader {"showIf":"advanced"}



var maxKeepLength = 30;

var locData;
var classData;
var inputTransformer;
var anchors;
var all_scores;
var all_boxes;
var defaultAnchors = Rect.create(-100, -100, 0, 0);

var detectionBoxes = initDetectionBoxes(getMaxDetectionsCount())

if (!script.mlComponent) {
    debugPrint("Error, MLComponent is not set");
    return false;
}
if (!script.mlComponent.model) {
    debugPrint("Error, MLComponent model is not set");
    return false;
}

function initDetectionBoxes(count) {

    var boxes = [];
    for (var i = 0; i < count; i++) {
        boxes.push({
            screenTransform: script.getSceneObject().createComponent("Component.ScreenTransform"),
            isTracking: false,
            updated: false,
            lost_time: 0,
            cls: 0
        });
    }
    return boxes;
}


var mlcomponent = script.mlComponent;
mlcomponent.onLoadingFinished = wrapFunction(mlcomponent.onLoadingFinished, onLoadingFinished);


var updateEvent = script.createEvent("UpdateEvent");
updateEvent.bind(waitOnInitialized);


function waitOnInitialized() {
    if (!script.api.getDetections) return
    updateEvent.bind(onUpdate);
}

var hasTapped = false;
script.createEvent("TapEvent").bind(function() {
    hasTapped = true
})

function onUpdate() {
    if (hasTapped) return
    var detections = getDetections();
    var bestBox = getBestBox(detections.boxes, detections.scores);
    var diagonal = 0;
    if (bestBox) {
        var tvBounds = getTVBounds(bestBox.screenTransform.anchors)
        if (tvBounds) {
            diagonal = tvBounds.diagonal
            script.testPlane.enabled = diagonal >= 35;
        }
    }
}

var anchorToScreen = function(anchor) {
    var point = anchor.add(vec2.one()).uniformScale(0.5)
    point.y = 1 - point.y;
    return point
}




function getTVBounds(anchors) {
    
    var screenPos = anchorToScreen(anchors.getCenter());

    var l = anchors.left;
    var r = anchors.right;
    var t = anchors.top;
    var b = anchors.bottom;
    
    var tl = anchorToScreen(new vec2(l, t))
    var tr = anchorToScreen(new vec2(r, t))
    var bl = anchorToScreen(new vec2(l, b))
    var br = anchorToScreen(new vec2(r, b))
  
    var hitCenter = global.anchorManager.hitTest(screenPos)
    
    

    if (hitCenter) {
        var hitTL = intersectPlane(hitCenter,tl)
        var hitTR = intersectPlane(hitCenter,tr)
        var hitBL = intersectPlane(hitCenter,bl)
        var hitBR = intersectPlane(hitCenter,br)       
        if (hitTL && hitTR && hitBL && hitBR) {
            var newObj = script.testPlane;
            newObj.getTransform().setWorldPosition(hitCenter.pos);
            
            var axis = quat.angleAxis(Math.PI/2, new vec3(-1,0,0))
            var up = vec3.down()//.mult();
            var forwardDir = up.projectOnPlane(hitCenter.norm);
            var rot = quat.lookAt(forwardDir, hitCenter.norm);
            newObj.getTransform().setWorldRotation(rot.multiply(axis));
            
            var dx = hitTL.sub(hitTR).length;
            //assume 16:9 aspect ratio for TV
            
            var dy = dx * 0.5625;//hitTL.sub(hitBL).length;
            
            newObj.getTransform().setWorldScale(new vec3(dx,dy,1.).uniformScale(0.065))
            var diagonalInches = Math.sqrt(dx*dx + dy*dy) * 0.4;     
           
            return {
                corners: [hitTL, hitTR, hitBL, hitBR],
                center: hitCenter,
                normal: hitCenter.norm,
                diagonal: diagonalInches
            }
        }
        
        
    }
    return null;
}

function getBestBox(boxes, scores) {
    var active_tracklets = Array(detectionBoxes.length);
    var num_active = 0;
    var num_new = 0;
    var first_new = 0;
    var new_tracklets = Array(detectionBoxes.length);
    for (var j = 0; j < detectionBoxes.length; j++) {
        if (detectionBoxes[j].isTracking) {
            active_tracklets[num_active] = j;
            num_active++;
        }
        detectionBoxes[j].updated = false;
    }
    for (var i = 0; i < boxes.length; i++) {
        var temp;
        temp = Rect.create(0, 0, 0, 0);
        temp.left = boxes[i][0];
        temp.right = boxes[i][0] + boxes[i][2];
        temp.bottom = boxes[i][1];
        temp.top = boxes[i][1] + boxes[i][3];

        var best_tracklet_idx = -1;
        var best_iou = 0;
        for (var k = 0; k < num_active; k++) {
            if (active_tracklets[k] == -1) {
                continue;
            }
            var iou = computeMatchingScore(temp, detectionBoxes[active_tracklets[k]].screenTransform.anchors);
            if (iou > best_iou) {
                best_iou = iou;
                best_tracklet_idx = k;
            }
        }
        if (best_tracklet_idx == -1 || best_iou < script.matchingThreshold) {
            // Not matched to any existing tracklet => create a new one
            new_tracklets[num_new] = temp;
            num_new++;
        } else {
            var temp_idx = active_tracklets[best_tracklet_idx];
            detectionBoxes[temp_idx].screenTransform.anchors = lerpRect(detectionBoxes[temp_idx].screenTransform.anchors, temp, 1.0 - script.smoothing);
            detectionBoxes[temp_idx].isTracking = true;
            detectionBoxes[temp_idx].updated = true;
            detectionBoxes[temp_idx].lost_time = 0;
            active_tracklets[best_tracklet_idx] = -1;
        }
    }
    // remove all tracklets which weren't matched with any candidate detection
    for (var l = 0; l < detectionBoxes.length; l++) {
        if (!detectionBoxes[l].updated) {
            if (detectionBoxes[l].isTracking && detectionBoxes[l].lost_time < script.lostFramesThreshold) {
                detectionBoxes[l].lost_time++;
                continue;
            }
            if (num_new > 0) {
                num_new--;
                detectionBoxes[l].screenTransform.anchors = new_tracklets[first_new];
                first_new++;
                detectionBoxes[l].isTracking = true;
            } else {
                detectionBoxes[l].screenTransform.anchors = defaultAnchors;
                detectionBoxes[l].isTracking = false;
            }
            detectionBoxes[l].lost_time = 0;
        }
    }
    
    var bestBox = null;
    var bestSize = -1;
    var bestScore = 0;
    for (var k=0; k<detectionBoxes.length; k++) {
        var dim = detectionBoxes[k].screenTransform.anchors.getSize();
        var size = dim.x * dim.y;
        if (size>bestSize && detectionBoxes[k].isTracking) {
            bestBox = detectionBoxes[k];
            bestSize = size
            bestScore = scores[k]
        }
    }
    return bestBox;
}

function computeMatchingScore(box1, box2) {

    var xx1 = Math.max(box1.left, box2.left);
    var yy1 = Math.min(box1.top, box2.top);
    var xx2 = Math.min(box1.right, box2.right);
    var yy2 = Math.max(box1.bottom, box2.bottom);

    var area1 = (box1.right - box1.left) * (box1.top - box1.bottom);
    var area2 = (box2.right - box2.left) * (box2.top - box2.bottom);
    var inter = Math.max(0, xx2 - xx1) * Math.max(0, yy1 - yy2);

    return inter / (area1 + area2 - inter);
}

function lerpRect(a, b, t) {
    a.left = a.left + (b.left - a.left) * t;
    a.right = a.right + (b.right - a.right) * t;
    a.bottom = a.bottom + (b.bottom - a.bottom) * t;
    a.top = a.top + (b.top - a.top) * t;
    return a;
}

function onLoadingFinished() {

    var inputPlaceholder = mlcomponent.getInput("data");

    if (inputPlaceholder.texture == null) {
        debugPrint("Error, Set Input Texture on the ML Component");
        return;
    }

    try {
        classData = mlcomponent.getOutput(script.outputCls).data;
        locData = mlcomponent.getOutput(script.outputLoc).data;

    } catch (e) {
        debugPrint(e + ". Please set class and location output names to match model output names");
        return;
    }

    inputTransformer = inputPlaceholder.transformer;
    var shape = mlcomponent.getOutput(script.outputLoc).shape;
    computeAnchorCenters(shape.x, shape.y);

    script.api.getDetections = getDetections;
    script.api.getMaxDetectionsCount = getMaxDetectionsCount;

    if (script.loader) {
        script.loader.enabled = false;
    } else {
        //debugPrint("Warning, please set Loader SceneObject");
    }
    
    mlcomponent.runScheduled(true, MachineLearning.FrameTiming.Update, MachineLearning.FrameTiming.Update);

}

function getDetections() {
    return postprocessDetections(classData, locData, script.confidenceThreshold, script.nmsThreshold, script.topK);
}

function getMaxDetectionsCount() {
    return Math.max(script.topK, maxKeepLength);
}

//helper functions

function debugPrint(text) {
    print("MLController, " + text);
}

function wrapFunction(origFunc, newFunc) {
    if (!origFunc) {
        return newFunc;
    }
    return function() {
        origFunc();
        newFunc();
    };
}
//detection postprocessing functions 

function computeAnchorCenters(width, height) {
    /*Compute anchors for the given image size and settings.
    Returns:
        anchors (num_anchors, 2): The anchor boxes represented as [[center_x, center_y]].
    */
    anchors = Array(width * height);
    var i = 0;
    for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
            var cx = (x + 0.5) / width;
            var cy = (y + 0.5) / height;
            anchors[i] = [cx, cy];
            i++;
        }
    }

    all_boxes = Array(anchors.length);
    all_scores = Array(anchors.length);
}

function get_item(x, i) {
    return [x[i * 4], x[i * 4 + 1], x[i * 4 + 2], x[i * 4 + 3]];
}

function transformPoint(x, y, mat) {
    var v = new vec3(x, y, 1);
    var x1 = mat.column0.dot(v);
    var y1 = mat.column1.dot(v);
    return new vec2(x1, y1);
}

function postprocessDetections(cls_out, loc_out, score_thresh, nms_thresh, top_k) {
    /*Process predicted loc/cls back to real box locations.
    Args:
        model_out: (dict) ouputs from mlcomponent.data.
        score_thresh: (float) threshold for object confidence score.
        nms_thresh: (float) threshold for box nms.
        top_k: (int) filter only top_k boxes (before nms) with the highest confidence
    Returns:
        result: (dict) {boxes, scores}.
    */
    

    var num_candidates = 0;
    for (var j = 0; j < anchors.length; j++) {
        var score = cls_out[j];
        if (score > score_thresh) {
            var box1 = get_item(loc_out, j);
            var anchor1 = anchors[j];
            var bx = anchor1[0] + box1[0];
            var by = anchor1[1] + box1[1];
            var bw = box1[2] * 0.5;
            var bh = box1[3] * 0.5;

            all_boxes[num_candidates] = [bx - bw, by - bh, bx + bw, by + bh];
            all_scores[num_candidates] = score;
            num_candidates++;
        }
    }

    var nms_res = nms(all_boxes.slice(0, num_candidates), all_scores.slice(0, num_candidates), nms_thresh, top_k);
    var keep = nms_res["keep"];
    var num_kept = nms_res["num_kept"];
    var boxes = Array(num_kept);
    var scores = Array(num_kept);

    
    
    for (var k = 0; k < num_kept; k++) {
        var box0 = all_boxes[keep[k]];
        var x = Math.max(Math.min(1, 2 * box0[0] - 1), -1);
        var y = Math.max(Math.min(1, 1 - (2 * box0[3])), -1);
        var w = Math.max(Math.min(2, 2 * (box0[2] - box0[0])), 0) * 0.5;
        var h = Math.max(Math.min(2, 2 * (box0[3] - box0[1])), 0) * 0.5;
        
        var topLeft = transformPoint(x - w, y - h, inputTransformer.inverseMatrix);
        var bottomRight = transformPoint(x + w, y + h, inputTransformer.inverseMatrix);

        x = (topLeft.x + bottomRight.x) * 0.5;
        y = (topLeft.y + bottomRight.y) * 0.5;
        w = bottomRight.x - topLeft.x;
        h = bottomRight.y - topLeft.y;

        boxes[k] = [x, y, w, h];
        
        scores[k] = all_scores[keep[k]];
    }
    
    var result = { boxes: boxes, scores: scores };
 
    return result;
}

// nms algorithm implementation




function nms(boxes, scores, threshold, top_k) {
    /*Non maximum suppression.

    Args:
      bboxes: (array) bounding boxes, sized [N,4].
      scores: (array) confidence scores, sized [N].
      threshold: (float) overlap threshold
      top_k: (int) return no more than min(30, top_k) indices.

    Returns:
      keep: (array) selected indices.
    */
    var indexOfArea = 4;
    var indexOfBox = 6;

    var keep = Array(Math.min(top_k, maxKeepLength));

    var idx = Array(scores.length);  // Array [x1, y1, x2, y2, areas, score, index]
    for (var i = 0; i < scores.length; i++) {
        var box = boxes[i];
        idx[i] = [box[0], box[1], box[2], box[3], (box[2] - box[0]) * (box[3] - box[1]),
            scores[i], i];  // Add index column for later usage
    }
    idx.sort(function(a, b) {
        return a[5] - b[5]; 
    });  // Sort in ascending order
    var last;
    var num_kept = 0;
    var idx_len = idx.length;
    while (idx_len > 0) {
        // Select element with the highest score
        idx_len--;
        last = idx[idx_len];
        keep[num_kept] = last[indexOfBox];
        num_kept++;
        if (num_kept > maxKeepLength || num_kept == top_k) {
            break;
        }
        if (idx_len == 0) {
            break;
        }
        // Remove all bboxes with higher threshold
        var counter = 0;
        for (var j = 0; j < idx_len; j++) {
            var row = idx[j];
            var xx1 = Math.max(last[0], row[0]);
            var yy1 = Math.max(last[1], row[1]);
            var xx2 = Math.min(last[2], row[2]);
            var yy2 = Math.min(last[3], row[3]);

            var inter = Math.max(0, xx2 - xx1) * Math.max(0, yy2 - yy1);

            var overlap = inter / (row[indexOfArea] + last[indexOfArea] - inter);
            if (overlap < threshold) {
                idx[counter] = row;
                counter++;
            }
        }
        idx_len = counter;
    }
    return { "keep": keep, "num_kept": num_kept };
}