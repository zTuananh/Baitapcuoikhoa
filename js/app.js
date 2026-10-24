(function () {
  "use strict";

  const menuElement = document.getElementById("menu");
  const footerCategories = document.getElementById("footer-categories");
  const featuredElement = document.getElementById("featured-news");
  const newsListElement = document.getElementById("news-list");
  const titleElement = document.getElementById("category-title");
  const statusElement = document.getElementById("status-message");
  const loadMoreBtn = document.getElementById("load-more-btn");
  const topNewsContainer = document.getElementById("top-news-container");
  const selectedCategory = new URLSearchParams(window.location.search).get("category");

  let allRemainingPosts = [];
  let displayedCount = 6;

  // Lấy tên tác giả an toàn
  function getAuthorName(author) {
    if (typeof author === "object" && author !== null) {
      return author.name || "Ban biên tập";
    }
    return author || "Ban biên tập";
  }

  // Lấy tên chuyên mục an toàn
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

  // Render Skeleton Loader khi đang tải
  function renderSkeletons(container, count = 6) {
    if (!container) return;
    let html = "";
    for (let i = 0; i < count; i++) {
      html += `
        <div class="skeleton-card">
          <div class="skeleton skeleton-img"></div>
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text-short"></div>
        </div>
      `;
    }
    container.innerHTML = html;
  }

  // Tạo Card bài viết
  function makePostCard(post, variant) {
    const headingTag = variant === "main" ? "h2" : "h3";
    const title = escapeHtml(post.title || "Chưa có tiêu đề");
    const excerpt = escapeHtml(post.excerpt || "");
    const category = escapeHtml(getCategoryText(post.category));
    const author = escapeHtml(getAuthorName(post.author));
    const date = escapeHtml(post.publishedAt || "Chưa rõ thời gian");
    
    const hasImage = post.image && post.image.trim() !== "";
    const imageTag = hasImage 
      ? `<div class="news-card-media"><img src="${escapeHtml(post.image)}" alt="${title}" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.style.display='none'"></div>`
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

  // Render Sidebar "Tin xem nhiều"
  function renderTopNews(posts) {
    if (!topNewsContainer) return;
    const top5 = posts.slice(0, 5);
    if (!top5.length) {
      topNewsContainer.innerHTML = '<p style="color:var(--muted); font-size:13px;">Chưa có dữ liệu.</p>';
      return;
    }
    topNewsContainer.innerHTML = `
      <ul class="top-news-list">
        ${top5.map((post, idx) => `
          <li class="top-news-item">
            <span class="top-news-num">${idx + 1}</span>
            <a href="detail.html?id=${encodeURIComponent(post.id)}" class="top-news-title">${escapeHtml(post.title)}</a>
          </li>
        `).join("")}
      </ul>
    `;
  }

  // Hiển thị danh sách tin có phân trang
  function renderNewsListBatch() {
    if (!newsListElement) return;

    const visibleBatch = allRemainingPosts.slice(0, displayedCount);
    newsListElement.innerHTML = visibleBatch.map((post) => `<div class="list-card">${makePostCard(post, "list")}</div>`).join("");

    if (loadMoreBtn) {
      if (displayedCount < allRemainingPosts.length) {
        loadMoreBtn.style.display = "inline-flex";
      } else {
        loadMoreBtn.style.display = "none";
      }
    }
  }

  async function init() {
    if (newsListElement) renderSkeletons(newsListElement, 6);

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
      
      renderTopNews(posts);

      if (!filteredPosts.length) {
        if (featuredElement) featuredElement.innerHTML = '<div class="empty-state">Chưa có bài viết trong chuyên mục này.</div>';
        if (newsListElement) newsListElement.innerHTML = "";
        if (statusElement) statusElement.textContent = "";
        if (loadMoreBtn) loadMoreBtn.style.display = "none";
        return;
      }

      // 1. 3 BÀI ĐẦU TIÊN LÀM TIN CHÍNH (FEATURED NEWS)
      const topThree = filteredPosts.slice(0, 3);
      if (featuredElement) {
        featuredElement.innerHTML = makePostCard(topThree[0], "main") +
          `<div class="featured-side">${topThree.slice(1).map((post) => makePostCard(post, "side")).join("")}</div>`;
      }

      // 2. CÁC BÀI CÒN LẠI DÀNH CHO PHẦN TIN PHỤ (TIN TỨC KHÁC - WSJ GRID)
      allRemainingPosts = filteredPosts.slice(3);
      displayedCount = 6;
      renderNewsListBatch();

      if (statusElement) {
        statusElement.textContent = `Có ${filteredPosts.length} bài viết${selected ? ` trong chuyên mục ${selected.title}` : ""}.`;
      }
    } catch (error) {
      console.error(error);
      if (statusElement) statusElement.textContent = "Không tải được dữ liệu. Vui lòng kiểm tra lại đường dẫn file JSON.";
    }
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      displayedCount += 6;
      renderNewsListBatch();
    });
  }

  const showAllBtn = document.getElementById("show-all");
  if (showAllBtn) {
    showAllBtn.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }

  init();
})();