/**
 * 收藏夹管理核心模块
 * 提供书签的读取、分组、修改和删除功能
 */

class BookmarksManager {
  /**
   * 初始化收藏夹管理器
   */
  constructor() {
    this.bookmarks = [];
    this.groupedBookmarks = {};
  }

  /**
   * 从 Chrome 书签 API 获取所有书签
   * @returns {Promise<Array>} 书签数组
   */
  async getAllBookmarks() {
    return new Promise((resolve) => {
      chrome.bookmarks.getTree((tree) => {
        const allBookmarks = [];
        this._traverseBookmarks(tree[0], allBookmarks);
        this.bookmarks = allBookmarks;
        this.groupedBookmarks = this._groupBookmarksByDomain(allBookmarks);
        resolve(allBookmarks);
      });
    });
  }

  /**
   * 遍历书签树，收集所有书签
   * @param {Object} node 书签节点
   * @param {Array} result 结果数组
   * @private
   */
  _traverseBookmarks(node, result) {
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
        this._traverseBookmarks(child, result);
      });
    }
  }

  /**
   * 提取一级域名
   * @param {string} hostname 完整的主机名
   * @returns {string} 一级域名
   * @private
   */
  _getTopLevelDomain(hostname) {
    // 处理 localhost
    if (hostname === 'localhost' || hostname.match(/^127\.0\.0\.1$/) || hostname.match(/^192\.168\.\d+\.\d+$/)) {
      return hostname;
    }
    
    // 处理 IP 地址
    if (hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      return hostname;
    }
    
    // 常见的多级别顶级域名
    const multiLevelTLDs = [
      'co.uk', 'com.au', 'net.au', 'org.au', 'edu.au',
      'co.in', 'com.in', 'net.in', 'org.in',
      'co.jp', 'com.jp', 'net.jp', 'org.jp',
      'co.ca', 'com.ca', 'net.ca', 'org.ca'
    ];
    
    const parts = hostname.split('.');
    
    // 如果是多级别顶级域名，取最后三个部分
    for (const tld of multiLevelTLDs) {
      const tldParts = tld.split('.');
      if (parts.length > tldParts.length) {
        const suffix = parts.slice(-tldParts.length).join('.');
        if (suffix === tld) {
          return parts.slice(-tldParts.length - 1).join('.');
        }
      }
    }
    
    // 默认取最后两个部分
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    
    return hostname;
  }

  /**
   * 根据域名对书签进行分组
   * @param {Array} bookmarks 书签数组
   * @returns {Object} 按域名分组的书签
   * @private
   */
  _groupBookmarksByDomain(bookmarks) {
    const grouped = {};

    bookmarks.forEach((bookmark) => {
      try {
        const url = new URL(bookmark.url);
        const topLevelDomain = this._getTopLevelDomain(url.hostname);
        
        if (!grouped[topLevelDomain]) {
          grouped[topLevelDomain] = [];
        }
        grouped[topLevelDomain].push(bookmark);
      } catch (e) {
        // 忽略无效 URL
        console.warn('Invalid bookmark URL:', bookmark.url);
      }
    });

    return grouped;
  }

  /**
   * 获取按域名分组的书签
   * @returns {Object} 按域名分组的书签
   */
  getGroupedBookmarks() {
    return this.groupedBookmarks;
  }

  /**
   * 根据当前页面域名获取相关书签
   * @param {string} currentUrl 当前页面 URL
   * @returns {Array} 相关书签数组
   */
  getBookmarksByCurrentDomain(currentUrl) {
    try {
      const url = new URL(currentUrl);
      const topLevelDomain = this._getTopLevelDomain(url.hostname);
      return this.groupedBookmarks[topLevelDomain] || [];
    } catch (e) {
      return [];
    }
  }

  /**
   * 创建新书签
   * @param {string} title 书签标题
   * @param {string} url 书签 URL
   * @param {string} parentId 父文件夹 ID
   * @returns {Promise<Object>} 创建的书签
   */
  async createBookmark(title, url, parentId = '1') {
    return new Promise((resolve) => {
      chrome.bookmarks.create({
        parentId: parentId,
        title: title,
        url: url
      }, (bookmark) => {
        // 更新本地缓存
        this.getAllBookmarks();
        resolve(bookmark);
      });
    });
  }

  /**
   * 更新书签
   * @param {string} id 书签 ID
   * @param {Object} changes 要更改的属性
   * @returns {Promise<Object>} 更新后的书签
   */
  async updateBookmark(id, changes) {
    return new Promise((resolve) => {
      chrome.bookmarks.update(id, changes, (bookmark) => {
        // 更新本地缓存
        this.getAllBookmarks();
        resolve(bookmark);
      });
    });
  }

  /**
   * 删除书签
   * @param {string} id 书签 ID
   * @returns {Promise<void>}
   */
  async deleteBookmark(id) {
    return new Promise((resolve) => {
      chrome.bookmarks.remove(id, () => {
        // 更新本地缓存
        this.getAllBookmarks();
        resolve();
      });
    });
  }

  /**
   * 搜索书签
   * @param {string} query 搜索关键词
   * @returns {Array} 匹配的书签
   */
  searchBookmarks(query) {
    return this.bookmarks.filter((bookmark) => {
      return bookmark.title.toLowerCase().includes(query.toLowerCase()) ||
             bookmark.url.toLowerCase().includes(query.toLowerCase());
    });
  }
}

// 导出单例实例
const bookmarksManager = new BookmarksManager();
export default bookmarksManager;
