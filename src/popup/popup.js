/**
 * Popup 页面主脚本
 * 实现收藏夹管理的前端交互功能
 */

import bookmarksManager from './bookmarksManager.js';

/**
 * 初始化 Popup 页面
 */
function initPopup() {
  // 初始化标签页切换
  initTabs();
  
  // 初始化事件监听器
  initEventListeners();
  
  // 加载收藏夹数据
  loadBookmarks();
  
  // 加载当前域名的收藏夹
  loadCurrentDomainBookmarks();
}

/**
 * 初始化标签页切换功能
 */
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const searchContainer = document.querySelector('.search-container');
  
  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const tabId = button.dataset.tab;
      
      // 更新标签按钮状态
      tabButtons.forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');
      
      // 更新内容显示
      const tabPanes = document.querySelectorAll('.tab-pane');
      tabPanes.forEach((pane) => pane.classList.remove('active'));
      document.getElementById(tabId).classList.add('active');
      
      // 控制搜索框显示/隐藏
      if (tabId === 'add') {
        searchContainer.style.display = 'none';
      } else {
        searchContainer.style.display = 'flex';
      }
      
      // 如果切换到当前域名标签页，重新加载数据
      if (tabId === 'current') {
        loadCurrentDomainBookmarks();
      }
    });
  });
}

/**
 * 初始化事件监听器
 */
function initEventListeners() {
  // 搜索按钮点击事件
  document.getElementById('searchButton').addEventListener('click', handleSearch);
  
  // 搜索输入框回车事件
  document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  });
  
  // 添加收藏表单提交事件
  document.getElementById('addBookmarkForm').addEventListener('submit', handleAddBookmark);
  
  // 编辑表单提交事件
  document.getElementById('editForm').addEventListener('submit', handleEditBookmark);
  
  // 取消编辑按钮点击事件
  document.getElementById('cancelEdit').addEventListener('click', closeEditDialog);
  
  // 点击对话框外部关闭对话框
  document.getElementById('editDialog').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      closeEditDialog();
    }
  });
}

/**
 * 加载收藏夹数据
 */
async function loadBookmarks() {
  showLoading();
  try {
    await bookmarksManager.getAllBookmarks();
    renderDomainGroups();
    renderBookmarks();
  } catch (error) {
    console.error('加载收藏夹失败:', error);
  } finally {
    hideLoading();
  }
}

/**
 * 加载当前域名的收藏夹
 */
async function loadCurrentDomainBookmarks() {
  showLoading();
  try {
    await bookmarksManager.getAllBookmarks();
    
    // 获取当前活动标签页的 URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        const currentUrl = tabs[0].url;
        console.log('当前页面 URL:', currentUrl);
        renderCurrentDomainBookmarks(currentUrl);
      } else {
        document.getElementById('currentDomainBookmarks').innerHTML = '<p>无法获取当前页面 URL</p>';
      }
    });
  } catch (error) {
    console.error('加载当前域名收藏夹失败:', error);
  } finally {
    hideLoading();
  }
}

/**
 * 渲染域名分组列表
 */
function renderDomainGroups() {
  const domainGroupsList = document.getElementById('domainGroupsList');
  const groupedBookmarks = bookmarksManager.getGroupedBookmarks();
  
  if (Object.keys(groupedBookmarks).length === 0) {
    domainGroupsList.innerHTML = '<p>暂无收藏夹</p>';
    return;
  }
  
  let html = '';
  
  // 渲染所有收藏选项
  // html += `
  //   <div class="domain-group-item active" data-domain="all">
  //     所有收藏
  //   </div>
  // `;
  
  // 渲染域名分组
  Object.keys(groupedBookmarks).forEach((domain) => {
    html += `
      <div class="domain-group-item" data-domain="${domain}">
        ${domain}
      </div>
    `;
  });
  
  domainGroupsList.innerHTML = html;
  
  // 添加域名分组点击事件
  addDomainGroupListeners();
}

/**
 * 渲染收藏夹列表
 * @param {string} domain 域名，all 表示所有收藏
 */
function renderBookmarks(domain = 'all') {
  const bookmarksList = document.getElementById('bookmarksList');
  const selectedDomainElement = document.getElementById('selectedDomain');
  const groupedBookmarks = bookmarksManager.getGroupedBookmarks();
  
  if (Object.keys(groupedBookmarks).length === 0) {
    bookmarksList.innerHTML = '<p>暂无收藏夹</p>';
    selectedDomainElement.textContent = '所有收藏';
    return;
  }
  
  if (domain === 'all') {
    selectedDomainElement.textContent = '所有收藏';
    
    let html = '';
    
    // 按域名分组渲染所有收藏
    Object.entries(groupedBookmarks).forEach(([domainName, bookmarks]) => {
      html += `
        <div class="domain-group">
          <h3 class="domain-title">${domainName}</h3>
          <ul class="bookmark-items">
      `;
      
      bookmarks.forEach((bookmark) => {
        try {
          const url = new URL(bookmark.url);
          const faviconUrl = new URL('/favicon.ico', url.origin).href;
          
          html += `
            <li class="bookmark-item">
              <img src="${faviconUrl}" alt="favicon" class="bookmark-favicon">
              <a href="${bookmark.url}" target="_blank" class="bookmark-link">${bookmark.title}</a>
              <div class="bookmark-actions">
                <button class="btn btn-sm edit-btn" data-id="${bookmark.id}" data-title="${bookmark.title}" data-url="${bookmark.url}">编辑</button>
                <button class="btn btn-sm btn-danger delete-btn" data-id="${bookmark.id}">删除</button>
              </div>
            </li>
          `;
        } catch (e) {
          // 处理无效 URL
          html += `
            <li class="bookmark-item">
              <a href="${bookmark.url}" target="_blank" class="bookmark-link">${bookmark.title}</a>
              <div class="bookmark-actions">
                <button class="btn btn-sm edit-btn" data-id="${bookmark.id}" data-title="${bookmark.title}" data-url="${bookmark.url}">编辑</button>
                <button class="btn btn-sm btn-danger delete-btn" data-id="${bookmark.id}">删除</button>
              </div>
            </li>
          `;
        }
      });
      
      html += `
          </ul>
        </div>
      `;
    });
    
    bookmarksList.innerHTML = html;
  } else {
    selectedDomainElement.textContent = domain;
    
    const bookmarks = groupedBookmarks[domain] || [];
    
    if (bookmarks.length === 0) {
      bookmarksList.innerHTML = '<p>该域名暂无收藏夹</p>';
      return;
    }
    
    let html = '<ul class="bookmark-items">';
    
    bookmarks.forEach((bookmark) => {
      try {
        const url = new URL(bookmark.url);
        const faviconUrl = new URL('/favicon.ico', url.origin).href;
        
        html += `
          <li class="bookmark-item">
            <img src="${faviconUrl}" alt="favicon" class="bookmark-favicon">
            <a href="${bookmark.url}" target="_blank" class="bookmark-link">${bookmark.title}</a>
            <div class="bookmark-actions">
              <button class="btn btn-sm edit-btn" data-id="${bookmark.id}" data-title="${bookmark.title}" data-url="${bookmark.url}">编辑</button>
              <button class="btn btn-sm btn-danger delete-btn" data-id="${bookmark.id}">删除</button>
            </div>
          </li>
        `;
      } catch (e) {
        // 处理无效 URL
        html += `
          <li class="bookmark-item">
            <a href="${bookmark.url}" target="_blank" class="bookmark-link">${bookmark.title}</a>
            <div class="bookmark-actions">
              <button class="btn btn-sm edit-btn" data-id="${bookmark.id}" data-title="${bookmark.title}" data-url="${bookmark.url}">编辑</button>
              <button class="btn btn-sm btn-danger delete-btn" data-id="${bookmark.id}">删除</button>
            </div>
          </li>
        `;
      }
    });
    
    html += '</ul>';
    bookmarksList.innerHTML = html;
  }
  
  // 添加编辑和删除按钮的事件监听器
  addBookmarkActionListeners();
}

/**
 * 添加域名分组点击事件监听器
 */
function addDomainGroupListeners() {
  const domainGroupItems = document.querySelectorAll('.domain-group-item');
  
  domainGroupItems.forEach((item) => {
    item.addEventListener('click', () => {
      // 检查是否已经选中
      if (item.classList.contains('active')) {
        // 如果已经选中，取消选中并显示所有收藏
        domainGroupItems.forEach((i) => i.classList.remove('active'));
        renderBookmarks('all');
      } else {
        // 更新选中状态
        domainGroupItems.forEach((i) => i.classList.remove('active'));
        item.classList.add('active');
        
        // 获取选中的域名
        const domain = item.dataset.domain;
        
        // 渲染对应域名的收藏夹
        renderBookmarks(domain);
      }
    });
  });
}

/**
 * 渲染当前域名的收藏夹
 * @param {string} currentUrl 当前页面 URL
 */
function renderCurrentDomainBookmarks(currentUrl) {
  const currentDomainBookmarks = document.getElementById('currentDomainBookmarks');
  const bookmarks = bookmarksManager.getBookmarksByCurrentDomain(currentUrl);
  
  if (bookmarks.length === 0) {
    currentDomainBookmarks.innerHTML = '<p>当前域名暂无收藏夹</p>';
    return;
  }
  
  let html = '';
  
  bookmarks.forEach((bookmark) => {
    try {
        const url = new URL(bookmark.url);
        const faviconUrl = new URL('/favicon.ico', url.origin).href;
      
      html += `
        <div class="bookmark-item">
          <img src="${faviconUrl}" alt="favicon" class="bookmark-favicon">
          <a href="${bookmark.url}" target="_blank" class="bookmark-link">${bookmark.title}</a>
          <div class="bookmark-actions">
            <button class="btn btn-sm edit-btn" data-id="${bookmark.id}" data-title="${bookmark.title}" data-url="${bookmark.url}">编辑</button>
            <button class="btn btn-sm btn-danger delete-btn" data-id="${bookmark.id}">删除</button>
          </div>
        </div>
      `;
    } catch (e) {
      // 处理无效 URL
      html += `
        <div class="bookmark-item">
          <a href="${bookmark.url}" target="_blank" class="bookmark-link">${bookmark.title}</a>
          <div class="bookmark-actions">
            <button class="btn btn-sm edit-btn" data-id="${bookmark.id}" data-title="${bookmark.title}" data-url="${bookmark.url}">编辑</button>
            <button class="btn btn-sm btn-danger delete-btn" data-id="${bookmark.id}">删除</button>
          </div>
        </div>
      `;
    }
  });
  
  currentDomainBookmarks.innerHTML = html;
  
  // 添加编辑和删除按钮的事件监听器
  addBookmarkActionListeners();
}

/**
 * 添加收藏夹操作按钮的事件监听器
 */
function addBookmarkActionListeners() {
  // 编辑按钮点击事件
  document.querySelectorAll('.edit-btn').forEach((button) => {
    button.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      const title = e.target.dataset.title;
      const url = e.target.dataset.url;
      openEditDialog(id, title, url);
    });
  });
  
  // 删除按钮点击事件
  document.querySelectorAll('.delete-btn').forEach((button) => {
    button.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      if (confirm('确定要删除这个收藏吗？')) {
        try {
          await bookmarksManager.deleteBookmark(id);
          loadBookmarks();
          loadCurrentDomainBookmarks();
        } catch (error) {
          console.error('删除收藏失败:', error);
        }
      }
    });
  });
}

/**
 * 处理搜索功能
 */
async function handleSearch() {
  const searchInput = document.getElementById('searchInput');
  const selectedDomainElement = document.getElementById('selectedDomain');
  const query = searchInput.value.trim();
  
  // 取消域名分组的选中状态
  const domainGroupItems = document.querySelectorAll('.domain-group-item');
  domainGroupItems.forEach((i) => i.classList.remove('active'));
  console.log('搜索查询:', query);
  if (!query) {
    selectedDomainElement.textContent = query;
    loadBookmarks();
    return;
  }
 
  showLoading();
  try {
    await bookmarksManager.getAllBookmarks();
    selectedDomainElement.textContent = query;
    const searchResults = bookmarksManager.searchBookmarks(query);
    renderSearchResults(searchResults);
  } catch (error) {
    selectedDomainElement.textContent = '所有收藏';
    console.error('搜索失败:', error);
  } finally {
    hideLoading();
  }
}

/**
 * 渲染搜索结果
 * @param {Array} results 搜索结果数组
 */
function renderSearchResults(results) {
  const bookmarksList = document.getElementById('bookmarksList');
  
  if (results.length === 0) {
    bookmarksList.innerHTML = '<p>没有找到匹配的收藏</p>';
    return;
  }
  
  let html = '';
  
  results.forEach((bookmark) => {
    try {
        const url = new URL(bookmark.url);
        const faviconUrl = new URL('/favicon.ico', url.origin).href;
      
      html += `
        <div class="bookmark-item">
          <img src="${faviconUrl}" alt="favicon" class="bookmark-favicon">
          <a href="${bookmark.url}" target="_blank" class="bookmark-link">${bookmark.title}</a>
          <div class="bookmark-actions">
            <button class="btn btn-sm edit-btn" data-id="${bookmark.id}" data-title="${bookmark.title}" data-url="${bookmark.url}">编辑</button>
            <button class="btn btn-sm btn-danger delete-btn" data-id="${bookmark.id}">删除</button>
          </div>
        </div>
      `;
    } catch (e) {
      // 处理无效 URL
      html += `
        <div class="bookmark-item">
          <a href="${bookmark.url}" target="_blank" class="bookmark-link">${bookmark.title}</a>
          <div class="bookmark-actions">
            <button class="btn btn-sm edit-btn" data-id="${bookmark.id}" data-title="${bookmark.title}" data-url="${bookmark.url}">编辑</button>
            <button class="btn btn-sm btn-danger delete-btn" data-id="${bookmark.id}">删除</button>
          </div>
        </div>
      `;
    }
  });
  
  bookmarksList.innerHTML = html;
  
  // 添加编辑和删除按钮的事件监听器
  addBookmarkActionListeners();
}

/**
 * 处理添加收藏
 * @param {Event} e 表单提交事件
 */
async function handleAddBookmark(e) {
  e.preventDefault();
  
  const title = document.getElementById('bookmarkTitle').value.trim();
  const url = document.getElementById('bookmarkUrl').value.trim();
  
  if (!title || !url) {
    alert('请填写标题和 URL');
    return;
  }
  
  showLoading();
  try {
    await bookmarksManager.createBookmark(title, url);
    alert('收藏添加成功！');
    
    // 清空表单
    document.getElementById('addBookmarkForm').reset();
    
    // 重新加载收藏夹
    loadBookmarks();
    loadCurrentDomainBookmarks();
  } catch (error) {
    console.error('添加收藏失败:', error);
    alert('添加收藏失败，请重试');
  } finally {
    hideLoading();
  }
}

/**
 * 处理编辑收藏
 * @param {Event} e 表单提交事件
 */
async function handleEditBookmark(e) {
  e.preventDefault();
  
  const id = document.getElementById('editId').value;
  const title = document.getElementById('editTitle').value.trim();
  const url = document.getElementById('editUrl').value.trim();
  
  if (!title || !url) {
    alert('请填写标题和 URL');
    return;
  }
  
  showLoading();
  try {
    await bookmarksManager.updateBookmark(id, { title, url });
    alert('收藏更新成功！');
    closeEditDialog();
    
    // 重新加载收藏夹
    loadBookmarks();
    loadCurrentDomainBookmarks();
  } catch (error) {
    console.error('更新收藏失败:', error);
    alert('更新收藏失败，请重试');
  } finally {
    hideLoading();
  }
}

/**
 * 打开编辑对话框
 * @param {string} id 书签 ID
 * @param {string} title 书签标题
 * @param {string} url 书签 URL
 */
function openEditDialog(id, title, url) {
  document.getElementById('editId').value = id;
  document.getElementById('editTitle').value = title;
  document.getElementById('editUrl').value = url;
  document.getElementById('editDialog').style.display = 'flex';
}

/**
 * 关闭编辑对话框
 */
function closeEditDialog() {
  document.getElementById('editDialog').style.display = 'none';
}

/**
 * 显示加载状态
 */
function showLoading() {
  document.getElementById('loading').style.display = 'block';
}

/**
 * 隐藏加载状态
 */
function hideLoading() {
  document.getElementById('loading').style.display = 'none';
}

/**
 * 页面加载完成后初始化
 */
document.addEventListener('DOMContentLoaded', initPopup);
