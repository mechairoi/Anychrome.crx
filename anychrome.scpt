tell application "Google Chrome"
        activate
        repeat with _window in windows
                repeat with _tab in tabs of _window
                        set _i to 1
                        if URL of _tab contains "chrome-extension://epmnohbjmpanknlignaginogcoiefcac/main.html" then
                                tell _window
                                        tell _tab
                                                execute javascript "
chrome.windows.getCurrent(
    function(win) {
        chrome.windows.update(
                win.id,
                        { 'focused':true },
                        function() {
                            chrome.tabs.getCurrent(
                                    function(tab) {
                        chrome.tabs.update(tab.id,{
                            'selected':true
                        });
                                    }
                            );
                    }
            )
    });"
                                        end tell
                                end tell
                                return
                        end if
                end repeat
        end repeat
        tell window 1
                tell active tab
                        execute javascript "
(function() {
    var width = Math.min(window.innerWidth, 600);
    var window_bar_height = 50; // XXX OSX
    window.open(
        'chrome-extension://epmnohbjmpanknlignaginogcoiefcac/main.html#{\"_external_open\": true}',
        'anychrome',
        'width=' + width + ', height=' + (window.innerHeight - window_bar_height) + ', top=' + (window.screenTop + 72) + ', left=' + (window.screenLeft + window.innerWidth - width));
})();"
                end tell
        end tell
end tell

