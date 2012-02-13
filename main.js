/*
 * Anychrome.crx
 * writtern By Takaya Tsujikawa <http://github.com/mechairoi>.
 *
 * Released under the MIT License
 */

var extensionId = chrome.extension.getURL("").substr(19,32);

Function.prototype.throttle_debounce = function (t_msec, d_msec) {
    var debounce_id, throttle_on;
    var me = this;
    return function () {
        var self = this;
        var args = arguments;
        if (debounce_id) {
            clearTimeout(debounce_id);
            debounce_id = false;
        }
        if (!throttle_on ||
            (new Date).getTime() - throttle_on.getTime() > t_msec)
        {
            throttle_on = new Date;
            me.apply(self, args);
        } else {
            debounce_id = setTimeout(
                function () { me.apply(self, args); }, d_msec
            );
        }
    };
};

function get_migemo_regex (q, threshold) {
    var queries = q.filter(
        function (x) { return x.length >= threshold; }
    );
    if (queries.length == 0)
	return Deferred.next(
	    function(){
		return q.map( function (word) { return [ word ];} );
	    }
	);

    var d = new Deferred();
    try {
        chrome.extension.sendRequest(
            'pocnedlaincikkkcmlpcbipcflgjnjlj',
            {
                action: "getCompletion",
                query: queries.join(" ")
            },
            function(res) {
                d.call(
                    q.filter(
                        function (x) { return x.length < threshold; }
                    ).map(
                        function (word) { return [ word ];}
                    ).concat(res ? (res.result || []) : [] )
                );
            }
        );
    } catch (exception) {
        d.call( q.map( function (word) { return [ word ];} ) );
    }
    return d;
}


var current_params;
$( function() {
       var location_hash = {};

       location_hash = {};
       if (document.location.hash !== "" && document.location.hash !== "#")
           location_hash = JSON.parse(location.hash.substr(1));
       document.location.hash = "";
       if (location_hash._open_from === "html")
           close_popup_html();


       // $(window).bind("blur", function() { clean(); } );
       $(window).bind(
           'hashchange',
           function () {
               if (document.location.hash !== "" && document.location.hash !== "#")
                   location_hash = JSON.parse(location.hash.substr(1));
               else
                   location_hash = {};
               document.location.hash = "";
               if (location_hash._open_from === "html")
                   close_popup_html();
               if(location_hash.sources) {
                   clean();
                   if (typeof location_hash.window_id !== "undefined")
                       last_window_ids.unshift(location_hash.window_id);
                   anychrome(
                       { sources: [ ac_source_tabs, ac_source_history ] }
                   );
                   $("#anychrome_query").focus();
               }
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
                   } else if(e.keyCode == 38) { // Up
                       select_prev();
                       return false;
                   } else if(e.keyCode == 40) { // Down
                       select_next();
                       return false;
                   }
               }
               return true;
           }
       );

       var prev_q;
       $("#anychrome_query").bind(
           "textchange",
           (function (event) {
		var q = $("#anychrome_query").attr("value").split(
		    new RegExp(" +")
		).filter(
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

		var qs, regs, reg;
		current_params.defer.cancel();
		var canceled = false;
		var defer = current_params.defer = Deferred.chain(
		    function () {
			defer.children = [];
			defer.canceller = // XXX not open api
			function () {
			    (this.canceller || function () {})();
			    defer.canceled = true;
			    defer.children.forEach(function(d) { d.cancel(); });
			};
		    },
		    function () {
			return get_migemo_regex(q, migemo_threshold);
		    },
                    function (res) {
			qs = res;
			regs = qs.map(
                            function(words) {
				return words.map(
                                    function (word) {
					return word.replace(/([^0-9A-Za-z_])/g, '\\$1');
                                    }
				).join("|");
                            }
			);
			reg =  regs.join("|"); // for highlight
			reg = reg === "" ? false : new RegExp(reg, "i");
			regs = regs.map(
			    function(reg) {
				return new RegExp(reg, "i");
			    }
			);
			return Deferred.wait(0);
                    },
                    current_params.sources.map(
			function(source) {
                            return function() {
				if (typeof source.delayed === "undefined") return;
				var transformed = source.transformed_candidates = [];
				chrome.extension.sendRequest(
				    source.extensionId,
				    {
					type: "candidates",
					name: source.name,
					args: [ source.regex ? regs : source.migemo ? qs : q ]
				    },
				    function(candidates) {
					if (defer.canceled) return;
					defer.children.push(
					    Deferred.chain(
						function () {
						    return deferred_transform_candidates(
							source, candidates
						    );
						},
						function (transformed) {
						    transformed.forEach(
							function(x){
							    x.element = $(x.element)[0];
							}
						    );
						    [].push.apply(
							source.transformed_candidates,
							transformed
						    );
						},
						function () { return Deferred.wait(0); },
						function () { redisplay(reg, regs); }
					    )
					);
				    }
				);
                            };
			}
                    ).concat(
			[
			    function () {
				return Deferred.wait(0).next(
				    function() {
					redisplay(reg, regs); //XXX only if require
				    }
				);
			    }
			]
                    )
		);
            }).throttle_debounce(600, 300)
       );

       if (typeof location_hash.window_id !== "undefined")
           last_window_ids.unshift(location_hash.window_id);
       anychrome(
           {
               sources: [
		   [false, 'tab'],
		   [false, 'history_day'],
		   [false, 'history_week'],
		   [false, 'history_month']
	       ],
               window_id: location_hash.window_id
           }
       );
       $("#anychrome_query").focus();
   } );

var parser = new DOMParser();

function anychrome(params) {
    // XXX recreate <ul> element ?
    current_params = params;

    var defer = current_params.defer = Deferred.chain(
	function () {
	    return Deferred.chrome.extension.sendRequest(
		extensionId,
		{
		    type: "getSources",
		    args: params.sources
		}
	    );
	},
	function (sources) {
	    params.sources = sources;
	    sources.forEach(
		function(source) {
		    source.transformed_candidates = [];
		    source.marked_candidates = {}; // XXX release?
		}
	    );
	    defer = current_params.defer = Deferred.chain(
		function () { defer.children = []; },
		sources.map(
		    function(source) {
			chrome.extension.sendRequest(
			    source.extensionId,
			    {
				type: "candidates",
				name: source.name,
				args: [ source.regex ? "" : [] ]
			    },
			    function(candidates) {
				defer.children.push(
				    Deferred.chain(
					function () {
					    return deferred_transform_candidates(
						source, candidates
					    );
					},
					function (transformed) {
					    transformed.forEach(
						function(x){
						    x.element = $(x.element)[0];
						}
					    );
					    [].push.apply(
						source.transformed_candidates,
						transformed
					    );
					},
					function () { return Deferred.wait(0); },
					function () { redisplay("", []); }
				    )
				);
			    }
			);
		    }
		)
	    );
	}
    );
}

function deferred_transform_candidates (source, candidates) {
    return Deferred.chrome.extension.sendRequest(
	source.extensionId,
	{
	    type: "candidatesTransformer",
	    name: source.name,
	    args: [ candidates ]
	}
    );
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
            $("<li>").text(source.title).addClass("anychrome_section")
        );
        var cands = source.transformed_candidates;
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
    scroll_if_require();
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
    scroll_if_require();
}
function scroll_if_require () {
    var ul = $("#anychrome_candidates");
    var top = ul.scrollTop();
    var height = ul.height();
    var y = $(_selected_element()).position().top;
    if ( y <= 60 ) {
	ul.scrollTop(top + y - 60);
    } else if ( height - 30 < y ) {
	ul.scrollTop(top + y - height + 30);
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


function close_popup_html () {
    chrome.tabs.query(
        {
            url: chrome.extension.getURL('trigger.html')
        }, function (tabs) {
            if (tabs.length == 0) return;
            Deferred.parallel(
                tabs.map( function(tab) { return Deferred.chrome.tabs.remove(tab.id); } )
            ).next(
                function() {
                    // if (window_id) fail(window_id);
                    chrome.windows.getLastFocused(
                        function(_popup_window) {
			    get_return_window_id(
				function (_window_id) {
				    chrome.windows.update(
					_window_id,
					{ focused:true },
					function() {
                                            chrome.windows.update(
                                                _popup_window.id,
                                                { focused:true }
                                            );
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        }
    );
}

var lastFocusedWindow;
$(
    function() {
        chrome.windows.getLastFocused(
            function(_window) {
                lastFocusedWindow = _window;
	    }
	);
    }
);

function get_return_window_id (callback) {
    chrome.extension.sendRequest(
	extensionId,
	{
	    type: "getPreviousFocusedWindowId",
	    excludeIds: [ lastFocusedWindow.id ]
	},
	callback
    );
}

function abort() {
    clean();
    chrome.windows.getCurrent(
	function(_window) {
	    if (_window.type === "popup")
		get_return_window_id(
		    function(_window_id) {
			chrome.windows.update(
			    _window_id,
			    { focused: true }
			);
		    }
		);
	    else
		window.close();
	}
    );
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

function do_first_action() {
    var cands = marked_cands();
    if (cands.length == 0) cands = [ _cand(_selected_element()) ];
    var source = current_params.sources[$(cands[0].element).attr("data-source-index")];

    clean();

    chrome.extension.sendRequest(
	source.extensionId,
	{
	    type: "actions",
	    name: source.name,
	    args : [
		0,
		cands.map( function(cand) { return cand.entity; } )
	    ]
	}
    );
}


function select_action() {
    var cands = marked_cands();
    if (cands.length == 0) cands = [ _cand(_selected_element()) ];
    var source = current_params.sources[$(cands[0].element).attr("data-source-index")];
    if (source.actions.length === 1) return do_first_action();

    clean();
    Anychrome.defineSource(
        {
            name: "action",
	    title: "Action",
            candidates: source.actions,
            candidatesTransformer: function(actions) {
                return actions.map(
                    function(action,i) {
                        return {
                            id: i,
                            name: action.name,
                            entity: i
                        };
                    }
                );
            },
            actions: [
                {
                    icon: "",
                    name: "Apply",
                    fn  : function (actionIndexes) {
			chrome.extension.sendRequest(
			    source.extensionId,
			    {
				type: "actions",
				name: source.name,
				args : [
				    i,
				    cands.map(
					function(cand) {
					    return cand.entity;
					}
				    )
				]
			    },
			    function () {}
			);
                    }
                }
            ]
        }
    );
    anychrome({ sources: [ [ undefined, 'action' ] ] });
    $("#anychrome_query").focus();
    return undefined;
}
