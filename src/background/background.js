/**
 * Background Service Worker 初始化
 * 在扩展安装时执行
 */
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    clickCount: 0,
    installDate: new Date().toISOString()
  });
});

/**
 * 从 Chrome 书签 API 获取所有书签
 * @returns {Promise<Array>} 书签数组
 */
function getAllBookmarks() {
  return new Promise((resolve) => {
    chrome.bookmarks.getTree((tree) => {
      const allBookmarks = [];
      traverseBookmarks(tree[0], allBookmarks);
      resolve(allBookmarks);
    });
  });
}

/**
 * 遍历书签树，收集所有书签
 * @param {Object} node 书签节点
 * @param {Array} result 结果数组
 */
function traverseBookmarks(node, result) {
  if (node.children) {
    node.children.forEach((child) => {
      if (child.url) {
        result.push({
          id: child.id,
          title: child.title,
          url: child.url,
          parentId: child.parentId,
          dateAdded: child.dateAdded,
          dateGroupModified: child.dateGroupModified
        });
      }
      traverseBookmarks(child, result);
    });
  }
}

/**
 * 根据域名对书签进行分组
 * @param {Array} bookmarks 书签数组
 * @returns {Object} 按域名分组的书签
 */
function groupBookmarksByDomain(bookmarks) {
  const grouped = {};

  bookmarks.forEach((bookmark) => {
    try {
      const url = new URL(bookmark.url);
      const domain = url.host; // 包含端口
      
      if (!grouped[domain]) {
        grouped[domain] = [];
      }
      grouped[domain].push(bookmark);
    } catch (e) {
      // 忽略无效 URL
      console.warn('Invalid bookmark URL:', bookmark.url);
    }
  });

  return grouped;
}

/**
 * 根据当前页面域名获取相关书签
 * @param {string} currentUrl 当前页面 URL
 * @param {Array} bookmarks 书签数组
 * @returns {Array} 相关书签数组
 */
function getBookmarksByCurrentDomain(currentUrl, bookmarks) {
  try {
    const url = new URL(currentUrl);
    const domain = url.host; // 包含端口
    const grouped = groupBookmarksByDomain(bookmarks);
    return grouped[domain] || [];
  } catch (e) {
    return [];
  }
}

/**
 * 监听来自 content script 或 popup 的消息
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStorage') {
    chrome.storage.local.get(['clickCount', 'installDate'], (result) => {
      sendResponse(result);
    });
    return true;
  }

  if (request.action === 'resetStorage') {
    chrome.storage.local.set({
      clickCount: 0
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'getDomainBookmarks') {
    chrome.bookmarks.getTree((tree) => {
      const allBookmarks = [];
      traverseBookmarks(tree[0], allBookmarks);
      const domainBookmarks = getBookmarksByCurrentDomain(request.url, allBookmarks);
      sendResponse({ bookmarks: domainBookmarks });
    });
    
    return true;
  }
});


