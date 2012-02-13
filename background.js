(function() {

var extensionId = chrome.extension.getURL("").substr(19,32);

function isaArray(obj) {
    return typeof(obj) === 'object' && (obj instanceof Array);
}

var sources = {};
chrome.extension.onRequest.addListener(
    function(req, sender, sendResponse) {
        if (sender.id === extensionId) {
            if (req.type == "getPreviousFocusedWindowId") {
                getPreviousFocusedWindowId(sendResponse, req.excludeIds);
            } else if (req.type == "getSources") {
                sendResponse(
                    req.args.map(
                        function(x) {
                            return getSource(x[0], x[1]);
                        }
                    )
                );
            } else if (req.type == "defineSource") {
                // XXX onRequestExternal
                defineSource( sender.id, req.source );
                sendResponse( { result: "ok" } );
            } else {
                return;
            }
        } else {
        }
    }
);

function defineSource (sourceExtensionId, source) {
    source.extensionId = sourceExtensionId;
    if(typeof (sources[sourceExtensionId]) == 'undefined')
        sources[sourceExtensionId] = {};
    sources[sourceExtensionId][source.name] = source;
}
function getSource (sourceExtensionId, sourceName) {
    return sources[sourceExtensionId || extensionId][sourceName];
}

// Records focused windows.
var lastWindowIds = [];
chrome.windows.getAll(
    {},
    function(windows) {
        lastWindowIds = windows.map(function(w) { return w.id; });
        chrome.windows.onFocusChanged.addListener(
            function(id) {
                if (id > 0) {
                    lastWindowIds = lastWindowIds.filter(
                        function(x) { return x != id; }
                    );
                    lastWindowIds.unshift(id);
                }
            }
        );
    }
);

function getPreviousFocusedWindowId (callback, excludeIds) {
    var ids = lastWindowIds.splice(0); // clone
    var rec = function rec (){
        if(ids.length > 0)
            chrome.windows.get(
                ids.shift(),
                function(x){
                    if (typeof x === "undefined" ||
                        excludeIds.filter(
                            function(y){ return x.id == y; }
                        ).length > 0
                       )
                        return rec();
                    else
                        return callback(x.id);
                }
            );
        else callback(-1);
    };
    rec();
}

})();
