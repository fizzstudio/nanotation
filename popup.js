const storage = chrome.storage.local;

function get_current_tab_info (callback) {
  var query_info = {
    active: true,
    currentWindow: true
  };

  chrome.tabs.query(query_info, (tabs) => {
    var tab = tabs[0];
    if (tab) {
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
    show_link_lists(page_url);
  });

  const clear_all_button = document.querySelector("#clear_all_button");
  clear_all_button.addEventListener("click", () => {
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
        set_prefs(prefs);
        show_link_lists();
      });
    });
  });


  const download_button = document.querySelector("#download_button");
  download_button.addEventListener("click", download_JSON);

  const store_links_checkbox = document.querySelector("#store_links_checkbox");
  // check if the store_links pref has been set, and set checkbox to match
  // NOTE: links are saved by default
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
});

function show_link_lists ( current_page_url ) {
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

        let details = document.createElement("details");
        details.setAttribute("open", "open");
        if (true !== item.found && "received" === item.origin){
          details.setAttribute("class", "not_found");
        }

        let summary = document.createElement("summary");
        summary.textContent = item.title;
        details.appendChild( summary );

        let p_url = document.createElement("p");
        p_url.setAttribute("class", "url");
        p_url.textContent = item.url;
        details.appendChild( p_url );

        let blockquote = document.createElement("blockquote");
        blockquote.textContent = item.text;
        details.appendChild( blockquote );

        let q_note = null;
        if (item.note) {
          q_note = document.createElement("q");
          q_note.setAttribute("class", "note");
          q_note.textContent = item.note;
          details.appendChild( q_note );
        }

        // let date = new Date(key);
        // let date_str = date.toLocaleDateString()

        li.appendChild( details );

        if ( "sent" === item.origin ){
          sent_link_list.appendChild( li );
          ++sent_count;
        } else if ( "received" === item.origin ){
          received_link_list.appendChild( li );
          ++received_count;
        }

        // TODO: add links to each item

        // TODO: add items on current page to current page list
        if (current_page_url === item.url){
          ++current_count;

          let page_info_item = document.createElement("li");
          if (true !== item.found && "received" === item.origin){
            page_info_item.setAttribute("class", "not_found");
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


function download_JSON () {
  storage.get(null, function (response) {
    let json_export = [];
    for (let key in response) {
      if (("string" === typeof key) && ("prefs" !== key)) {
        let item = response[key];

        let item_obj = {};
        item_obj["title"] = item.title;
        item_obj["url"] = item.url;
        item_obj["link"] = item.link;
        item_obj["text"] = item.text;
        item_obj["note"] = item.note;
        item_obj["timestamp"] = item.visits[0].timestamp;
        item_obj["visits"] = item.visits.length + 1;

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
