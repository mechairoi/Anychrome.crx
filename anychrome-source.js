/*
 * Anychrome.crx
 * writtern By Takaya Tsujikawa <http://github.com/mechairoi>.
 *
 * Released under the MIT License
 */

/*
 * This file exports an utility function Anychrome.defineSource(source)
 *
 * Usage in background.html
 *   <script type="text/javascript" src="anychrome-source.js"></script>
 *   <script type="text/javascript">
 *     Anychrome.defineSource(
 *         {
 *             candidates: [ "foo", "bar"],
 *             action: [
 *                 function(cand) { alert(cand); }
 *             ]
 *         }
 *     );
 *   </script>
 *
 *
 * XXX More document
 * candidates             : an array or a function returns an array of
                            candidates
 * candidates_transformer : (optional) modifying view function returns
 *                          array of object
 * migemo                 : (optional) enable migemo threshold letters
 * delayed                : (optional) XXX
 * regex                  : (optional) XXX
 * requiresPattern        : (optional) XXX not implemented
 * type                   : (optional) XXX not implemented
 * actions                : array of actions ( actions.length >= 1 ), action is a object { fun: function (candidates) { ... }, name: "name of action" }
 */

if (typeof(Anychrome) == 'undefined') {
    this.Anychrome = {};
    (function (Anychrome) {
	 var extensionId = chrome.extension.getURL("").substr(19,32); //XXX hardcode
	 function isaArray (obj) {
	     return typeof(obj) == 'object' && (obj instanceof Array);
	 };
	 function isaDomNode (obj) {
	     return typeof(obj) == 'object'
		 && typeof(obj.nodeType) == 'number';
	 };
	 var handlers = {
	     candidates: {},
	     candidatesTransformer: {},
             actions: {}
	 };
	 var serializer = new XMLSerializer();
	 Anychrome.defineSource = function (source) {
             var candidates = source.candidates;
	     handlers.candidates[source.name]
                 = isaArray(candidates)
                 ? function(callback) { callback(candidates); }
                 : candidates;
	     delete source.candidates;
	     if (source.candidatesTransformer) {
		 var transformer = source.candidatesTransformer;
		 handlers.candidatesTransformer[source.name] =
                     function(callback, cands) {
			 transformer(
                             function(transformed) {
			         transformed.forEach(
			             function(x) {
				         if(isaDomNode(x.element))
				             x.element = serializer.serializeToString(x.element);
			             }
			         );
			         callback(transformed);
                             },
                             cands
                         );
		     };
		 delete source.candidatesTransformer;
	     }
	     var actions = source.actions;
	     handlers.actions[source.name] = function(callback, i, cands){
		 actions[i].fn(cands);
		 callback(true);
	     };
	     source.actions = actions.map(
		 function (action) { return { name: action.name }; }
	     );
	     chrome.extension.sendRequest(
		 extensionId, {
		     type: "defineSource",
		     source: source
		 }
	     );
	 };
	 chrome.extension.onRequest.addListener( // XXX onRequestExternal
	     function(req, sender, sendResponse) {
		 if (sender.id !== extensionId) return;
                 if (typeof(handlers[req.type])
                     == 'undefined') return;
                 handlers[req.type][req.name].apply(
		     null, [ sendResponse ].concat(req.args)
                 );
	     }
	 );
     })(this.Anychrome);
}
