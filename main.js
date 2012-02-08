/*
 * Anychrome.crx
 * writtern By Takaya Tsujikawa <http://github.com/mechairoi>.
 *
 * Released under the MIT License
 */
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
        chrome.tabs.query({}, callback);
    },
    candidates_transformer: function (tabs) {
        return tabs.map(
            function(tab) {
                return {
                    id : tab.id.toString(),
                    element : $("<li></li>").addClass("nowrap").append(
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
    requires_pattern: 3, // XXX not implemented
    // migemo: 3,
    // regex: true,
    candidates: function(query, callback) {
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
                text:query.join(" "),
                startTime: (new Date()).getTime() - 60 * 60 * 24 * 365,
                endTime: (new Date()).getTime()
            },
            callback
        );
    },
    candidates_transformer: function(history_items) {
        return history_items.map(
            function(history_item) {
                return {
                    id: history_item.id,
                    name: history_item.url + history_item.title,
                    element: $("<li></li>").addClass("nowrap").append(
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

function close_popup_html () {
  chrome.tabs.query(
    {
       url: chrome.extension.getURL('popup.html')
    }, function (tabs) {
        tabs.forEach(
            function(tab) {
                chrome.tabs.remove(tab.id, function () {});
            }
        );
    }
  );
}

var location_hash = {};
function set_location_hash (hash) {
    location_hash = $.extend(location_hash, hash);
    document.location.hash = JSON.stringify(location_hash);
}
$( function() {
       close_popup_html();
       location_hash = {};
       console.log(document.location.hash);
       if (document.location.hash !== "" && document.location.hash !== "#")
           location_hash = JSON.parse(location.hash.substr(1));
       console.log(document.location.hash);
       set_location_hash( { initialized: true } );

       $(window).bind(
           'hashchange',
           function () {
               if (document.location.hash !== "" && document.location.hash !== "#")
                   location_hash = JSON.parse(location.hash.substr(1));
               else
                   location_hash = {};
               console.log(location_hash);
               if(!location_hash.initialized) {
                   close_popup_html();
                   clean();
                   anychrome( { sources: [ ac_source_tabs, ac_source_history ] } );
                   $("#anychrome_query").focus();
                   set_location_hash( { initialized: true } );
               }
           }
       );
       $(window).bind(
           'focus',
           function () {
               close_popup_html();
               clean();
               anychrome( { sources: [ ac_source_tabs, ac_source_history ] } );
               $("#anychrome_query").focus();
               set_location_hash( { initialized: true } );
           }
       );

       $("#anychrome_query").bind("blur", function() { this.focus(); return false; } );
       $("#anychrome_query").bind(
           "keydown",
           function(e) {
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
       $("#anychrome_query").bind(
           "textchange",
           function (event) {
               var q = $("#anychrome_query").attr("value").split(new RegExp(" +")).filter(
                   function(x) { return x !== ""; }
               );
               if (q.join(" ") === prev_q) return;
               prev_q = q.join(" ");

               var migemo_threshold = 100;
               current_params.sources.forEach(
                   function(source) {
                       if (source.migemo && source.migemo < migemo_threshold)
                           migemo_threshold = source.migemo;
                   }
               );

               var qs = q.filter(
                   function(x){ return x.length < migemo_threshold; }
               ).map(function(x) { return [x]; });

               var regs = qs.map(
                   function(words) { return words[0].replace(/([^0-9A-Za-z_])/g, '\\$1'); }
               );
               var reg;
               Deferred.chain(
                   Deferred.connect(
                       function(succ) {
                           var queries = q.filter(
                               function(x){ return x.length >= migemo_threshold; }
                           );
                           if (queries.length == 0)
                               succ([]);
                           else {
                               try {
                                   chrome.extension.sendRequest(
                                       'pocnedlaincikkkcmlpcbipcflgjnjlj',
                                       {
                                           "action": "getCompletion",
                                           "query": queries.join(" ")
                                       },
                                       function(res){ succ( res.result ); }
                                   );
                               } catch (exception) {
                                   succ( q.map(function(x) { return [ x.replace(/([^0-9A-Za-z_])/g, '\\$1') ]; }) );
                               }
                           }
                       },
                       { target: chrome.extension, ok:0 }
                   ),
                   function (res) {
                       [].push.apply(qs,res);
                       regs = qs.map(
                           function(words) {
                               return words.join("|");
                           }
                       );
                       reg =  regs.join("|"); // for highlight
                       reg = reg === "" ? false : new RegExp(reg, "i");
                       regs = regs.map( function(reg) { return new RegExp(reg, "i"); } );
                   },
                   function () {
                       current_params.sources.forEach(
                           function(source) {
                               if (typeof source.delayed !== "undefined") {
                                   var transformed = source.transformed_candidates = [];
                                   source.deferred.candidates(
                                       source.regex ? regs : source.migemo ? qs : q
                                   ).next(
                                       deferred_transform_candidates(source)
                                   ).next(
                                       function(){ redisplay(reg, regs); }
                                   );
                               }
                           }
                       );
                       redisplay(reg, regs);
                   }
               );
           }
       );

       anychrome( { sources: [ ac_source_tabs, ac_source_history ] } );
       $("#anychrome_query").focus();
   } );

function highlight (source, reg, regs, cand) {
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
    var n = regs.length;
    var flag = [];
    var has_next = walker.nextNode();
    while (has_next) {
        var node = walker.currentNode;
        has_next = walker.nextNode();
        var m = node.nodeValue.match(reg);
        if (!m) continue;
        for( var i = 0; i < n; ++i )
            if (node.nodeValue.match(regs[i]))
                flag[i] = true;
        node.splitText(m.index);
        node = node.nextSibling;
        node.splitText(m[0].length);
        var surround = document.createElement("span");
        node.parentNode.replaceChild(surround, node);
        surround.appendChild(node);
        surround.className = "anychrome_highlighted";
    }
    if (source.delayed) return true;
    for( var i = 0; i < n; ++i )
        if(!flag[i]) return false;
    return true;
}

var current_params;
function anychrome(params) {
    // XXX ul は 新しく作りなおしたほうがよさそう(古いやつが挿入してくるかも...) & ul を current param に入れとく
    current_params = params;
    var sources = params.sources;
    set_location_hash( { sources: sources.map( function(source) { return source.name; } ) } );
    sources.forEach(
        function(source) {
            source.deferred = {};
            source.deferred.candidates = Deferred.connect(
                (typeof (source.candidates) !== "function")
                    ? function(callback) { callback(source.candidates); }
                : source.candidates,
                { target: source, ok: source.delayed ? 1 : 0 }
            );
            source.transformed_candidates = [];
            source.marked_candidates = {}; // XXX どっかで開放する.
            source.deferred.candidates("").next(
                deferred_transform_candidates(source)
            ).next(
                function() { redisplay(""); }
            );
        }
    );
}

function deferred_transform_candidates (source) {
    return function (candidates) {
        return Deferred.next(
            function () {
                var list = source.candidates_transformer(candidates);
                list.forEach(
                    function(cand) {
                        if(!cand.element) cand.element = $("<li></li>").text(cand.name);
                    }
                );
                [].push.apply(source.transformed_candidates, list);
            }
        );
    };
}

function redisplay(reg, regs) {
    var params = current_params;
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
            if (highlight(source, reg, regs, cand)) {
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
    //  function (_window) {
    //      chrome.windows.update(_window.id, { focused: false }, function () { } );
    //  }
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
