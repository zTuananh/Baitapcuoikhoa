(function () {
  "use strict";

  const menuElement = document.getElementById("menu");
  const footerCategories = document.getElementById("footer-categories");
  const featuredElement = document.getElementById("featured-news");
  const newsListElement = document.getElementById("news-list");
  const titleElement = document.getElementById("category-title");
  const statusElement = document.getElementById("status-message");
  const selectedCategory = new URLSearchParams(window.location.search).get("category");

  // HÀM MỚI: Lấy tên tác giả an toàn (Sửa lỗi [object Object])
  function getAuthorName(author) {
    if (typeof author === "object" && author !== null) {
      return author.name || "Ban biên tập";
    }
    return author || "Ban biên tập";
  }

  // HÀM MỚI: Lấy tên chuyên mục an toàn (Xử lý mảng)
  function getCategoryText(category) {
    if (Array.isArray(category)) {
      return category[0] || "Tin tức";
    }
    return category || "Tin tức";
  }

  function flattenCategories(items) {
    return (items || []).flatMap((item) => [item, ...flattenCategories(item.children)]);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function categorySlug(name) {
    const text = Array.isArray(name) ? name[0] : name;
    return String(text || "")
      .toLocaleLowerCase("vi-VN")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function postMatchesCategory(post, category) {
    if (!category) return true;
    const postCatSlug = categorySlug(post.category);
    const targetSlug = categorySlug(category);
    return postCatSlug === targetSlug || postCatSlug === targetSlug.replace(/-/g, " ");
  }

  // HÀM ĐÃ SỬA: Bổ sung thẻ <img> hiển thị hình ảnh
  function makePostCard(post, variant) {
    const headingTag = variant === "main" ? "h2" : "h3";
    const title = escapeHtml(post.title || "Chưa có tiêu đề");
    const excerpt = escapeHtml(post.excerpt || "");
    const category = escapeHtml(getCategoryText(post.category));
    const author = escapeHtml(getAuthorName(post.author));
    const date = escapeHtml(post.publishedAt || "Chưa rõ thời gian");
    
    // Kiểm tra và lấy đường dẫn ảnh
    const hasImage = post.image && post.image.trim() !== "";
    const imageTag = hasImage 
      ? `<div class="news-card-media"><img src="${escapeHtml(post.image)}" alt="${title}" referrerpolicy="no-referrer" onerror="this.parentElement.style.display='none'"></div>`
      : "";

    return `<article class="news-card ${variant === "main" ? "featured-main" : ""}">
      ${imageTag}
      <div class="news-card-content">
        <span class="category-label">${category}</span>
        <${headingTag}><a href="detail.html?id=${encodeURIComponent(post.id)}">${title}</a></${headingTag}>
        ${excerpt ? `<p>${excerpt}</p>` : ""}
        <div class="post-meta"><span>${author}</span> · <span>${date}</span></div>
      </div>
    </article>`;
  }

  function drawMenu(categories) {
    const items = flattenCategories(categories.menu || []).filter((item) => item.id !== "home");
    if (menuElement) {
      menuElement.innerHTML = '<a href="index.html">Trang chủ</a>' + items.map((item) => {
        const url = item.id === "latest" ? "index.html" : `index.html?category=${encodeURIComponent(item.id)}`;
        return `<a href="${url}">${escapeHtml(item.title)}</a>`;
      }).join("");
    }
    if (footerCategories) {
      footerCategories.innerHTML = items.map((item) => `<a href="index.html?category=${encodeURIComponent(item.id)}">${escapeHtml(item.title)}</a>`).join("");
    }
  }

  async function init() {
    try {
      const [categories, posts] = await Promise.all([
        NewsStorage.loadJson("data/categories.json"), 
        NewsStorage.getAllPosts()
      ]);
      drawMenu(categories);
      const flatCategories = flattenCategories(categories.menu || []);
      const selected = flatCategories.find((item) => item.id === selectedCategory);
      const displayTitle = selected ? selected.title : "Tin tức mới nhất";
      
      if (titleElement) titleElement.textContent = displayTitle;
      document.title = `${displayTitle} - News Today`;
      
      const filteredPosts = posts.filter((post) => postMatchesCategory(post, selectedCategory));
      
      if (!filteredPosts.length) {
        if (featuredElement) featuredElement.innerHTML = '<div class="empty-state">Chưa có bài viết trong chuyên mục này.</div>';
        if (newsListElement) newsListElement.innerHTML = "";
        if (statusElement) statusElement.textContent = "";
        return;
      }

      const topThree = filteredPosts.slice(0, 3);
      if (featuredElement) {
        featuredElement.innerHTML = makePostCard(topThree[0], "main") +
          `<div class="featured-side">${topThree.slice(1).map((post) => makePostCard(post, "side")).join("")}</div>`;
      }

      if (newsListElement) {
        newsListElement.innerHTML = filteredPosts.slice(3).map((post) => `<div class="list-card">${makePostCard(post, "list")}</div>`).join("");
        if (filteredPosts.length <= 3) {
          newsListElement.innerHTML = '<p class="empty-state">Đã hiển thị tất cả bài viết hiện có trong chuyên mục này.</p>';
        }
      }

      if (statusElement) {
        statusElement.textContent = `Có ${filteredPosts.length} bài viết${selected ? ` trong chuyên mục ${selected.title}` : ""}.`;
      }
    } catch (error) {
      console.error(error);
      if (statusElement) statusElement.textContent = "Không tải được dữ liệu. Vui lòng kiểm tra lại đường dẫn file JSON.";
    }
  }

  const showAllBtn = document.getElementById("show-all");
  if (showAllBtn) {
    showAllBtn.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }

  init();
})();