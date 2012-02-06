// source spec
// init : XXX not implemented
// candidates : array or function returns something array
// candidates_transformer : (optional) function returns [ dom element || string ] or [ [ dom element, object ] .. ], default identity
// migemo: letters #XXX not implemented
// regex: XXX
// type : not implemented
// actions の引数は一つ以上の要素を持つリスト
var ac_source_tabs = {
    name: "Tabs",
    candidates: function (callback) {
        chrome.windows.getAll(
            { populate: true },
            function (windows) {
                windows.map(
                    function(window) {
                        chrome.tabs.getAllInWindow(window.id, callback); // anychrome のタブは除く
                    }
                );
            }
        );
    },
    candidates_transformer: function (tabs) {
        return tabs.map(
            function(tab) {
                return {
                    id : tab.id.toString(),
                    element :
                        $("<li></li>").addClass("nowrap").append(
                                $('<img class=\"favicon\" />').attr({"src": tab.favIconUrl, width: "16px", height: "16px"}),
                                $('<span></span>').append(tab.title),
                                $('<span class="url"></span>').append(
                                    tab.url.match("^http://") ? tab.url.substr(7) : tab.url
                                )
                        )[0],
                    entity: tab
                };
            }
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
};
var ac_source_history = {
    name: "History",
    delayed: 0.1,
    requires_pattern: 3,
    candidates: function(query, callback) {
        console.log(query);
        chrome.history.search(
            { text: query, maxResults: 200 },
            callback
        );
    },
    candidates_transformer: function(history_items) {
        return history_items.map(
            function(history_item) {
                return {
                    id: history_item.id,
                    name: history_item.url + history_item.title,
                    element:
                        $("<li></li>").addClass("nowrap").append(
                                $('<span></span>').append(history_item.title),
                                $('<span class="url"></span>').append(
                                    history_item.url.match("^http://") ? history_item.url.substr(7) : history_item.url
                                )
                        )[0],
                    entity: history_item
                };
            }
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
};

// var regexp;
// var query = 'kaisetu';

// chrome.extension.sendRequest(
//   'pocnedlaincikkkcmlpcbipcflgjnjlj' // ChromeMigemo の Extension ID (Extension Gallery からインストールした場合)
//   ,{"action": "getRegExpString", "query": query}
//   ,function(response) {
//     console.log(response);
//     //=> {"action":"getRegExpString", "query":"kaisetu", "result":"回折|解説|開設|kaisetu|ｋａｉｓｅｔｕ|かいせつ|カイセツ|ｶｲｾﾂ"}
//     regexp = new RegExp(response.result, 'i');
//   }
// );

var location_hash = {};
function set_location_hash (hash) {
    location_hash = $.extend(location_hash, hash);
    document.location.hash = JSON.stringify(location_hash);
}
$( function() {
    location_hash = {};
    console.log(location.hash);
    if (document.location.hash !== "" && document.location.hash !== "#")
        location_hash = JSON.parse(location.hash.substr(1));
    // if (location_hash._external_open) { // NOT WORKING
    //     delete location_hash['_external_open'];
    //     window.open(
    //         chrome.extension.getURL('main.html#').concat(JSON.stringify(location_hash)), "anychrome",
    //         "width=" + 680 +
    //         ", height=" + 1050 +
    //         ", top=" + 0 +
    //         ", left=" + 1000
    //     );
    //     return;
    // }

    $(window).bind(
        'hashchange',
        function() {
            if(document.location.hash === "" || document.location.hash === "#") {
                clean();
                anychrome( { sources: [ ac_source_tabs, ac_source_history ] } );
            }
        }
    );

    $("#anychrome_query").bind("blur", function() { this.focus(); return false; } );
    $("#anychrome_query").bind("keydown",
        function(e) {
            console.log(e);
            if( !e.altKey && !e.shiftKey && e.ctrlKey) {
                if (e.keyCode == 78) { // C-n
                    select_next();
                    return false;
                } else if (e.keyCode == 80) { // C-p
                    select_prev();
                    return false;
                } else if (e.keyCode == 85) { // C-u
                    // anychrome_force_update();
                    return false;
                } else if (e.keyCode == 76) { // C-l
                    // anychrome_force_update();
                    return false;
                } else if (e.keyCode == 71) { // C-g
                    abort();
                    return false;
                } else if (e.keyCode == 73) { // C-i
                    select_action();
                    return false;
                } else if (e.keyCode == 77) { // C-m
                    do_first_action();
                    return false;
                } else if (e.keyCode == 88) { // C-x
                    toggle_mark();
                    return false;
                }
            } else if ( !e.altKey && !e.shiftKey && !e.ctrlKey) {
                if(e.keyCode == 9) { // tab
                    select_action();
                    return false;
                } else if(e.keyCode == 13) { // Enter
                    do_first_action();
                    return false;
                }
            }
            return true;
        }
    );

    var prev_q;
    $("#anychrome_query").bind("textchange",
        function (event) {
            var q = $("#anychrome_query").attr("value");
            if (q === prev_q) return;
            prev_q = q;
            var reg = q.replace(/([^0-9A-Za-z_])/g, '\\$1'); // quotemeta
            reg = q === "" ? false : new RegExp(q, "i");
            current_params.sources.forEach(
                function(source) {
                    if(typeof source.delayed !== "undefined") {
                        var transformed = source.transformed_candidates = [];
                        source.candidates(
                            source.regex ? reg : q,
                            function (candidates) { //XXX function anychrome() と重複したコード
                                var list = source.candidates_transformer(candidates);
                                list.forEach(
                                    function(cand) {
                                        if(!cand.element) {
                                                cand.element = $("<li></li>").text(cand.name);
                                        }
                                    }
                                );
                                transformed.push.apply(transformed, list);
                                redisplay(current_params, reg);
                            }
                        );
                    }
                }
            );
            redisplay(current_params, reg);
        }
    );

    anychrome( { sources: [ ac_source_tabs, ac_source_history ] } );
    $("#anychrome_query").focus();
} );

function highlight (params, reg, cand) {
    $("span.anychrome_highlighted", cand.element).each(
        function() {
            with (this.parentNode) {
                replaceChild(this.firstChild, this);
                normalize();
            }
        }
    );
    if (!reg) return true;

    var walker = document.createTreeWalker(
        cand.element, NodeFilter.SHOW_TEXT, null, false
    );
    var flag = false;
    var has_next = walker.nextNode();
    while (has_next) {
        var node = walker.currentNode;
        has_next = walker.nextNode();
        var m = node.nodeValue.match(reg);
        if (!m) continue;
        node.splitText(m.index);
        node = node.nextSibling;
        node.splitText(m[0].length);
        var surround = document.createElement("span");
        node.parentNode.replaceChild(surround, node);
        surround.appendChild(node);
        surround.className = "anychrome_highlighted";
        flag = true;
    }
    return flag ? true : false;
}

var current_params;
function anychrome(params) {
    // XXX ul は 新しく作りなおしたほうがよさそう(古いやつが挿入してくるかも...) & ul を current param に入れとく
    current_params = params;
    var sources = params.sources;
    set_location_hash( { sources: sources.map( function(source) { return source.name; } ) } );
    sources.forEach(
        function(source) {
            source.transformed_candidates = [];
            source.marked_candidates = {}; // XXX どっかで開放する.
            if (typeof source.delayed === "undefined") {
                if (typeof (source.candidates) === "function") {
                    var transformed = source.transformed_candidates;
                    source.candidates(
                        function(candidates) { //XXX #bind change query と重複したコード
                            var list = source.candidates_transformer(candidates);
                            list.forEach(
                                function(cand) {
                                    if(!cand.element) {
                                        cand.element = $("<li></li>").text(cand.name);
                                    }
                                }
                            );
                            transformed.push.apply(transformed, list);
                            redisplay(params, "");
                        }
                    );
                } else {
                    source.transformed_candidates =
                        source.candidates_transformer(source.candidates);
                    source.transformed_candidates.forEach(
                        function(cand) {
                            if(!cand.element) {
                                cand.element = $("<li></li>").text(cand.name)[0];
                            }
                        }
                    );
                    redisplay(params, "");
                }
            } else {
                redisplay(params, "");
            }
        }
    );
}

function redisplay(params, reg) {
    var c = 0;
    var n = params.sources.length;
    $("#anychrome_candidates.anychrome_selected:first").removeClass("anychrome_selected");
    $("#anychrome_candidates").empty();
    var is_first = true;
    for (var i = 0; i < n; ++i) {
        var source = params.sources[i];
        ++c;
        $("#anychrome_candidates").append(
            $("<li></li>").text(source.name).addClass("anychrome_section")
        );
        var cands  = source.transformed_candidates;
        var m = cands.length;
        var k = 0;
        for (var j = 0; j < m; ++j) {
            var cand = cands[j];
            ++c;
            if (highlight(params, reg, cand)) {
                k++;
                $("#anychrome_candidates").append( cand.element );
                $(cand.element).attr("data-source-index", i);
                $(cand.element).attr("data-cand-index", j);
                $(cand.element).attr("data-cand-id", cand_id(cand));
                $(cand.element).removeClass((k % 2 === 1) ? "anychrome_odd" : "anychrome_even");
                $(cand.element).addClass((k % 2 === 1) ? "anychrome_even" : "anychrome_odd");
                if(is_first) {
                    $(cand.element).addClass("anychrome_selected");
                    is_first = false;
                } else {
                    $(cand.element).removeClass("anychrome_selected");
                }
                if(is_marked(i, cand_id(cand))) {
                    $(cand.element).addClass("anychrome_marked");
                }
            }
        }
    }
}

function cand_id(cand) {
    return cand.id; // XXX or cand.toString?
}

function is_marked(source_index, cand_id) {
    return !!current_params.sources[source_index].marked_candidates[cand_id];
}

function marked_cands() {
    var cands = [];
    current_params.sources.forEach(
        function (source) {
            with (source) {
                for (id in marked_candidates) {
                    cands.push(marked_candidates[id]);
                }
            }
        }
    );
    return cands;
}

function _selected_element() {
    return $("#anychrome_candidates .anychrome_selected")[0]; // slow
}
function select_next(){
    var next = _selected_element().nextSibling;
    while (next && $(next).hasClass("anychrome_section")) {
        next = next.nextSibling;
    }
    if(next) {
        $(_selected_element()).removeClass("anychrome_selected");
        $(next).addClass("anychrome_selected");
    }
}
function select_prev(){
    var prev = _selected_element().previousSibling;
    while (prev && $(prev).hasClass("anychrome_section")) {
        prev = prev.previousSibling;
    }
    if(prev) {
        $(_selected_element()).removeClass("anychrome_selected");
        $(prev).addClass("anychrome_selected");
    }
}
function toggle_mark(){
    var elem = _selected_element();
    var source_index = $(elem).attr("data-source-index");
    var cand_id = $(elem).attr("data-cand-id");
    var cand = _cand(_selected_element());
    if(is_marked(source_index, cand_id)) {
        $(cand.element).removeClass("anychrome_marked");
        delete current_params.sources[source_index].marked_candidates[cand_id];
    } else {
        $(cand.element).addClass("anychrome_marked");
        current_params.sources[source_index].marked_candidates[cand_id.toString()] = cand;
    }
}

function _cand(elem) {
    var source_index = $(elem).attr("data-source-index");
    var cand_index = $(elem).attr("data-cand-index");
    return current_params.sources[source_index].transformed_candidates[cand_index];
}

function do_first_action() {
    var cands = marked_cands();
    if (cands.length == 0) cands = [ _cand(_selected_element()) ];
    var source = current_params.sources[$(cands[0].element).attr("data-source-index")];

    clean();
    source.actions[0].fn(cands.map(function(cand) { return cand.entity; }));
}

function abort() {
    clean();
    if (typeof location_hash.window_id !== "undefined") {
        chrome.windows.update(
            location_hash.window_id,
            { focused: true },
            function () { }
	);
    }
    // chrome.windows.getCurrent( // XXX NOT WORKING
    // 	function (_window) {
    // 	    chrome.windows.update(_window.id, { focused: false }, function () { } );
    // 	}
    // );
}

function clean() {
    current_params.sources.forEach(
        function(source) {
            delete source['transformed_candidates'];
            delete source['marked_candidates'];
        }
    );
    $("#anychrome_candidates").empty();
    $("#anychrome_query").attr("value", "");
}

function select_action() {
    var cands = marked_cands();
    if (cands.length == 0) cands = [ _cand(_selected_element()) ];
    var source = current_params.sources[$(cands[0].element).attr("data-source-index")];
    if (source.actions.length === 1) return do_first_action();

    clean();
    anychrome(
        {
            sources: [
                {
                    name: "Actions",
                    candidates: source.actions,
                    candidates_transformer: function(actions) {
                        return actions.map(
                            function(action) {
                                return {
                                    id: action.name,
                                    name: action.name,
                                    entity: action
                                };
                            }
                        );
                    },
                    actions: [
                        {
                            icon: "",
                            name: "Apply",
                            fn  : function (actions) {
                                actions[0].fn(cands.map(function(cand) { return cand.entity; }));
                            }
                        }
                    ]
                }
            ]
        }
    );
    $("#anychrome_query").focus();
    return undefined;
}
