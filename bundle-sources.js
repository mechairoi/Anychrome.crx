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
}, function () {});

$.each(
  {day:[0, 1], week: [1, 7], month: [7, 31]},
  function(key, value) {
    Anychrome.defineSource (
      {
        name: "history_" + key,
        title: "History " + key,
        delayed: 0.1,
        requiresPattern: 3, // XXX not implemented
        // migemo: 3,
        // regex: true,
        candidates: function(callback, query) {
          chrome.history.search(
            {
              text: query.join(" "),
              startTime: (new Date()).getTime()
                  - 1000 * 60 * 60 * 24 * value[1],
              endTime: (new Date()).getTime()
                  - 1000 * 60 * 60 * 24 * value[0],
              maxResults: 30
            },
            callback
          );
        },
        candidatesTransformer: function(callback, historyItems) {
          callback(
            historyItems.map(
              function(historyItem) {
                return {
                  id: historyItem.id,
                  name: historyItem.url + historyItem.title,
                  element: $("<li>").addClass("nowrap").append(
                    $('<span>').text(historyItem.title),
                    $('<span>').addClass('url').text(
                      historyItem.url.match("^http://") ? historyItem.url.substr(7) : historyItem.url
                    )
                  )[0],
                  entity: historyItem
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
            fn  : function (historyItems) {
              historyItems.forEach(
                function (historyItem) {
                  chrome.tabs.create({url: historyItem.url}, function () {});
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
      }, function () {}
    );
  }
);