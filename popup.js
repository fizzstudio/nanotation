const storage = chrome.storage.local;
let active_tab = null;
let search_input = null;
let all_links = null;

function get_current_tab_info (callback) {
  var query_info = {
    active: true,
    currentWindow: true
  };

  chrome.tabs.query(query_info, (tabs) => {
    var tab = tabs[0];
    if (tab) {
      active_tab = tab;
      var tab_info = {
        url: tab.url,
        title: tab.title
      };
      callback(tab_info);
    }
  });
}

function set_prefs (prefs, callback) {
  let sync_item = {
    prefs: prefs
  };

  storage.set(sync_item, (item) => {
    console.log("stored:", item);
  });
}

document.addEventListener( "DOMContentLoaded", () => {
  get_current_tab_info ( (tab_info) => {
    let page_url = null;
    const page_info = document.querySelector("#page_info");
    if (page_info) {
      const url = new URL(tab_info.url);
      page_url = url.hostname + url.pathname;

      const page_info_h2 = document.querySelector("#page_info > h2");
      page_info_h2.textContent = tab_info.title;

      const page_info_p = document.querySelector("#page_info > p");
      page_info_p.textContent = page_url;
    }
    update_link_lists(page_url);
  });

  const delete_links_button = document.querySelector("#delete_links_button");
  delete_links_button.addEventListener("click",  delete_all_links);


  const download_button = document.querySelector("#download_button");
  download_button.addEventListener("click", download_JSON);

  // check if the store_links pref has been set, and set checkbox to match
  // NOTE: links are saved by default
  const store_links_checkbox = document.querySelector("#store_links_checkbox");
  let store_links = true;
  storage.get("prefs", (items) => {
    if (items.prefs) {
      store_links = items.prefs.store_links;
    } else {
      let prefs = {
        "store_links": store_links
      };

      set_prefs(prefs, (item) => {
        console.log("stored:", item);
      });
    }
    store_links_checkbox.checked = store_links;
  });


  store_links_checkbox.addEventListener("change", () => {
    let prefs = {
      "store_links": store_links_checkbox.checked
    };

    set_prefs(prefs, (item) => {
      console.log("stored:", item);
    });
  });


  // search
  search_input = document.querySelector("input[id=search_input]");
  search_input.addEventListener("search", search_links);

});

function update_link_lists ( current_page_url ) {
  const sent_link_list = document.querySelector("#sent_link_list");
  const sent_count_el = document.querySelector("#sent_count");
  const received_link_list = document.querySelector("#received_link_list");
  const received_count_el = document.querySelector("#received_count");
  const page_info_list = document.querySelector("#page_info > ul");

  clear_list(sent_link_list);
  clear_list(received_link_list);
  clear_list(page_info_list );

  storage.get(null, function (storage_array) {
    let current_count = 0;
    let sent_count = 0;
    let received_count = 0;
    for (let key in storage_array) {
      if (("string" === typeof key) && ("prefs" !== key)) {
        let item = storage_array[key];
        let li = document.createElement("li");
        li.classList.add("link_item");


        let details = document.createElement("details");
        details.setAttribute("open", "open");
        if (true !== item.found && "received" === item.origin){
          details.classList.add("not_found");
        }

        let summary = document.createElement("summary");
        summary.textContent = item.title;
        details.appendChild( summary );

        let item_controls = document.createElement("section");
        item_controls.classList.add("item_controls");
        details.appendChild( item_controls );

        let link_button = document.createElement("button");
        link_button.classList.add("link");
        add_icon(link_button, "link", "open link in new tab");
        let button_a = document.createElement("a");
        button_a.setAttribute("href", item.link);
        button_a.setAttribute("target", "_blank");
        button_a.appendChild( link_button );
        item_controls.appendChild( button_a );

        let delete_button = document.createElement("button");
        delete_button.classList.add("delete");
        add_icon(delete_button, "delete", "delete item from link history");
        delete_button.addEventListener("click", remove_item);
        item_controls.appendChild( delete_button );


        let item_content = document.createElement("section");
        item_content.classList.add("item_content");
        details.appendChild( item_content );

        // add links to each item
        let visit_message = (item.visits.length + 1) + " visits\nfirst visit: "
                          + (new Date(item.visits[0].timestamp)).toDateString()

        let p_url = document.createElement("p");
        p_url.classList.add("url");
        let a = document.createElement("a");
        a.setAttribute("href", item.link);
        a.setAttribute("target", "_blank");
        a.setAttribute("title", visit_message);
        a.textContent = item.url;
        p_url.appendChild( a );
        item_content.appendChild( p_url );

        let blockquote = document.createElement("blockquote");
        blockquote.textContent = item.text;
        item_content.appendChild( blockquote );

        let q_note = null;
        if (item.note) {
          q_note = document.createElement("q");
          q_note.classList.add("note");
          q_note.textContent = item.note;
          item_content.appendChild( q_note );
        }


        // let date = new Date(key);
        // let date_str = date.toLocaleDateString()

        li.appendChild( details );

        if ( "sent" === item.origin ){
          li.id = "sent-" + key;
          sent_link_list.appendChild( li );
          ++sent_count;
        } else if ( "received" === item.origin ){
          li.id = "received-" + key;
          received_link_list.appendChild( li );
          ++received_count;
        }

        // add items on current page to current page list
        if (current_page_url === item.url){
          ++current_count;

          let page_info_item = document.createElement("li");
          page_info_item.id = "current-" + key;
          page_info_item.classList.add("link_item");

          if (true !== item.found && "received" === item.origin){
            page_info_item.classList.add("not_found");
          } else {
            page_info_item.addEventListener("click", find_quote_in_page);
          }

          let page_info_blockquote = blockquote.cloneNode(true);
          page_info_item.appendChild( page_info_blockquote );

          if (q_note) {
            let page_info_q_note = q_note.cloneNode(true);
            page_info_item.appendChild( page_info_q_note );
          }

          page_info_list.appendChild( page_info_item );
        }
      }
    }

    // set_badge(current_count);
    sent_count_el.textContent = `(${sent_count})`;
    received_count_el.textContent = `(${received_count})`;
    chrome.runtime.sendMessage(null, {
      action: "update_badge",
      details: {
        count: current_count
      }
    });

    show_list_placeholder(sent_link_list);
    show_list_placeholder(received_link_list);
    show_list_placeholder(page_info_list);

    all_links = document.querySelectorAll("li.link_item");
  });
}

function add_icon ( target_el, icon_name, icon_title ) {
  const svgns = "http://www.w3.org/2000/svg";
  const xlinkns = "http://www.w3.org/1999/xlink";

  let icon_frame = document.createElementNS(svgns, "svg");
  let icon = document.createElementNS(svgns, "use");
  icon.setAttributeNS(xlinkns, "href", `#${icon_name}_icon`);
  let icon_title_el = document.createElementNS(svgns, "title");
  icon_title_el.textContent = icon_title || icon_name;
  icon.appendChild( icon_title_el );
  icon_frame.appendChild( icon );
  target_el.appendChild( icon_frame );
}

function remove_item (event) {
  const delete_button = event.currentTarget;
  const item = delete_button.closest("li[id]");
  const item_key = item.id.split("-")[1];
  // console.info(delete_button, item, item.id)

  // allow deleting individual links
  storage.remove(item_key, () => {
    item.remove()
    console.log("removed", );
  });
}

function delete_all_links (event) {
  const confirm_delete_dialog = document.querySelector("#confirm_delete_dialog");
  confirm_delete_dialog.showModal();


  document.querySelector("#cancel_delete_button").addEventListener("click", function() {
    console.log("cancel");
    confirm_delete_dialog.close();
  });

  document.querySelector("#confirm_delete_button").addEventListener("click", function() {
    console.log("delete");

    // save and restore prefs after clearing
    storage.get("prefs", (result) => {
      let store_links = true;
      if (result.prefs) {
        store_links = result.prefs.store_links;
      }

      let prefs = {
        "store_links": store_links
      };

      storage.clear( () => {
        // restore prefs
        set_prefs(prefs);
        update_link_lists();
      });
    });

    confirm_delete_dialog.close();
  });

}

function clear_list (list_el) {
  while (list_el.firstChild) {
    list_el.removeChild(list_el.firstChild);
  }
}

function show_list_placeholder (list_el) {
  if (!list_el.firstElementChild) {
    let li = document.createElement("li");
    let i = document.createElement("i");
    i.textContent = "No links stored";
    li.appendChild( i );
    list_el.appendChild( li );
  }
}


function search_links () {
  let search_str = search_input.value.toLowerCase();
  all_links.forEach(function(item, i) {
    let list_text = item.textContent.toLowerCase().replace(/\s+/g, " ");
    let search_index = list_text.indexOf(search_str);
    if (-1 == search_index) {
      item.classList.add("hide");
    } else {
      item.classList.remove("hide");
    }

    // TODO: highlight text matches
  });
}


function find_quote_in_page ( event ) {
  const target = event.currentTarget;

  let text = null;
  let text_el = target.querySelector("blockquote");
  if (text_el) {
    text = text_el.textContent;
  }

  let note = null;
  let note_el = target.querySelector("q");
  if (note_el) {
    note = note_el.textContent;
  }

  // NOTE: to send a message between the popup and content script,
  //       we have to use chrome.tabs and include a tab id
  chrome.tabs.sendMessage(active_tab.id, {
    action: "show_quote",
    details: {
      text: text,
      note: note
    }
  });
}


function download_JSON () {
  storage.get(null, function (response) {
    let seq_id = 0;
    let json_export = [];
    for (let key in response) {
      if (("string" === typeof key) && ("prefs" !== key)) {
        let item = response[key];

        let item_obj = {};
        item_obj["@context"] = "http://www.w3.org/ns/anno.jsonld";
        item_obj["id"] = "http://fizz.studio/nanotation/"
                          + Date.now() + "-"
                          + seq_id++ + "-"
                          + Math.floor(Math.random() * 10000);
        item_obj["type"] = "Annotation";
        item_obj["target"] = {};
        item_obj["target"]["title"] = item.title;
        item_obj["target"]["source"] = item.url;
        item_obj["target"]["selector"] = {};
        item_obj["target"]["selector"]["exact"] = item.text;
        item_obj["target"]["selector"]["type"] = "TextQuoteSelector";
        item_obj["bodyValue"] = item.note;
        item_obj["created"] = (new Date(item.visits[0].timestamp)).toISOString();
        item_obj["visits"] = item.visits.length + 1;
        item_obj["link"] = item.link;

        json_export.push(item_obj)
      }
    }

    const controls = document.querySelector("section#controls");
    let timestamp = new Date().getTime();

    var download_link = document.createElement("a");
    var data_str = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(json_export, null, 2));
    download_link.setAttribute("style", "display: none");
    download_link.setAttribute("href", data_str);
    download_link.setAttribute("download", `Nanotation-data-${timestamp}.json`);
    controls.appendChild(download_link);
    download_link.click();
    download_link.remove();
  });
}
