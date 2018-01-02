'use strict';

// handle messages from context menu
chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
  let selection = trim_text( request.selection );
  var url = new URL( request.url );
  var query = url.search;

  var url_params = new URLSearchParams(query);
  url_params.set("text", selection );

  var selection_obj = window.getSelection();
  // console.log(selection_obj.anchorNode.parentElement.closest("[id]"))

  // set hash to nearest element with an id,
  //   in case recipient doesn't have Nanotation extension installed,
  //   or in case something goes wrong in finding match
  var loc_id = find_nearest_id( selection_obj.anchorNode.parentElement );
  if ( loc_id ) {
    url.hash = loc_id;
  }

  if ( "copy_link" === request.action ) {
    url.search = url_params.toString();
    chrome.runtime.sendMessage(null, url.toString());
  } else if ( "add_note" === request.action ) {

    let lightbox_frame = document.createElement("div");
    lightbox_frame.id = "nanotation_lightbox_background";
    let lightbox = document.createElement("dialog");
    lightbox.id = "nanotation_lightbox";
    lightbox.setAttribute("open", "open");

    let blockquote = document.createElement("blockquote");
    blockquote.id = "nanotation_blockquote";
    blockquote.textContent = selection;

    let input = document.createElement("input");
    input.setAttribute("placeholder", "add a short note");
    input.id = "nanotation_input";


    document.body.appendChild(lightbox_frame);
    lightbox_frame.appendChild( lightbox );
    lightbox.appendChild( blockquote );
    lightbox.appendChild( input );

    input.focus();

    const close_lightbox = function() {
      let note = input.value;
      url_params.set("note", note );
      url.search = url_params.toString();
      chrome.runtime.sendMessage(null, url.toString());
      lightbox_frame.remove();
    }

    let copy_button = document.createElement("button");
    copy_button.textContent = "copy link";
    copy_button.onclick = close_lightbox;
    lightbox.appendChild(copy_button);
  }
});

let search_str = null;
let note_str = null;
window.onload = () => {
  var query = window.location.search;
  if(query) {
    var url_params = new URLSearchParams(query);
    search_str = url_params.get("text")
    note_str = url_params.get("note")

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
    mark.setAttribute("data-nanotation", "selection");

    if (note_str) {
      mark.setAttribute("title", note_str);
    }
    range.surroundContents(mark);

    // set scroll position
    // NOTE: When hash is present, it scrolls the window again after this function, so need hack
    // node_el.scrollIntoView({behavior: "smooth", block: "start", inline: "nearest"});
    // TODO: find better solution than setTimeout hack for navigating to the right section
    //    after the hash link has been resolved, which seems to happen after "load" event.
    setTimeout(function(){
      var mark_el = document.querySelector("[data-nanotation=selection]")
      mark_el.parentNode.scrollIntoView({behavior: "smooth", block: "start", inline: "nearest"});
    }, 1000);
}

  return found;
}

function trim_text( text_str ) {
  text_str = text_str.replace(/(\r\n|\n|\r)/gm, "").replace(/\s+/g, " ").trim();
  return text_str;
}

function find_nearest_id( el ) {
  var id_el = el;
  var id = id_el.id;

  // first check previous siblings for an id
  while ( !id ) {
    id_el = id_el.previousElementSibling;
    if (!id_el) {
      break;
    }
    id = id_el.id;
  }

  // if no previous siblings has an id, find the closest ancestor with an id
  if ( !id ) {
    id_el = el.closest("[id]");
    if (id_el) {
      id = id_el.id;
    }
  }

  return id;
}
