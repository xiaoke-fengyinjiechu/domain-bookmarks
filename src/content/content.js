/**
 * Content Script 初始化函数
 * 在页面加载完成后执行
 */
function initContentScript() {
  // 确保 document.body 存在
  if (!document.body) {
    document.addEventListener('DOMContentLoaded', initContentScript);
    return;
  }

  /**
   * 向页面注入一个标记元素
   */
  const badge = document.createElement('div');
  badge.id = 'chrome-extension-badge';
  badge.style.cssText = `
    position: fixed !important;
    top: 10px !important;
    right: 10px !important;
    background-color: #4285f4 !important;
    color: white !important;
    padding: 8px 12px !important;
    border-radius: 4px !important;
    font-family: Arial, sans-serif !important;
    font-size: 12px !important;
    z-index: 2147483647 !important;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
    cursor: move !important;
    pointer-events: auto !important;
    display: block !important;
    visibility: visible !important;
    user-select: none !important;
  `;
  
  // 创建关闭按钮
  const closeButton = document.createElement('span');
  closeButton.textContent = '×';
  closeButton.style.cssText = `
    margin-left: 8px !important;
    font-weight: bold !important;
    cursor: pointer !important;
    font-size: 14px !important;
  `;
  
  // 创建文本元素
  const badgeText = document.createElement('span');
  badgeText.textContent = '🔖 收藏夹';
  
  // 组装标记元素
  badge.appendChild(badgeText);
  badge.appendChild(closeButton);
  document.body.appendChild(badge);
  
  /**
   * 拖动功能实现
   */
  let isDragging = false;
  let startX, startY, initialLeft, initialTop;
  let hasDragged = false; // 标记是否发生了拖动
  
  badge.addEventListener('mousedown', (e) => {
    // 只有当点击的不是关闭按钮时才开始拖动
    if (e.target !== closeButton) {
      isDragging = true;
      hasDragged = false;
      startX = e.clientX;
      startY = e.clientY;
      
      // 获取当前位置
      const rect = badge.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      
      // 更改光标样式
      badge.style.setProperty('cursor', 'grabbing', 'important');
      e.preventDefault();
    }
  });
  
  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      // 计算移动距离
      const distance = Math.sqrt(dx * dx + dy * dy);
      // 如果移动距离超过3像素，认为是拖动
      if (distance > 3) {
        hasDragged = true;
      }
      
      // 计算新位置
      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;
      
      // 获取窗口和元素尺寸
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const badgeRect = badge.getBoundingClientRect();
      const badgeWidth = badgeRect.width;
      const badgeHeight = badgeRect.height;
      
      // 边界判断：确保元素不会超出窗口边界
      const minLeft = 0;
      const maxLeft = windowWidth - badgeWidth;
      const minTop = 0;
      const maxTop = windowHeight - badgeHeight;
      
      // 限制位置在边界范围内
      newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
      newTop = Math.max(minTop, Math.min(newTop, maxTop));
      
      // 设置新位置
      badge.style.setProperty('left', `${newLeft}px`, 'important');
      badge.style.setProperty('top', `${newTop}px`, 'important');
      badge.style.setProperty('right', 'auto', 'important');
      
      // 如果收藏夹面板正在显示，跟随标记元素移动
      if (bookmarksPanel.style.display === 'block') {
        updateBookmarksPanelPosition();
      }
    }
  });
  
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      // 恢复光标样式
      badge.style.setProperty('cursor', 'move', 'important');
    }
  });
  
  /**
   * 关闭按钮功能
   */
  closeButton.addEventListener('click', (e) => {
    e.stopPropagation(); // 防止触发badge的点击事件
    badge.style.display = 'none';
    hideBookmarksPanel();
  });

  /**
   * 创建收藏夹面板
   */
  const bookmarksPanel = document.createElement('div');
  bookmarksPanel.id = 'chrome-extension-bookmarks-panel';
  bookmarksPanel.style.cssText = `
    position: fixed;
    width: 300px;
    max-height: 400px;
    background-color: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    z-index: 999998;
    display: none;
    overflow-y: auto;
  `;
  document.body.appendChild(bookmarksPanel);

  /**
   * 更新收藏夹面板位置
   * 基于标记元素当前位置显示
   */
  function updateBookmarksPanelPosition() {
    const badgeRect = badge.getBoundingClientRect();
    const panelTop = badgeRect.bottom + 5; // 标记元素底部下方5像素
    const panelRight = window.innerWidth - badgeRect.right; // 与标记元素右对齐
    
    bookmarksPanel.style.setProperty('top', `${panelTop}px`, 'important');
    bookmarksPanel.style.setProperty('right', `${panelRight}px`, 'important');
  }

  /**
   * 显示收藏夹面板
   */
  function showBookmarksPanel() {
    updateBookmarksPanelPosition();
    bookmarksPanel.style.display = 'block';
    loadDomainBookmarks();
  }

  /**
   * 隐藏收藏夹面板
   */
  function hideBookmarksPanel() {
    bookmarksPanel.style.display = 'none';
  }

  /**
   * 加载当前域名的收藏夹
   */
  async function loadDomainBookmarks() {
    const currentUrl = window.location.href;
    
    // 使用 Promise 方式发送消息，并添加超时
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('请求超时')), 5000);
      });
      
      const messagePromise = chrome.runtime.sendMessage({ 
        action: 'getDomainBookmarks', 
        url: currentUrl 
      });
      
      const response = await Promise.race([messagePromise, timeoutPromise]);
      
      if (response && response.bookmarks) {
        renderDomainBookmarks(response.bookmarks);
      } else {
        renderNoBookmarks();
      }
    } catch (error) {
      renderNoBookmarks();
    }
  }

  /**
   * 渲染域名收藏夹
   * @param {Array} bookmarks 收藏夹数组
   */
  function renderDomainBookmarks(bookmarks) {
    let html = `
      <div style="padding: 10px; border-bottom: 1px solid #eee;">
        <h3 style="margin: 0; font-size: 14px; color: #333;">当前域名收藏夹</h3>
      </div>
    `;

    if (bookmarks.length === 0) {
      html += `
        <div style="padding: 20px; text-align: center; color: #666;font-size: 13px;">
          暂无收藏
        </div>
      `;
    } else {
      html += '<ul style="margin: 0; padding: 0; list-style: none;">';
      
      bookmarks.forEach((bookmark) => {
        try {
          const url = new URL(bookmark.url);
          const faviconUrl = new URL('/favicon.ico', url.origin).href;
          
          html += `
            <li style="padding: 8px 10px; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center;">
              <img src="${faviconUrl}" alt="favicon" style="width: 16px; height: 16px; margin-right: 8px;">
              <a href="${bookmark.url}" target="_blank" style="color: #1a73e8; text-decoration: none; font-size: 13px; flex: 1;">
                ${bookmark.title||bookmark.url}
              </a>
            </li>
          `;
        } catch (e) {
          // 处理无效 URL
          html += `
            <li style="padding: 8px 10px; border-bottom: 1px solid #f0f0f0;">
              <a href="${bookmark.url}" target="_blank" style="color: #1a73e8; text-decoration: none; font-size: 13px; display: block;">
                ${bookmark.title||bookmark.url}
              </a>
            </li>
          `;
        }
      });
      
      html += '</ul>';
    }

    bookmarksPanel.innerHTML = html;
  }

  /**
   * 渲染无收藏夹提示
   */
  function renderNoBookmarks() {
    const html = `
      <div style="padding: 10px; border-bottom: 1px solid #eee;">
        <h3 style="margin: 0; font-size: 14px; color: #333;">当前域名收藏夹</h3>
      </div>
      <div style="padding: 20px; text-align: center; color: #666;font-size: 13px;">
        加载失败或暂无收藏
      </div>
    `;
    bookmarksPanel.innerHTML = html;
  }

  /**
   * 切换收藏夹面板显示/隐藏
   */
  badge.addEventListener('click', (e) => {
    e.stopPropagation();
    // 只有在没有拖动的情况下才触发面板显示/隐藏
    if (!hasDragged) {
      if (bookmarksPanel.style.display === 'block') {
        hideBookmarksPanel();
      } else {
        showBookmarksPanel();
      }
    }
  });

  /**
   * 点击页面其他地方隐藏面板
   */
  document.addEventListener('click', (e) => {
    if (!badge.contains(e.target) && !bookmarksPanel.contains(e.target)) {
      hideBookmarksPanel();
    }
  });

  /**
   * 监听来自 popup 或 background 的消息
   */
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getPageInfo') {
      const pageInfo = {
        title: document.title,
        url: window.location.href,
        timestamp: new Date().toISOString()
      };
      sendResponse(pageInfo);
    }
  });
}

/**
 * 页面加载完成后初始化
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContentScript);
} else {
  initContentScript();
}
