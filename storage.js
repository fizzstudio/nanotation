const storage = chrome.storage.local;

function create_storage_item ( details ) {
  let item_data = details;
  item_data.visits = [];
  item_data.visits.push({
    timestamp: Date.now()
  });

  let item = {
    "checksum": get_checksum( item_data.link ),
    "data": item_data
  };

  return item;
}

function sync_storage ( new_item ) {
  // if item already exists, update visits, don't add new entry
  let checksum = new_item.checksum;
  storage.get(checksum, function ( result ) {
    let sync_item = {};
    let existing_data = result[checksum];
    if ( existing_data ) {
      existing_data.visits.push({
        timestamp: new_item.data.visits[0].timestamp
      });
      sync_item[checksum] = existing_data;
    } else {
      sync_item[checksum] = new_item.data;
    }

    storage.set(sync_item, (new_result) => {
      get_tab_matches( sync_item[checksum].url );
    });
  });
}


function get_tab_matches ( tab_url ) {
  storage.get(null,  function ( result ) {
    let current_tab_count = 0;
    for (let key in result) {
      if (("string" === typeof key) && ("prefs" !== key)) {
        let item = result[key];
        if (tab_url === item.url){
          current_tab_count++;
        }
      }
    }
    set_badge(current_tab_count);
  });
}


// add count of items on current page to icon badge
function set_badge ( count ) {
  let count_str = count.toString()
  if ( 999 < count ) {
    // limit to 4 characters
    count_str += "+";
  }

  let badge_color = { color: [199, 108, 12, 225] };
  if ("0" === count_str) {
    // if no matches on current page, hide badge
    count_str = "";
    badge_color = badge_color = { color: [199, 108, 12, 0] };
  }
  chrome.browserAction.setBadgeBackgroundColor(badge_color);
  chrome.browserAction.setBadgeText({ text: count_str });
}

function get_checksum ( str ) {
  let checksum = 6284;
  for (var c = 0, c_len = str.length; c_len > c; ++c) {
    checksum = checksum * 33 ^ str.charCodeAt(c);
  }
  // Convert from 32-bit signed to unsigned
  return String(checksum >>> 0);
}

chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
  if ("store_link" === request.action ){
    // on first start, might not have prefs saved, so save links by default
    let store_links = true;
    storage.get("prefs", (items) => {
      if (items.prefs) {
        store_links = items.prefs.store_links;
      }

      if ( true === store_links ){
        let item = create_storage_item(request.details);
        sync_storage(item);
      }
    });
  } else if ("update_badge" === request.action ){
    set_badge ( request.details.count );
  }
});
