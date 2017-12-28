'use strict';

chrome.runtime.onMessage.addListener(function ( msg ) {
  var url = new URL( msg.url );
  var query = url.search;

  var selection = trim_text( msg.selection );

  var url_params = new URLSearchParams(query);
  url_params.set("text", encodeURIComponent(selection) );
  url.search = url_params.toString();

  chrome.runtime.sendMessage(null, url.toString());
});

let search_str = null;
window.onload = () => {
  var query = window.location.search;
  if(query) {
    var url_params = new URLSearchParams(query);
    search_str = url_params.get("text")
    try {
      search_str = decodeURI(search_str);
    } catch(e) { 
      // catch malformed URL
      console.error(e);
    }

    search_str = trim_text(search_str);

    find_text_nodes();
  }
}

function find_text_nodes() {
  var rejectScriptStyleFilter = {
    acceptNode: function(node) {
      if ( "script" !== node.parentNode.nodeName.toLowerCase() 
        && "style" !== node.parentNode.nodeName.toLowerCase()) {
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  };
  
  var walker = document.createTreeWalker(
    document.body, 
    NodeFilter.SHOW_TEXT, 
    rejectScriptStyleFilter,
    false
  );
  
  var node;
  var textNodes = [];
  
  var found = false;
  while(node = walker.nextNode()) {
    if (!found) {
      found = highlight_text(node);
    }
  }
}

function highlight_text( node ) {
  var target_text = trim_text(node.textContent);

  var found = false;
  var start_index = target_text.indexOf( search_str )
  if (-1 != start_index) {
    found = true;

    var node_el = node.parentElement;
    
    node.nodeValue = target_text;
 
    var range = document.createRange();
    range.setStart(node, start_index);
    range.setEnd(node, start_index + search_str.length);

    var mark = document.createElement("mark");
  
    range.surroundContents(mark);

    // set scroll position
    node_el.scrollIntoView({behavior: "smooth", block: "start", inline: "nearest"});
  }

  return found;
}

function trim_text( text_str ) {
  text_str = text_str.replace(/(\r\n|\n|\r)/gm, "").replace(/\s+/g, " ").trim();
  return text_str;
}
