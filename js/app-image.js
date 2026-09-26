/**
 * 画像URLかどうかを判定
 * @param {string} url - 判定する文字列
 * @returns {boolean} 画像URLの場合true
 */
function isImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  var trimmed = url.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

/**
 * Google Driveの共有リンクURLを直接表示用URLに変換
 * @param {string} url - Google Driveの共有リンクURL
 * @returns {string} 変換後のURL
 */
function convertGoogleDriveUrl(url) {
  if (!url || typeof url !== 'string') return url;
  
  // Google Driveの共有リンク形式を検出
  // 例: https://drive.google.com/file/d/FILE_ID/view?usp=drive_link
  var match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    var fileId = match[1];
    // サムネイル形式を使用（広告ブロッカーにブロックされにくい）
    // sz=w1000 で最大幅1000pxの画像を取得（必要に応じて調整可能）
    return 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1000';
  }
  
  // 変換不要の場合はそのまま返す
  return url;
}

/**
 * テキストまたは画像を表示
 * @param {HTMLElement} element - 表示先の要素
 * @param {string} content - 表示する内容（テキストまたは画像URL）
 */
function displayImageOrText(element, content) {
  if (!element || !content) {
    if (element) element.innerHTML = '';
    return;
  }
  
  var trimmedContent = content.trim();
  
  if (isImageUrl(trimmedContent)) {
    // 画像URLの場合
    var imageUrl = convertGoogleDriveUrl(trimmedContent);
    var img = document.createElement('img');
    img.src = imageUrl;
    img.className = 'content-image';
    img.alt = '画像';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';
    img.style.margin = '0 auto';
    img.style.cursor = 'pointer';
    
    // クリックで拡大表示
    img.addEventListener('click', function() {
      showImageModal(imageUrl);
    });
    
    // エラーハンドリング
    img.addEventListener('error', function() {
      element.innerHTML = '<span class="image-error">画像を読み込めませんでした</span>';
    });
    
    element.innerHTML = '';
    element.appendChild(img);
  } else if (isIsoDateTimeString(trimmedContent)) {
    // ISO 8601形式の日時文字列の場合、「YYYY年M月」形式に変換
    var formattedDate = formatIsoDateTimeToYearMonth(trimmedContent);
    element.textContent = formattedDate;
  } else {
    // テキストの場合
    element.textContent = trimmedContent;
  }
}

/**
 * 画像を拡大表示（モーダル）
 * @param {string} imageUrl - 画像URL
 */
function showImageModal(imageUrl) {
  var overlay = dom.imageModalOverlay;
  var img = dom.imageModalImage;
  var closeButton = dom.imageModalCloseButton;
  
  if (!overlay || !img) return;
  
  img.src = imageUrl;
  overlay.style.display = 'flex';
  
  // 閉じるボタンのイベント
  if (closeButton) {
    closeButton.onclick = function() {
      overlay.style.display = 'none';
    };
  }
  
  // オーバーレイクリックで閉じる
  overlay.onclick = function(e) {
    if (e.target === overlay) {
      overlay.style.display = 'none';
    }
  };
  
  // ESCキーで閉じる
  var escHandler = function(e) {
    if (e.key === 'Escape') {
      overlay.style.display = 'none';
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}
