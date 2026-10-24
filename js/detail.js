(function () {
  "use strict";
  const target = document.getElementById("article-detail");
  const id = new URLSearchParams(window.location.search).get("id");

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  // 1. Hàm tự động lọc bỏ đoạn Sapo bị trùng trong nội dung bài viết
  function removeDuplicateSapo(excerpt, content) {
    if (!content) return "";
    if (!excerpt) return content;

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = content;

    const firstP = tempDiv.querySelector("p");
    if (firstP) {
      const textP = firstP.innerText.trim().toLowerCase();
      const textExcerpt = excerpt.trim().toLowerCase();

      // Nếu thẻ <p> đầu tiên trùng hoặc chứa nội dung của Sapo -> Xóa thẻ <p> đó
      if (textP === textExcerpt || textP.includes(textExcerpt) || textExcerpt.includes(textP)) {
        firstP.remove();
      }
    }

    return tempDiv.innerHTML;
  }

  // 2. Hàm định dạng ngày giờ hiển thị (DD/MM/YYYY - HH:mm)
  function formatDate(dateStr) {
    if (!dateStr) return "Chưa rõ thời gian";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} - ${hours}:${minutes}`;
  }

  async function init() {
    try {
      if (!id) throw new Error("Không tìm thấy mã bài viết trong đường dẫn.");

      // Lấy danh sách bài viết từ NewsStorage hoặc fallback về posts_3.json
      let posts = [];
      if (typeof NewsStorage !== "undefined" && typeof NewsStorage.getAllPosts === "function") {
        posts = await NewsStorage.getAllPosts();
      } else {
        const res = await fetch("posts_3.json");
        posts = await res.json();
      }

      const post = posts.find((item) => String(item.id) === String(id));
      if (!post) throw new Error("Không tìm thấy bài viết này.");

      document.title = `${post.title} - News Today`;

      // Lấy thông tin Tác giả & Chuyên mục an toàn
      const authorText = typeof post.author === 'object' ? post.author?.name : post.author;
      const categoryText = Array.isArray(post.category) ? post.category.join(', ') : post.category;

      const externalLink = post.url && post.url !== "#" 
        ? `<a href="${escapeHtml(post.url)}" target="_blank" rel="noopener noreferrer" class="btn-source-link">Xem bài gốc tại nguồn ↗</a>` 
        : "";

      // Tự động làm sạch nội dung, tránh bị lặp lại đoạn Sapo
      const cleanedContent = removeDuplicateSapo(post.excerpt, post.content);

      target.innerHTML = `
        <!-- Thanh điều hướng & Nút quay lại -->
        <nav class="detail-navigation">
          <a href="index.html" class="btn-back-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Quay lại danh sách
          </a>
          <div class="breadcrumb-trail">
            <a href="index.html">Trang chủ</a>
            <span class="sep">/</span>
            <span class="current-cat">${escapeHtml(categoryText || "Tin tức")}</span>
          </div>
        </nav>

        <!-- Tiêu đề & Chuyên mục -->
        <div class="article-header">
          <span class="category-badge">${escapeHtml(categoryText || "TIN TỨC")}</span>
          <h1 class="article-main-title">${escapeHtml(post.title)}</h1>
          
          <!-- Metadata: Tác giả & Ngày đăng -->
          <div class="article-meta-bar">
            <div class="meta-item">
              <span class="meta-label">✍️ Tác giả:</span>
              <strong class="meta-value">${escapeHtml(authorText || "Dân trí")}</strong>
            </div>
            <span class="meta-divider">•</span>
            <div class="meta-item">
              <span class="meta-label">🕒 Đăng lúc:</span>
              <span class="meta-value">${escapeHtml(formatDate(post.publishedAt))}</span>
            </div>
          </div>
        </div>

        <!-- Đoạn Tóm tắt / Sapo -->
        ${post.excerpt ? `
          <div class="article-sapo-box">
            <p>${escapeHtml(post.excerpt)}</p>
          </div>
        ` : ""}

        <!-- Ảnh đại diện nổi bật -->
        ${post.image ? `
          <div class="article-featured-media">
            <img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.title)}" referrerpolicy="no-referrer">
          </div>
        ` : ""}

        <!-- Nội dung chi tiết bài viết -->
        <div class="article-body-content">
          ${cleanedContent || "<p>Chưa có nội dung chi tiết.</p>"}
        </div>

        <!-- Khối thông tin nguồn tin -->
        <div class="article-footer-box">
          <div class="source-info">
            <span>Nguồn tin: <strong>${escapeHtml(post.source || "dantri.com.vn")}</strong></span>
          </div>
          ${externalLink}
        </div>
      `;
    } catch (error) {
      target.innerHTML = `
        <div class="error-container">
          <p class="error-message">⚠️ ${escapeHtml(error.message)}</p>
          <a href="index.html" class="btn-back-home">🏠 Quay về trang chủ</a>
        </div>
      `;
    }
  }

  init();
})();