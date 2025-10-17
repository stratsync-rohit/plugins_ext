
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab?.url) {
      await chrome.storage.local.set({
        last_opened_tab: { title: tab.title || '', url: tab.url, time: Date.now() }
      });
    }
  } catch (e) { console.error(e); }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab?.url) {
    await chrome.storage.local.set({
      last_opened_tab: { title: tab.title || '', url: tab.url, time: Date.now() }
    });
  }
});


chrome.action.onClicked.addListener(async () => {
  try {
    const url = chrome.runtime.getURL('popup.html');
    await chrome.tabs.create({ url });
  } catch (e) {
    console.error('Failed to open tab for popup.html', e);
  }
});