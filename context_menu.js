// Create temporary buffer for copying the link to the user's clipboard.
let temp_buffer = document.createElement("textarea");
document.body.appendChild(temp_buffer);

chrome.contextMenus.create({
  id: chrome.i18n.getMessage("extension_name"),
  title: chrome.i18n.getMessage("context_menu_entry"),
  contexts: ["selection"]
});

// Register a contextmenu click handler, since it's an event page extension
chrome.contextMenus.onClicked.addListener(function (info, tab) {
  // Send the url and selection text to the content script, which will return the share link
  chrome.tabs.sendMessage(
    tab.id, 
    {url: tab.url, selection: info.selectionText}, 
    {frameId: info.frameId}
  );
})

chrome.runtime.onMessage.addListener(function ( url ) {
  // copy url to system clipboard
  temp_buffer.value = url;
  temp_buffer.select();
  document.execCommand("copy", false, null);
  temp_buffer.value = "";
});