'use strict';

// find selection on load
let search_str = null;
let note_str = null;
let page_url = null;
let page_title = null;
let link = window.location.toString();
window.onload = () => {
  let location = window.location;
  page_url = location.hostname + location.pathname;
  page_title = document.title;

  let is_annotation = false;
  let query = location.search;
  if(query) {
    var url_params = new URLSearchParams(query);
    search_str = url_params.get("text");
    note_str = url_params.get("note");

    if (search_str) {
      is_annotation = false;
      search_str = trim_text(search_str);
      find_text_nodes();
    }
  }

  if (!is_annotation) {
    chrome.runtime.sendMessage(null, {
      action: "update_badge",
      details: {
        count: 0
      }
    });
  }

}

function find_text_nodes() {
  var rejectScriptStyleSpaceFilter = {
    acceptNode: function(node) {
      if ( "script" !== node.parentNode.nodeName.toLowerCase()
        && "style" !== node.parentNode.nodeName.toLowerCase()
        && ( ! /^\s*$/.test(node.data) ) ) {
        // filter out nodes in 'script' or 'style' elements, or are whitespace-only
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  };

  var walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    rejectScriptStyleSpaceFilter,
    false
  );

  var node;
  var textNodes = [];

  var found = false;
  var mark_id = null;
  while(node = walker.nextNode()) {
    if (!found) {
      let result = show_selection(node);
      found = result.found;
      mark_id = result.mark_id;
    }
  }

  chrome.runtime.sendMessage(null,
    {
      action: "store_link",
      details: {
        url: page_url,
        title: page_title,
        text: search_str,
        note: note_str,
        link: link,
        mark_id: mark_id,
        found: found,
        origin: "received"
      }
    }
  );
}

function show_selection( node ) {
  var target_text = trim_text(node.textContent);

  var mark_id = null;
  var found = false;
  var start_index = target_text.indexOf( search_str )
  if (-1 != start_index) {
    found = true;

    var node_el = node.parentElement;

    node.nodeValue = target_text;

    var range = document.createRange();
    range.setStart(node, start_index);
    range.setEnd(node, start_index + search_str.length);

    mark_id = generate_unique_id("nanotation")
    var mark_el = document.createElement("mark");
    mark_el.setAttribute("id", mark_id );
    mark_el.setAttribute("data-nanotation", "selection");
    mark_el.setAttribute("tabindex", "-1");

    if (note_str) {
      mark_el.setAttribute("title", note_str);
    }
    range.surroundContents(mark_el);

    // set scroll position
    scroll_to_mark ( mark_id, 1000 );
  }
  return {
    found: found,
    mark_id: mark_id
  };
}


function find_selection ( details ) {
  search_str = details.text;
  note_str = details.note;

  var selection_mark = null;
  var marks = document.querySelectorAll("mark");
  for (var m = 0, m_len = marks.length; m_len > m; ++m) {
    let each_mark = marks[m];
    if ( search_str === each_mark.textContent ) {
      selection_mark = each_mark;
      break;
    }
  }

  if (selection_mark ) {
    scroll_to_mark( selection_mark.id, 300 );
  } else {
    find_text_nodes();
  }
}


function scroll_to_mark ( mark_id, timeout ) {
  // set scroll position
  // NOTE: When hash is present, it scrolls the window again after this function, so need hack
  // node_el.scrollIntoView({behavior: "smooth", block: "start", inline: "nearest"});
  // TODO: find better solution than setTimeout hack for navigating
  //       to the right section after the hash link has been resolved,
  //       which seems to happen after "load" event.s
  setTimeout(function(){
    // let mark_el = document.querySelector("[data-nanotation=selection]");
    let mark_el = document.querySelector(`#${mark_id}`);
    mark_el.parentNode.scrollIntoView({behavior: "smooth", block: "start", inline: "nearest"});
    mark_el.focus();
  }, timeout);
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


function generate_unique_id( base_id ) {
  var i = 0;
  var uid = base_id + "-" + i;
  while ( null != document.getElementById( uid ) ) {
    uid = base_id + "-" + ++i;
  }
  return uid;
}



// handle messages from context menu and popup
chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
  if ( "show_quote" === request.action ) {
    find_selection ( request.details );
  } else {
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

    let location = window.location;
    let details = {
      url: location.hostname + location.pathname,
      title: document.title,
      text: selection,
      note: null,
      link: null
    }

    if ( "copy_link" === request.action ) {
      // TODO: wipe previous note if one exists in the params
      url.search = url_params.toString();
      details.link = url.toString();
      save_link( details );

    } else if ( "add_note" === request.action ) {
      const close_lightbox = function() {
        // close lightbox
        const lightbox_frame = document.querySelector("#nanotation_lightbox_frame");
        if (lightbox_frame) {
          lightbox_frame.remove();
        }
      }

      const completed = function() {
        const input = document.querySelector("input#nanotation_input");
        let note = input.value;
        url_params.set("note", note );
        url.search = url_params.toString();
        details.note = note;
        details.link = url.toString();
        save_link( details );

        // close lightbox
        close_lightbox();
      }

      show_lightbox ( selection, completed, close_lightbox );
    }
  }
});

function show_lightbox ( selection, completed_callback, close_callback ) {
  let lightbox_frame = document.createElement("div");
  lightbox_frame.id = "nanotation_lightbox_frame";
  // lightbox_frame.onclick = close_callback;

  let lightbox = document.createElement("dialog");
  lightbox.id = "nanotation_lightbox";
  lightbox.setAttribute("open", "open");

  let blockquote = document.createElement("blockquote");
  blockquote.id = "nanotation_blockquote";
  blockquote.textContent = selection;

  let input = document.createElement("input");
  input.setAttribute("placeholder", "add a short note");
  input.id = "nanotation_input";

  let copy_button = document.createElement("button");
  copy_button.textContent = "copy link";
  copy_button.onclick = completed_callback;

  lightbox_frame.appendChild( lightbox );
  lightbox.appendChild( blockquote );
  lightbox.appendChild( input );
  lightbox.appendChild(copy_button);

  document.body.appendChild(lightbox_frame);

  input.focus();
}

function save_link( details ) {
  chrome.runtime.sendMessage(null,
    {
      action: "copy_to_clipboard",
      url: details.link
    }
  );

  details.origin = "sent";
  chrome.runtime.sendMessage(null,
    {
      action: "store_link",
      details: details
    }
  );
}
