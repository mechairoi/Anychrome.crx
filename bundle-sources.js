/*
 * Anychrome.crx
 * writtern By Takaya Tsujikawa <http://github.com/mechairoi>.
 *
 * Released under the MIT License
 */

Anychrome.defineSource ({
    name: "tab",
    title: "Tab",
    candidates: function (callback) {
        chrome.tabs.query({}, callback);
    },
    candidatesTransformer: function (callback, tabs) {
        callback(
	    tabs.map(
		function(tab) {
		    return {
			id : tab.id.toString(),
			element : $("<li>").addClass("nowrap").append(
			    $('<img>').addClass('favicon').attr({"src": tab.favIconUrl, width: "16px", height: "16px"}),
			    $('<span>').text(tab.title),
			    $('<span>').addClass('url').text(
				tab.url.match("^http://") ? tab.url.substr(7) : tab.url
			    )
			)[0],
			entity: tab
		    };
		}
	    )
	);
    },
    actions: [
        {
            name: "Switch",
            fn  : function (tabs) {
                chrome.tabs.update(tabs[0].id, { selected : true });
            }
        },
        {
            name: "Close",
            fn  : function (tabs) {
                tabs.forEach(function(tab) { chrome.tabs.remove(tab.id, function () {} ); });
            }
        }
    ],
    regex: true,
    migemo: 3
});

var days = {day:[0, 1], week: [1, 7], month: [7, 31]};
for (var name in days) {
Anychrome.defineSource ({
    name: "history_" + name,
    title: "History " + name,
    delayed: 0.1,
    requiresPattern: 3, // XXX not implemented
    // migemo: 3,
    // regex: true,
    candidates: function(callback, query) {
        // var has_non_letter = XRegExp("\\p{^L}");
        chrome.history.search(
            {
                // text: regs.map(function(reg) { return reg.source; } ).join(" "),
                // text:query.map(
                //     function(words) {
                //      words = words.filter(function (word) { return !has_non_letter.test(word); });
                //      return words.length === 0 ? "" : ("("+ words.join(" OR ") + ")");
                //     }
                // ).join(" "),
                text: query.join(" "),
                startTime: (new Date()).getTime() - 1000 * 60 * 60 * 24 *
		    days[name][1],
                endTime: (new Date()).getTime() - 1000 * 60 * 60 * 24 *
		    days[name][0],
		maxResults: 30
            },
            callback
        );
    },
    candidatesTransformer: function(callback, history_items) {
        callback(
	    history_items.map(
		function(history_item) {
                    return {
			id: history_item.id,
			name: history_item.url + history_item.title,
			element: $("<li>").addClass("nowrap").append(
                            $('<span>').text(history_item.title),
                            $('<span>').addClass('url').text(
				history_item.url.match("^http://") ? history_item.url.substr(7) : history_item.url
                            )
			)[0],
			entity: history_item
                    };
		}
            )
	);
    },
    actions: [
        // {
        //     name: "Open in current tab",
        //     fn  : function (history_items) {
        //     }
        // },
        {
            name: "Open in new tab",
            fn  : function (history_items) {
                history_items.forEach(
                    function (history_item) {
                        chrome.tabs.create({url: history_item.url}, function () {});
                    }
                );
            }
        }
        // {
        //     name: "Open in new window",
        //     fn  : function (history_items) {
        //     }
        // }
    ]
});
}