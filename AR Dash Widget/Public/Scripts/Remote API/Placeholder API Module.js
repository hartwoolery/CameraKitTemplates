/* // NOTE: This file contains code for accessing an external API encapsulated as a JS module. You should not modify this file.
 * // Instead, you should modify the "Placeholder API" script and access the functions through the imported class wrapper.
*/

/*
 * @param {RemoteApiResponse} response A raw API response from an Placeholder API
 * @param {function} cb A callback to call with error and result data once the response has been parsed and error checked
 *
*/
function handleAPIResponse(response, cb) {
    
    if (response.statusCode !== 1) {
        var errorMessage = getErrorMessage(response);
        print(errorMessage);
        
        cb(true, errorMessage);
    } else {
        try {
            var parsedBody = JSON.parse(response.body);
        } catch (e) {
            var errorMessage = "ERROR: Failed to parse response";
            print(errorMessage);
            if (cb) {
                cb(true, errorMessage);
            }
            return;
        }
        if (cb) {
            cb(false, parsedBody);
        }
    }
}
function getErrorMessage(unparsedResponse) {
 
    var bugText = " - Please report this as a bug.";
    var errorMessage = "API Call Error - " + getErrorCodeMessage() + ": " + unparsedResponse.body;
    return errorMessage;

    // https://docs.snap.com/api/lens-studio/Classes/ScriptObjects/#RemoteApiResponse--statusCode
    function getErrorCodeMessage() {
        switch(unparsedResponse.statusCode) {
            case 0: return "Unknown Status Code"+bugText;
            case 1: return "Success";
            case 2: return "Redirected";
            case 3: return "Bad Request";
            case 4: return "Access Denied";
            case 5: return "Api Call Not Found";
            case 6: return "Timeout";
            case 7: return "Request Too Large";
            case 8: return "Server Processing Error";
            case 9: return "Request cancelled by caller";
            case 10: return "Internal: Framework Error";
        }
    }
}


function ApiModule(remoteServiceModule) {
    this.remoteServiceModule = remoteServiceModule;
    this.remoteServiceModule = {
        performApiRequest: function(req, res) { 
            res({statusCode: 1, body: '{}'}) 
        }
    }
    
    this.mockDelayTime = 0.0;
 
}

function setParameter(paramKey, paramValue, parameters, isOptional) {
    if (paramValue != null) {
        parameters[paramKey] = paramValue;
    } else if (paramValue == null && !isOptional) {
        throw (paramKey + " is a required parameter. Please input a valid value.");
    }
}


ApiModule.prototype.test_boxing_match_statistics = function(match_id, cb) {
    var req = {}; //global.RemoteApiRequest.create();
    req.endpoint = "test";
    var parameters = {};
    setParameter("match_id", match_id, parameters, false);
    req.parameters = parameters;
    
    
    this.remoteServiceModule.performApiRequest(req, function(response) {
     
        if(cb) {
            response.body = '{"matchup":[{"name":"Roger Calderon","country":"Russia","age": 30, "record":"26-0-0","ko":8,"height":"5-10","reach":"70 inches","stance":"orthodox"},{"name":"Bradley O\'Gallagher","country":"Ireland", "age": 30, "record":"21-3-0","ko":18,"height":"5-9","reach":"74 inches","stance":"southpaw"}]}'
            handleAPIResponse(response, cb)
        }
    });
};

ApiModule.prototype.test_live_basketball_scores = function(cb) {
    var req = {}; //global.RemoteApiRequest.create();
    req.endpoint = "test";
  
    this.remoteServiceModule.performApiRequest(req, function(response) {
        if(cb) {
            response.body = '[{"home":{"name":"team-1","score":79},"away":{"name":"team-2","score":84},"time":{"quarter":"3rd","mins":8,"secs":7,"shot":15}},{"home":{"name":"team-3","score":55},"away":{"name":"team-4","score":62},"time":{"quarter":"2nd","mins":2,"secs":45,"shot":5}},{"home":{"name":"team-5","score":99},"away":{"name":"team-6","score":105},"time":{"quarter":"4th","mins":7,"secs":12,"shot":13}}]'
          
            handleAPIResponse(response, cb)
        }
    });
};

ApiModule.prototype.test_electoral_counts = function(cb) {
    var req = {}; //global.RemoteApiRequest.create();
    req.endpoint = "test";
  
    this.remoteServiceModule.performApiRequest(req, function(response) {
     
        if(cb) {
            response.body = '[{"name": "Ford", "count": 224, "party":"Left"}, {"name": "Adler", "count": 213, "party":"Right"}]'
            handleAPIResponse(response, cb)
        }
    });
};

module.exports.ApiModule = ApiModule;
