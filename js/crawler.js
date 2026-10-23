/**
 * crawler.js - Xử lý cào dữ liệu bài viết tin tức và lưu vào LocalStorage
 */

document.addEventListener('DOMContentLoaded', () => {
  const crawlerForm = document.getElementById('crawler-form');
  const urlInput = document.getElementById('article-url');
  const crawlButton = document.getElementById('crawl-button');
  const crawlerStatus = document.getElementById('crawler-status');
  const crawlerResult = document.getElementById('crawler-result');
  const crawlerJson = document.getElementById('crawler-json');
  const saveButton = document.getElementById('save-crawled-post');

  let currentCrawledPost = null;

  if (crawlerForm) {
    crawlerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const url = urlInput.value.trim();
      if (!url) return;

      crawlerStatus.innerText = 'Đang tiến hành cào dữ liệu từ URL...';
      crawlerStatus.style.color = '#008837';
      if (crawlButton) crawlButton.disabled = true;
      if (crawlerResult) crawlerResult.hidden = true;

      try {
        const postData = await fetchAndExtractNews(url);
        currentCrawledPost = postData;

        if (crawlerJson) crawlerJson.innerText = JSON.stringify(postData, null, 2);
        if (crawlerResult) crawlerResult.hidden = false;

        crawlerStatus.innerText = 'Trích xuất dữ liệu thành công! Bạn có thể xem trước JSON và nhấn Lưu.';
        crawlerStatus.style.color = '#008837';
      } catch (error) {
        console.error('Crawl Error:', error);
        const detail = error instanceof Error ? error.message : String(error);
        crawlerStatus.innerText = detail
          ? `Không thể cào dữ liệu: ${detail}`
          : 'Có lỗi xảy ra khi cào dữ liệu. Kiểm tra lại đường dẫn URL hoặc kết nối mạng.';
        crawlerStatus.style.color = '#d32f2f';
      } finally {
        if (crawlButton) crawlButton.disabled = false;
      }
    });
  }

  if (saveButton) {
    saveButton.addEventListener('click', () => {
      if (!currentCrawledPost) {
        alert('Không có dữ liệu bài viết để lưu!');
        return;
      }

      NewsStorage.saveCrawledPost(currentCrawledPost);
      crawlerStatus.innerText = `Đã lưu thành công bài viết "${currentCrawledPost.title}" vào LocalStorage!`;
      crawlerStatus.style.color = '#008837';
      alert('Đã lưu bài viết vào LocalStorage thành công!');
    });
  }
});

async function fetchArticleHtml(articleUrl) {
  const localHosts = ['localhost', '127.0.0.1', '::1', '[::1]'];
  const isLocalPage = window.location.protocol === 'file:' ||
    localHosts.includes(window.location.hostname);
  const apiOrigin = isLocalPage && window.location.port !== '3000'
    ? 'http://127.0.0.1:3000'
    : '';
  const response = await fetch(
    `${apiOrigin}/api/fetch-article?url=${encodeURIComponent(articleUrl)}`
  ).catch((error) => {
    if (error instanceof TypeError && isLocalPage) {
      throw new Error(
        'Không kết nối được API crawler tại http://127.0.0.1:3000. Hãy chạy "python server.py" trong thư mục dự án.'
      );
    }
    throw error;
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || `Máy chủ crawler trả về HTTP ${response.status}.`);
  }
  if (typeof result.html !== 'string' || !result.html.trim()) {
    throw new Error('Máy chủ crawler không trả về nội dung HTML.');
  }
  return result.html;
}

async function fetchAndExtractNews(articleUrl) {
  const html = await fetchArticleHtml(articleUrl);
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const title = doc.querySelector('h1.title-page')?.innerText?.trim() 
             || doc.querySelector('h1')?.innerText?.trim() 
             || 'Tiêu đề tin tức';

  const excerpt = doc.querySelector('h2.singular-sapo')?.innerText?.trim() 
               || doc.querySelector('.sapo')?.innerText?.trim() 
               || '';

  const content = doc.querySelector('div.singular-content')?.innerHTML?.trim() 
               || doc.querySelector('.content')?.innerHTML?.trim() 
               || '<p>Nội dung đang cập nhật...</p>';

  const authorName = doc.querySelector('.author-name')?.innerText?.trim() 
                  || doc.querySelector('.author-info')?.innerText?.trim() 
                  || 'Ban biên tập';

  const categoryName = doc.querySelector('.breadcrumb li:nth-child(2)')?.innerText?.trim() 
                    || 'Thời sự';

  const publishedAt = doc.querySelector('.author-time')?.innerText?.trim() 
                   || new Date().toISOString().slice(0, 16).replace('T', ' ');

  // Trích xuất đường dẫn ảnh thực (bỏ qua mã SVG placeholder)
  let imageUrl = doc.querySelector('meta[property="og:image"]')?.getAttribute('content')
              || doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content')
              || '';

  if (!imageUrl || imageUrl.includes('data:image/svg+xml')) {
    const contentImg = doc.querySelector('.singular-content img[data-src], .singular-content img[src]');
    if (contentImg) {
      imageUrl = contentImg.getAttribute('data-src') || contentImg.getAttribute('src') || '';
    }
  }

  const slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');

  const idMatch = articleUrl.match(/(\d+)\.htm/);
  const articleId = idMatch ? `dtri-${idMatch[1]}` : `dtri-${Date.now()}`;

  return {
    id: articleId,
    title: title,
    slug: slug,
    excerpt: excerpt,
    content: content,
    author: { name: authorName },
    category: [categoryName],
    publishedAt: publishedAt,
    source: 'dantri.com.vn',
    image: imageUrl,
    url: articleUrl
  };
}