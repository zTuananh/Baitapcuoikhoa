/* Các hàm lưu trữ dùng chung cho các trang. */
(function () {
  "use strict";

  const CRAWLED_POSTS_KEY = "news_crawled_posts";

  async function loadJson(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Không đọc được ${path} (HTTP ${response.status}).`);
    return response.json();
  }

  function getCrawledPosts() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CRAWLED_POSTS_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Dữ liệu LocalStorage không hợp lệ:", error);
      return [];
    }
  }

  function saveCrawledPost(post) {
    if (!post || !post.id || !post.title) {
      throw new Error("Bài viết phải có ít nhất id và title.");
    }
    const posts = getCrawledPosts();
    const index = posts.findIndex((item) => item.id === post.id || item.url === post.url);
    if (index >= 0) posts[index] = post;
    else posts.unshift(post);
    localStorage.setItem(CRAWLED_POSTS_KEY, JSON.stringify(posts));
    return post;
  }

  async function getAllPosts() {
    const basePosts = await loadJson("data/posts.json");
    const crawledPosts = getCrawledPosts();
    const byId = new Map();
    [...basePosts, ...crawledPosts].forEach((post) => byId.set(post.id, post));
    return [...byId.values()].sort((a, b) => {
      const dateA = Date.parse(a.publishedAt || "") || 0;
      const dateB = Date.parse(b.publishedAt || "") || 0;
      return dateB - dateA || String(b.id || "").localeCompare(String(a.id || ""));
    });
  }

  window.NewsStorage = {
    loadJson,
    getCrawledPosts,
    saveCrawledPost,
    getAllPosts
  };
})();
