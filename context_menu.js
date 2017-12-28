// Create temporary buffer for copying the link to the user's clipboard.
let temp_buffer = document.createElement("textarea");
document.body.appendChild(temp_buffer);

chrome.contextMenus.create({
  id: "copy_link",
  title: chrome.i18n.getMessage("context_menu_copy_link"),
  contexts: ["selection"]
});

chrome.contextMenus.create({
  id: "add_note",
  title: chrome.i18n.getMessage("context_menu_add_note"),
  contexts: ["selection"]
});

// Register a contextmenu click handler, since it's an event page extension
function check_context_item (info, tab) {
  chrome.tabs.sendMessage(
    tab.id, 
    { action: info.menuItemId, 
      url: tab.url, 
      selection: info.selectionText
    }, 
    { frameId: info.frameId }
  )
};


chrome.runtime.onMessage.addListener(function ( url ) {
  // copy url to system clipboard
  temp_buffer.value = url;
  temp_buffer.select();
  document.execCommand("copy", false, null);
  temp_buffer.value = "";
});

//Instruct Chrome to launch a particular function when context menu items are clicked.
chrome.contextMenus.onClicked.addListener(check_context_item);