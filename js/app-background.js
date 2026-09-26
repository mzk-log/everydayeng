// 背景画像選択モーダルを開く
function openBackgroundImageSelector() {
  var selectModal = dom.backgroundSelectModal;
  var imageGrid = dom.backgroundImageGrid;
  
  if (selectModal && imageGrid) {
    // 画像グリッドをクリア
    imageGrid.innerHTML = '';
    
    // 現在選択されている背景画像を取得
    var currentBackground = localStorage.getItem('customBackgroundImage');
    var currentImageName = null;
    
    // localStorageに保存がない場合は、デフォルトのbg.jpgを使用
    if (!currentBackground) {
      currentImageName = 'bg.jpg';
    } else if (currentBackground && currentBackground.startsWith('data:')) {
      // DataURLの場合は、デフォルト画像かどうか確認
      var defaultImage = dom.backgroundImage;
      if (defaultImage) {
        var defaultUrl = defaultImage.style.backgroundImage;
        if (defaultUrl && defaultUrl.includes('img/bg/')) {
          // デフォルト画像の場合はファイル名を抽出
          var match = defaultUrl.match(/img\/bg\/([^"']+)/);
          if (match) {
            currentImageName = match[1];
          } else {
            currentImageName = 'bg.jpg'; // デフォルト
          }
        } else {
          currentImageName = 'bg.jpg'; // デフォルト
        }
      } else {
        currentImageName = 'bg.jpg'; // デフォルト
      }
    } else if (currentBackground && currentBackground.includes('img/bg/')) {
      // パスからファイル名を抽出
      var match = currentBackground.match(/img\/bg\/([^"']+)/);
      if (match) {
        currentImageName = match[1];
      } else {
        currentImageName = 'bg.jpg'; // デフォルト
      }
    } else {
      // その他の場合はデフォルト
      currentImageName = 'bg.jpg';
    }
    
    // 各画像をグリッドに追加
    BACKGROUND_IMAGE_FILES.forEach(function(filename) {
      var imageItem = document.createElement('div');
      imageItem.className = 'background-image-item';
      if (filename === currentImageName || (!currentImageName && filename === 'bg.jpg')) {
        imageItem.classList.add('selected');
      }
      
      var img = document.createElement('img');
      img.src = 'img/bg/' + filename;
      img.alt = filename;
      img.onerror = function() {
        this.style.display = 'none';
      };
      
      imageItem.appendChild(img);
      
      // クリックイベント
      imageItem.addEventListener('click', function() {
        // 選択状態を更新
        var allItems = imageGrid.querySelectorAll('.background-image-item');
        allItems.forEach(function(item) {
          item.classList.remove('selected');
        });
        imageItem.classList.add('selected');
        
        // 選択した画像をプレビュー表示
        var imageUrl = 'img/bg/' + filename;
        showBackgroundPreview(imageUrl);
        closeBackgroundSelectModal();
      });
      
      imageGrid.appendChild(imageItem);
    });
    
    // モーダルを表示
    selectModal.classList.add('active');
  }
}

// 背景画像選択モーダルを閉じる
function closeBackgroundSelectModal() {
  var selectModal = dom.backgroundSelectModal;
  if (selectModal) {
    selectModal.classList.remove('active');
  }
}

// 背景画像を初期値に戻す
function resetBackgroundImage() {
  try {
    // localStorageから削除
    localStorage.removeItem('customBackgroundImage');
    localStorage.removeItem('backgroundBrightness');
    setStoredSettingsBgDriveFileId('');
    userSettingsBgUploadPending = false;
    
    // 背景画像をデフォルトに戻す
    var backgroundImage = dom.backgroundImage;
    if (backgroundImage) {
      backgroundImage.style.backgroundImage = 'url("img/bg/bg.jpg")';
      backgroundImage.style.filter = '';
    }
    
    // オーバーレイを「明るい」に戻す
    var backgroundOverlay = document.querySelector('.background-overlay');
    if (backgroundOverlay) {
      backgroundOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0)';
    }
    
    // 明るさボタンを「明るい」に戻す
    setBackgroundBrightness('bright', false);
    scheduleUserSettingsSync();
  } catch (e) {
    showError('背景画像のリセットに失敗しました。');
  }
}

// 背景画像選択時の処理
function handleBackgroundImageSelection(file) {
  if (!file.type.match('image.*')) {
    showError('画像ファイルを選択してください。');
    return;
  }
  
  var reader = new FileReader();
  reader.onload = function(e) {
    var imageDataUrl = e.target.result;
    showBackgroundPreview(imageDataUrl);
  };
  reader.onerror = function() {
    showError('画像の読み込みに失敗しました。');
  };
  reader.readAsDataURL(file);
}

// 背景画像プレビューを表示
function showBackgroundPreview(imageUrl) {
  var previewImage = dom.backgroundPreviewImage;
  var previewModal = dom.backgroundPreviewModal;
  
  if (previewImage && previewModal) {
    // 画像URLがDataURLか通常のURLかを判定
    if (imageUrl.startsWith('data:')) {
      // DataURLの場合は圧縮してからプレビューに表示
      compressImageToDataURL(imageUrl, 500, function(compressedDataUrl) {
        previewImage.src = compressedDataUrl;
        previewModal.classList.add('active');
        // 圧縮後のデータを一時保存（確定時に使用）
        previewImage.dataset.compressedData = compressedDataUrl;
        previewImage.dataset.imageUrl = ''; // 通常のURLではないことを示す
      });
    } else {
      // 通常のURLの場合はそのまま表示
      previewImage.src = imageUrl;
      previewModal.classList.add('active');
      previewImage.dataset.compressedData = ''; // DataURLではないことを示す
      previewImage.dataset.imageUrl = imageUrl; // 通常のURLを保存
    }
  }
}

// 背景画像プレビューモーダルを閉じる
function closeBackgroundPreviewModal() {
  var previewModal = dom.backgroundPreviewModal;
  if (previewModal) {
    previewModal.classList.remove('active');
  }
  // ファイル選択inputをリセット
  var fileInput = document.getElementById('backgroundImageFileInput');
  if (fileInput) {
    fileInput.value = '';
  }
}

// 背景画像を確定
function confirmBackgroundImage() {
  var previewImage = dom.backgroundPreviewImage;
  if (previewImage) {
    var imageUrl;
    
    // DataURLか通常のURLかを判定
    if (previewImage.dataset.compressedData) {
      // DataURLの場合
      imageUrl = previewImage.dataset.compressedData;
    } else if (previewImage.dataset.imageUrl) {
      // 通常のURLの場合
      imageUrl = previewImage.dataset.imageUrl;
    } else {
      showError('画像の情報が取得できませんでした。');
      return;
    }
    
    // localStorageに保存
    try {
      localStorage.setItem('customBackgroundImage', imageUrl);
      if (imageUrl.indexOf('data:') === 0) {
        userSettingsBgUploadPending = true;
      } else {
        userSettingsBgUploadPending = false;
        // プリセット選択時も旧 Drive はサーバ側で削除させるため ID は残す
      }
      
      // 背景画像を更新
      var backgroundImage = dom.backgroundImage;
      if (backgroundImage) {
        // URLが既に引用符で囲まれている場合はそのまま、そうでない場合は追加
        var urlValue = imageUrl;
        if (!urlValue.startsWith('"') && !urlValue.startsWith("'")) {
          if (urlValue.startsWith('img/bg/')) {
            urlValue = '"' + urlValue + '"';
          }
        }
        backgroundImage.style.backgroundImage = 'url(' + urlValue + ')';
      }
      
      // プレビューモーダルを閉じる
      closeBackgroundPreviewModal();
      scheduleUserSettingsSync();
    } catch (e) {
      showError('背景画像の保存に失敗しました。ストレージの容量が不足している可能性があります。');
    }
  }
}

// 画像を500KB以下に圧縮
function compressImageToDataURL(dataUrl, maxSizeKB, callback) {
  var maxSizeBytes = maxSizeKB * 1024;
  var img = new Image();
  
  img.onload = function() {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    
    // 画像のサイズを取得
    var width = img.width;
    var height = img.height;
    
    // 最大サイズを超える場合はリサイズ
    var maxDimension = 1920; // 最大幅・高さ
    if (width > maxDimension || height > maxDimension) {
      var ratio = Math.min(maxDimension / width, maxDimension / height);
      width = width * ratio;
      height = height * ratio;
    }
    
    canvas.width = width;
    canvas.height = height;
    
    // 画像を描画
    ctx.drawImage(img, 0, 0, width, height);
    
    // 品質を調整しながら圧縮（二分探索）
    var quality = 0.9;
    var minQuality = 0.1;
    var maxQuality = 0.9;
    var compressedDataUrl = null;
    
    function compress() {
      var dataUrl = canvas.toDataURL('image/jpeg', quality);
      var size = (dataUrl.length * 3) / 4; // Base64のサイズをバイト数に変換（概算）
      
      if (size <= maxSizeBytes || quality <= minQuality) {
        compressedDataUrl = dataUrl;
        callback(compressedDataUrl);
      } else {
        // 品質を下げて再試行
        maxQuality = quality;
        quality = (quality + minQuality) / 2;
        compress();
      }
    }
    
    compress();
  };
  
  img.onerror = function() {
    showError('画像の読み込みに失敗しました。');
  };
  
  img.src = dataUrl;
}
