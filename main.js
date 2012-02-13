/*
 * Anychrome.crx
 * writtern By Takaya Tsujikawa <http://github.com/mechairoi>.
 *
 * Released under the MIT License
 */

var extensionId = chrome.extension.getURL("").substr(19,32);

Function.prototype.throttleDebounce = function (tMsec, dMsec) {
  var debounceId, throttleOn;
  var me = this;
  return function () {
    var self = this;
    var args = arguments;
    if (debounceId) {
      clearTimeout(debounceId);
      debounceId = false;
    }
    if (!throttleOn ||
        (new Date()).getTime() - throttleOn.getTime() > tMsec)
    {
      throttleOn = new Date();
      me.apply(self, args);
    } else {
      debounceId = setTimeout(
        function () { me.apply(self, args); }, dMsec
      );
    }
  };
};

function getMigemoRegex (q, threshold) {
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

var currentParams;
$( function() {
  var locationHash = {};

  locationHash = {};
  if (document.location.hash !== "" && document.location.hash !== "#")
    locationHash = JSON.parse(location.hash.substr(1));
  document.location.hash = "";
  if (locationHash._open_from === "html")
    closePopupHtml();

  // $(window).bind("blur", function() { clean(); } );
  $(window).bind(
    'hashchange',
    function () {
      if (document.location.hash !== "" && document.location.hash !== "#")
        locationHash = JSON.parse(location.hash.substr(1));
      else
        locationHash = {};
      document.location.hash = "";
      if (locationHash._open_from === "html")
        closePopupHtml();
      if(locationHash.sources) {
        clean();
        if (typeof locationHash.window_id !== "undefined")
          lastWindowIds.unshift(locationHash.window_id);
        anychrome(
          {
            sources: [
              [false, 'tab'],
              [false, 'history_day'],
              [false, 'history_week'],
              [false, 'history_month']
            ]
          }
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
          selectNext();
          return false;
        } else if (e.keyCode == 80) { // C-p
          selectPrev();
          return false;
        } else if (e.keyCode == 85) { // C-u
          // anychrome_force_update();
          return false;
        } else if (e.keyCode == 76) { // C-l
          // anychrome_force_update();
          return false;
        } else if (e.keyCode == 71) { // C-g
          abort(function(){});
          return false;
        } else if (e.keyCode == 73) { // C-i
          selectAction();
          return false;
        } else if (e.keyCode == 77) { // C-m
          doFirstAction();
          return false;
        } else if (e.keyCode == 88) { // C-x
          toggleMark();
          return false;
        }
      } else if ( !e.altKey && !e.shiftKey && !e.ctrlKey) {
        if(e.keyCode == 9) { // tab
          selectAction();
          return false;
        } else if(e.keyCode == 13) { // Enter
          doFirstAction();
          return false;
        } else if(e.keyCode == 38) { // Up
          selectPrev();
          return false;
        } else if(e.keyCode == 40) { // Down
          selectNext();
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

      var migemoThreshold = 100;
      currentParams.sources.forEach(
        function(source) {
          if (source.migemo && source.migemo < migemoThreshold)
            migemoThreshold = source.migemo;
        }
      );

      var qs, regs, reg;
      currentParams.defer.cancel();
      var canceled = false;
      var defer = currentParams.defer = Deferred.chain(
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
          return getMigemoRegex(q, migemoThreshold);
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
        currentParams.sources.map(
          function(source) {
            return function() {
              if (typeof source.delayed === "undefined") return;
              var transformed = source.transformedCandidates = [];
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
                    deferredTransformDisplay(
                      source,
                      candidates,
                      reg,
                      regs
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
    }).throttleDebounce(400, 300)
  );

  if (typeof locationHash.window_id !== "undefined")
    lastWindowIds.unshift(locationHash.window_id);
  anychrome(
    {
      sources: [
        [false, 'tab'],
        [false, 'history_day'],
        [false, 'history_week'],
        [false, 'history_month']
      ],
      window_id: locationHash.window_id
    }
  );
  $("#anychrome_query").focus();
}
 );

function deferredTransformDisplay (source, candidates, reg, regs) {
  return Deferred.chain(
    function () {
      return Deferred.chrome.extension.sendRequest(
        source.extensionId,
        {
          type: "candidatesTransformer",
          name: source.name,
          args: [ candidates ]
        }
      );
    },
    function (transformed) {
      transformed.forEach(
        function(x) {
          x.element = x.element
              ? $(x.element)[0]
              : $("<li>").text(x.name)[0];
        }
      );
      [].push.apply(
        source.transformedCandidates,
        transformed
      );
    },
    function () { return Deferred.wait(0); },
    function () { redisplay(reg, regs); }
  );
}

var parser = new DOMParser();

function anychrome(params) {
  // XXX recreate <ul> element ?
  currentParams = params;

  var defer = currentParams.defer = Deferred.chain(
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
          source.transformedCandidates = [];
          source.markedCandidates = {}; // XXX release?
        }
      );
      defer = currentParams.defer = Deferred.chain(
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
                  deferredTransformDisplay(
                    source,
                    candidates,
                    "",
                    []
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


function redisplay(reg, regs) {
  var params = currentParams;
  var c = 0;
  var n = params.sources.length;
  var selectedSourceIndex, selectedCandIndex;
  var selectedElement = _selectedElement();
  if (selectedElement) {
    selectedSourceIndex = $(selectedElement).attr("data-source-index");
    selectedCandIndex = $(selectedElement).attr("data-cand-index");
  } else {
    selectedSourceIndex = 0;
    selectedCandIndex = 0;
  }
  var closestElement;
  $("#anychrome_candidates.anychrome_selected:first").removeClass("anychrome_selected");
  $("#anychrome_candidates").empty();
  for (var i = 0; i < n; ++i) {
    var source = params.sources[i];
    ++c;
    $("#anychrome_candidates").append(
      $("<li>").text(source.title).addClass("anychrome_section")
    );
    var cands = source.transformedCandidates;
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
        $(cand.element).attr("data-cand-id", candId(cand));
        $(cand.element).removeClass((k % 2 === 1) ? "anychrome_odd" : "anychrome_even");
        $(cand.element).addClass((k % 2 === 1) ? "anychrome_even" : "anychrome_odd");
        if (!closestElement
            || i < selectedSourceIndex
            || (i == selectedSourceIndex
                && j <= selectedCandIndex))
          closestElement = cand.element;
        $(cand.element).removeClass("anychrome_selected");
        if(isMarked(i, candId(cand))) {
          $(cand.element).addClass("anychrome_marked");
        }
      }
    }
  }
  $(closestElement).addClass("anychrome_selected");
  scrollIfRequire(400);
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
  var hasNext = walker.nextNode();
  while (hasNext) {
    var node = walker.currentNode;
    hasNext = walker.nextNode();
    var m = node.nodeValue.match(reg);
    if (!m) continue;
    for( var i = 0; i < n; ++i )
      if (node.nodeValue.match(regs[i]))
        flag[i] = true;
    // node.splitText(m.index);
    // node = node.nextSibling;
    // node.splitText(m[0].length);
    // var surround = document.createElement("span");
    // node.parentNode.replaceChild(surround, node);
    // surround.appendChild(node);
    // surround.className = "anychrome_highlighted";
  }
  if (source.delayed) return true;
  for( var i = 0; i < n; ++i )
    if(!flag[i]) return false;
  return true;
}

function candId(cand) {
  return cand.id; // XXX or cand.toString?
}

function isMarked(sourceIndex, candId) {
  return !!currentParams.sources[sourceIndex].markedCandidates[candId];
}

function markedCands() {
  var cands = [];
  currentParams.sources.forEach(
    function (source) {
      with (source) {
        for (id in source.markedCandidates) {
          cands.push(source.markedCandidates[id]);
        }
      }
    }
  );
  return cands;
}

function _selectedElement() {
  return $("#anychrome_candidates .anychrome_selected")[0]; // slow
}
function selectNext(){
  var next = _selectedElement().nextSibling;
  while (next && $(next).hasClass("anychrome_section")) {
    next = next.nextSibling;
  }
  if(next) {
    $(_selectedElement()).removeClass("anychrome_selected");
    $(next).addClass("anychrome_selected");
  }
  scrollIfRequire(0);
}
function selectPrev(){
  var prev = _selectedElement().previousSibling;
  while (prev && $(prev).hasClass("anychrome_section")) {
    prev = prev.previousSibling;
  }
  if(prev) {
    $(_selectedElement()).removeClass("anychrome_selected");
    $(prev).addClass("anychrome_selected");
  }
  scrollIfRequire(0);
}
function scrollIfRequire (wait) {
  var ul = $("#anychrome_candidates");
  var top = ul.scrollTop();
  var height = ul.height();
  var y = $(_selectedElement()).position().top;
  if ( y <= 60 ) {
    ul.animate({scrollTop: top + y - 60}, wait);
  } else if ( height - 30 < y ) {
    ul.animate({scrollTop: top + y - height + 30}, wait);
  }
}
function toggleMark(){
  var elem = _selectedElement();
  var sourceIndex = $(elem).attr("data-source-index");
  var candId = $(elem).attr("data-cand-id");
  var cand = _cand(_selectedElement());
  if(isMarked(sourceIndex, candId)) {
    $(cand.element).removeClass("anychrome_marked");
    delete currentParams.sources[sourceIndex].markedCandidates[candId];
  } else {
    $(cand.element).addClass("anychrome_marked");
    currentParams.sources[sourceIndex].markedCandidates[candId.toString()] = cand;
  }
}

function _cand(elem) {
  var sourceIndex = $(elem).attr("data-source-index");
  var candIndex = $(elem).attr("data-cand-index");
  return currentParams.sources[sourceIndex].transformedCandidates[candIndex];
}


function closePopupHtml () {
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
            function(_popupWindow) {
              getReturnWindowId(
                function (_windowId) {
                  chrome.windows.update(
                    _windowId,
                    { focused:true },
                    function() {
                      chrome.windows.update(
                        _popupWindow.id,
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

function getReturnWindowId (callback) {
  chrome.extension.sendRequest(
    extensionId,
    {
      type: "getPreviousFocusedWindowId",
      excludeIds: [ lastFocusedWindow.id ]
    },
    callback
  );
}

function abort(callback) {
  clean();
  chrome.windows.getCurrent(
    function(_window) {
      if (_window.type === "popup")
        getReturnWindowId(
          function(_windowId) {
            chrome.windows.update(
              _windowId,
              { focused: true }
            );
            callback();
          }
        );
      else {
        window.close();
        callback();
      }
    }
  );
}

function clean() {
  currentParams.sources.forEach(
    function(source) {
      delete source['transformedCandidates'];
      delete source['markedCandidates'];
    }
  );
  $("#anychrome_candidates").empty();
  $("#anychrome_query").attr("value", "");
}

function doFirstAction() {
  var cands = markedCands();
  if (cands.length == 0) cands = [ _cand(_selectedElement()) ];
  var source = currentParams.sources[$(cands[0].element).attr("data-source-index")];

  abort(
    function() {
      chrome.extension.sendRequest(
        source.extensionId,
        {
          type: "actions",
          name: source.name,
          args : [
            [0],
            cands.map( function(cand) { return cand.entity; } )
          ]
        }
      );
    }
  );
}


function selectAction() {
  var cands = markedCands();
  if (cands.length == 0) cands = [ _cand(_selectedElement()) ];
  var source = currentParams.sources[$(cands[0].element).attr("data-source-index")];
  if (source.actions.length === 1) return doFirstAction();

  Anychrome.defineSource(
    {
      name: "action",
      title: "Action",
      candidates: source.actions,
      candidatesTransformer: function(callback, actions) {
        callback(
          actions.map(
            function(action,i) {
              return {
                id: i,
                name: action.name,
                entity: i
              };
            }
          )
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
                  actionIndexes,
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
    },
    function(x){
      clean();
      anychrome({ sources: [ [ false, 'action' ] ] });
      $("#anychrome_query").focus();
    }
  );
  return undefined;
}
