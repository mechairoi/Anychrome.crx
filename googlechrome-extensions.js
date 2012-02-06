/*
 * JSDeferred Integration for GoogleChrome.
 * writtern By Yuichi Tateno <http://github.com/hotchpotch>.
 *
 * MIT License.
 *
 * examples:
 * Deferred.chrome.bookmarks.search('Google').next(function(r) {
 *     console.log(r); // BookmarkTreeNode
 * });
 *
 * Deferred.chrome.tabs.create({url: 'http://www.google.com/'}).next(function(tab) {
 *     console.log(tab); // Tab instance
 * });
 */

if (typeof Deferred.chrome == 'undefined')
(function(Deferred) {
    Deferred.chrome = {};

    Deferred.chrome.registers = function(name, hash) {
        var chromeTarget = chrome[name];
        if (!chromeTarget) return console.log('chrome.' + name + ' is not found.');
        if (typeof Deferred.chrome[name] == 'undefined') Deferred.chrome[name] = {};

        var target = Deferred.chrome[name];
        for (var key in hash) {
            if (!chromeTarget[key]) {
                console.log('chrome.' + name + '.' + key + ' is not found.');
                continue;
            }
            var t = hash[key];
            target[key] = Deferred.connect(chromeTarget[key], { target: chromeTarget, ok: t[0], ng: t[1] });
        }
    }

    Deferred.chrome.registers('bookmarks', {
        create      : [1],
        get         : [1],
        getChildren : [1],
        getRecent   : [1],
        getSubTree  : [1],
        getTree     : [0],
        move        : [2],
        remove      : [1],
        removeTree  : [1],
        search      : [1],
        update      : [2],
    });

    Deferred.chrome.registers('cookies', {
        get                : [1],
        getAll             : [1],
        getAllCookieStores : [0],
        remove             : [1],
        set                : [1],
    });

    Deferred.chrome.registers('extension', {
        sendRequest : [2],
    });

    Deferred.chrome.registers('history', {
        deleteAll   : [0],
        deleteRange : [1],
        getVisits   : [1],
        search      : [1],
    });

    Deferred.chrome.registers('management', {
        get                             : [1],
        getAll                          : [0],
        getPermissionWarningsById       : [1],
        getPermissionWarningsByManifest : [1],
        launchApp                       : [1],
        setEnabled                      : [2],
        uninstall                       : [1],
    });

    Deferred.chrome.registers('tabs', {
        captureVisibleTab : [2],
        connect           : [1],
        create            : [1],
        detectLanguage    : [1],
        executeScript     : [2],
        get               : [1],
        getCurrent        : [0],
        highlight         : [1],
        move              : [2],
        insertCSS         : [2],
        query             : [1],
        reload            : [2],
        remove            : [2],
        sendRequest       : [2],
        update            : [2],
    });

    Deferred.chrome.registers('windows', {
        create         : [1],
        get            : [1],
        getAll         : [1],
        getCurrent     : [0],
        getLastFocused : [0],
        remove         : [1],
        update         : [2],
    });

    Deferred.chrome.registers('i18n', {
        getAcceptLanguages : [0],
    });
})(Deferred);


