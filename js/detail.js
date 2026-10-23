(function () {
  "use strict";
  const target = document.getElementById("article-detail");
  const id = new URLSearchParams(window.location.search).get("id");

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  async function init() {
    try {
      if (!id) throw new Error("Không tìm thấy mã bài viết trong đường dẫn.");
      const posts = await NewsStorage.getAllPosts();
      const post = posts.find((item) => item.id === id);
      if (!post) throw new Error("Không tìm thấy bài viết này.");
      
      document.title = `${post.title} - News Today`;
      
      // Lấy thông tin Tác giả & Chuyên mục an toàn
      const authorText = typeof post.author === 'object' ? post.author?.name : post.author;
      const categoryText = Array.isArray(post.category) ? post.category.join(', ') : post.category;

      const externalLink = post.url && post.url !== "#" 
        ? `<p><a href="${escapeHtml(post.url)}" target="_blank" rel="noopener noreferrer" class="source-link">Xem bài viết tại nguồn</a></p>` 
        : "";

      target.innerHTML = `<span class="category-label">${escapeHtml(categoryText || "Tin tức")}</span>
        <h1>${escapeHtml(post.title)}</h1>
        <div class="post-meta">${escapeHtml(authorText || "Ban biên tập")} · ${escapeHtml(post.publishedAt || "Chưa rõ thời gian")}</div>
        ${post.image ? `<img class="article-image" src="${escapeHtml(post.image)}" alt="Ảnh bài viết" referrerpolicy="no-referrer">` : ""}
        ${post.excerpt ? `<p class="article-excerpt">${escapeHtml(post.excerpt)}</p>` : ""}
        <div class="article-body">${post.content || "Chưa có nội dung chi tiết."}</div>
        <p class="post-meta">Nguồn: ${escapeHtml(post.source || "dantri.com.vn")}</p>${externalLink}`;
    } catch (error) {
      target.innerHTML = `<div class="empty-state">${escapeHtml(error.message)} <a href="index.html">Quay về trang chủ</a></div>`;
    }
  }
  init();
})();