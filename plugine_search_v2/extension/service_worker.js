// track last opened tab for popup convenience
chrome.tabs.onActivated.addListener(async (info) => {
  try {
    const tab = await chrome.tabs.get(info.tabId);
    if (tab?.url) {
      await chrome.storage.local.set({ last_opened_tab: { title: tab.title||'', url: tab.url, time: Date.now() }});
    }
  } catch (e) { console.error(e); }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab?.url) {
    await chrome.storage.local.set({ last_opened_tab: { title: tab.title||'', url: tab.url, time: Date.now() }});
  }
});
