anychrome.crx: options.html
	mkdir -p anychrome
	cp options.html 128.png 16.png 19.png 48.png anychrome-source.js \
	  background.html background.js bundle-sources.html bundle-sources.js \
	  googlechrome-extensions.js highlight.css jquery-1.7.1.min.js \
	  jquery.textchange.min.js jsdeferred.js main.js manifest.json \
	  options.html popup.html trigger.html anychrome/
	/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --pack-extension=./anychrome --pack-extension-key=~/anychrome.pem

options.html: anychrome.scpt.html anychrome.html.html
	cat anychrome.html.html anychrome.scpt.html | perl -e '$$_ = join "", <>; s/<\/body>.*<body[^>]*>/<hr>/s; print $$_' | \
		perl -pe 's{chrome-extension://epmnohbjmpanknlignaginogcoiefcac/}{<script>document.write(chrome.extension.getURL(""))</script>}' > options.html
	echo "pre { background-color: #fdf6e3; padding: 10px; white-space: pre-wrap; border-radius: 3px; -webkit-border-radius: 3px; -moz-border-radius: 3px; -webkit-box-shadow: inset 0 0 5px rgba(0,0,0,.20); -moz-box-shadow: inset 0 0 5px rgba(0,0,0,.20); box-shadow: inset 0 0 5px rgba(0,0,0,.20); text-align: left; }" >> highlight.css


anychrome.scpt.html: anychrome.scpt
	highlight -i anychrome.scpt -S applescript -s whitengrey -o anychrome.scpt.html

anychrome.html.html: anychrome.html
	highlight -i anychrome.html -S applescript -s whitengrey -o anychrome.html.html
