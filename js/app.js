// グローバル変数
var categories = [];
var currentCategoryData = [];
var currentCategoryNo = null;
var currentQuestionIndex = 0;
var learningStartTime = null;
var learningTimeInterval = null;
var stopwatchStartTime = null;
var stopwatchInterval = null;
var stopwatchElapsed = 0;
var isStopwatchRunning = false;
var isAnswerShown = false;

// スプレッドシートID
var SPREADSHEET_ID = '1pnlKMrp07Yz4MMCFByw8F04ttT3Cf6xDSX7zf5R64ZA';

// Google Sheets API v4 のAPIキー
// 注意: GitHub Pagesで公開する場合は、APIキーの制限（HTTPリファラー制限）を設定してください
// Google Cloud Console > APIとサービス > 認証情報 > APIキーを制限 > HTTPリファラー（ウェブサイト）に
// GitHub PagesのURL（例: https://yourusername.github.io/*）を追加してください
var API_KEY = 'AIzaSyCnXuzLY7ybqJU_gpl-y7gZPMO-o_7_TkY'; // ここにGoogle Cloud Consoleで取得したAPIキーを設定してください

// レスポンシブ: 画面幅に応じてフォントサイズを動的に調整
function applyResponsiveStyles() {
  var root = document.documentElement;
  var sizeCategory = '';
  
  // 複数の方法で画面幅を取得（テストプログラムと同じ方法）
  var methods = {
    windowInnerWidth: window.innerWidth,
    documentElementClientWidth: document.documentElement.clientWidth,
    bodyClientWidth: document.body.clientWidth,
    containerOffsetWidth: null,
    containerClientWidth: null,
    containerBoundingRect: null
  };
  
  // .container要素の幅を取得
  var container = document.querySelector('.container');
  if (container) {
    methods.containerOffsetWidth = container.offsetWidth;
    methods.containerClientWidth = container.clientWidth;
    var rect = container.getBoundingClientRect();
    methods.containerBoundingRect = rect.width;
  }
  
  // 最も信頼できる幅を選択（.containerの幅を優先）
  var width = 980; // デフォルト値
  if (container && methods.containerBoundingRect > 0 && methods.containerBoundingRect < 2000) {
    width = methods.containerBoundingRect;
  } else if (container && methods.containerOffsetWidth > 0 && methods.containerOffsetWidth < 2000) {
    width = methods.containerOffsetWidth;
  } else if (methods.documentElementClientWidth > 0 && methods.documentElementClientWidth < 2000) {
    width = methods.documentElementClientWidth;
  } else if (methods.bodyClientWidth > 0 && methods.bodyClientWidth < 2000) {
    width = methods.bodyClientWidth;
  } else if (methods.windowInnerWidth > 0 && methods.windowInnerWidth < 2000) {
    width = methods.windowInnerWidth;
  }
  
  // 画面幅に基づいてフォントサイズを設定
  if (width <= 320) {
    // 最小サイズの画面（320px以下）
    sizeCategory = '最小サイズ (320px以下)';
    width = 320;
    root.style.setProperty('--title-font-size', '42px');
    root.style.setProperty('--screen2-title-font-size', '30px');
    root.style.setProperty('--section-label-font-size', '26px');
    root.style.setProperty('--screen2-section-label-font-size', '24px');
    root.style.setProperty('--select-font-size', '26px');
    root.style.setProperty('--question-text-font-size', '28px');
    root.style.setProperty('--screen2-question-text-font-size', '26px');
    root.style.setProperty('--answer-text-font-size', '28px');
    root.style.setProperty('--screen2-answer-text-font-size', '26px');
    root.style.setProperty('--note-text-font-size', '24px');
    root.style.setProperty('--screen2-note-text-font-size', '22px');
    root.style.setProperty('--learning-time-font-size', '24px');
    root.style.setProperty('--screen2-learning-time-font-size', '22px');
    root.style.setProperty('--question-info-font-size', '26px');
    root.style.setProperty('--screen2-question-info-font-size', '24px');
    root.style.setProperty('--stopwatch-font-size', '28px');
    root.style.setProperty('--screen2-stopwatch-font-size', '26px');
    root.style.setProperty('--start-button-font-size', '28px');
  } else if (width <= 375) {
    // 非常に小さい画面（375px以下）
    sizeCategory = '非常に小さい (375px以下)';
    width = 375;
    root.style.setProperty('--title-font-size', '38px');
    root.style.setProperty('--screen2-title-font-size', '28px');
    root.style.setProperty('--section-label-font-size', '24px');
    root.style.setProperty('--screen2-section-label-font-size', '22px');
    root.style.setProperty('--select-font-size', '24px');
    root.style.setProperty('--question-text-font-size', '26px');
    root.style.setProperty('--screen2-question-text-font-size', '24px');
    root.style.setProperty('--answer-text-font-size', '26px');
    root.style.setProperty('--screen2-answer-text-font-size', '24px');
    root.style.setProperty('--note-text-font-size', '22px');
    root.style.setProperty('--screen2-note-text-font-size', '20px');
    root.style.setProperty('--learning-time-font-size', '22px');
    root.style.setProperty('--screen2-learning-time-font-size', '20px');
    root.style.setProperty('--question-info-font-size', '24px');
    root.style.setProperty('--screen2-question-info-font-size', '22px');
    root.style.setProperty('--stopwatch-font-size', '26px');
    root.style.setProperty('--screen2-stopwatch-font-size', '24px');
    root.style.setProperty('--start-button-font-size', '26px');
  } else if (width <= 480) {
    // 小さい画面（480px以下）
    sizeCategory = '小さい (480px以下)';
    width = 480;
    root.style.setProperty('--title-font-size', '34px');
    root.style.setProperty('--screen2-title-font-size', '26px');
    root.style.setProperty('--section-label-font-size', '22px');
    root.style.setProperty('--screen2-section-label-font-size', '20px');
    root.style.setProperty('--select-font-size', '22px');
    root.style.setProperty('--question-text-font-size', '24px');
    root.style.setProperty('--screen2-question-text-font-size', '22px');
    root.style.setProperty('--answer-text-font-size', '24px');
    root.style.setProperty('--screen2-answer-text-font-size', '22px');
    root.style.setProperty('--note-text-font-size', '20px');
    root.style.setProperty('--screen2-note-text-font-size', '18px');
    root.style.setProperty('--learning-time-font-size', '20px');
    root.style.setProperty('--screen2-learning-time-font-size', '18px');
    root.style.setProperty('--question-info-font-size', '22px');
    root.style.setProperty('--screen2-question-info-font-size', '20px');
    root.style.setProperty('--stopwatch-font-size', '24px');
    root.style.setProperty('--screen2-stopwatch-font-size', '22px');
    root.style.setProperty('--start-button-font-size', '24px');
  } else {
    // 通常サイズ（デフォルト値に戻す）
    sizeCategory = '通常サイズ (480px超)';
    width = 980;
    root.style.setProperty('--title-font-size', '24px');
    root.style.setProperty('--screen2-title-font-size', '18px');
    root.style.setProperty('--section-label-font-size', '16px');
    root.style.setProperty('--screen2-section-label-font-size', '14px');
    root.style.setProperty('--select-font-size', '16px');
    root.style.setProperty('--question-text-font-size', '18px');
    root.style.setProperty('--screen2-question-text-font-size', '16px');
    root.style.setProperty('--answer-text-font-size', '18px');
    root.style.setProperty('--screen2-answer-text-font-size', '16px');
    root.style.setProperty('--note-text-font-size', '14px');
    root.style.setProperty('--screen2-note-text-font-size', '12px');
    root.style.setProperty('--learning-time-font-size', '14px');
    root.style.setProperty('--screen2-learning-time-font-size', '12px');
    root.style.setProperty('--question-info-font-size', '16px');
    root.style.setProperty('--screen2-question-info-font-size', '14px');
    root.style.setProperty('--stopwatch-font-size', '18px');
    root.style.setProperty('--screen2-stopwatch-font-size', '16px');
    root.style.setProperty('--start-button-font-size', '18px');
  }
  
  // CSS変数を使用してスタイルを適用
  var style = document.createElement('style');
  style.id = 'responsive-styles';
  style.textContent = `
    .title { font-size: var(--title-font-size, 24px) !important; }
    #screen2 .title { font-size: var(--screen2-title-font-size, 18px) !important; }
    .section-label { font-size: var(--section-label-font-size, 16px) !important; }
    #screen2 .section-label { font-size: var(--screen2-section-label-font-size, 14px) !important; }
    select { font-size: var(--select-font-size, 16px) !important; }
    .question-text { font-size: var(--question-text-font-size, 18px) !important; }
    #screen2 .question-text { font-size: var(--screen2-question-text-font-size, 16px) !important; }
    .answer-text { font-size: var(--answer-text-font-size, 18px) !important; }
    #screen2 .answer-text { font-size: var(--screen2-answer-text-font-size, 16px) !important; }
    .note-text { font-size: var(--note-text-font-size, 14px) !important; }
    #screen2 .note-text { font-size: var(--screen2-note-text-font-size, 12px) !important; }
    .learning-time { font-size: var(--learning-time-font-size, 14px) !important; }
    #screen2 .learning-time { font-size: var(--screen2-learning-time-font-size, 12px) !important; }
    .question-info { font-size: var(--question-info-font-size, 16px) !important; }
    #screen2 .question-info { font-size: var(--screen2-question-info-font-size, 14px) !important; }
    .stopwatch { font-size: var(--stopwatch-font-size, 18px) !important; }
    #screen2 .stopwatch { font-size: var(--screen2-stopwatch-font-size, 16px) !important; }
    .start-button { font-size: var(--start-button-font-size, 18px) !important; }
  `;
  
  // 既存のスタイルを削除してから追加
  var existingStyle = document.getElementById('responsive-styles');
  if (existingStyle) {
    existingStyle.remove();
  }
  document.head.appendChild(style);
}

// 初期化
window.onload = function() {
  // レスポンシブスタイルを適用
  applyResponsiveStyles();
  
  // まずカテゴリリストを読み込む（優先度：高）
  loadCategories();
  setupEventListeners();
  
  // 画像は後から読み込む（優先度：低）
  // 背景画像とボタン画像を並列で読み込む
  setBackgroundImage();
  setButtonImages();
};

// リサイズ時にもレスポンシブスタイルを適用
window.addEventListener('resize', function() {
  applyResponsiveStyles();
});

// ボタン画像を設定する関数（最適化版）
function setButtonImages() {
  // ローカル画像を使用
  var images = {
    'play-button': 'img/play-button.png',
    'arrow': 'img/arrow.png',
    'home': 'img/home.png'
  };
  
  // play-button
  var playButtonImg = document.querySelector('#playButton img');
  if (playButtonImg && images['play-button']) {
    playButtonImg.src = images['play-button'];
  }
  
  // arrow (prev and next)
  var prevButtonImg = document.querySelector('#prevButton img');
  if (prevButtonImg && images['arrow']) {
    prevButtonImg.src = images['arrow'];
  }
  var nextButtonImg = document.querySelector('#nextButton img');
  if (nextButtonImg && images['arrow']) {
    nextButtonImg.src = images['arrow'];
  }
  
  // home
  var homeButtonImg = document.querySelector('#homeButton img');
  if (homeButtonImg && images['home']) {
    homeButtonImg.src = images['home'];
  }
}

// 背景画像を設定する関数（最適化版）
function setBackgroundImage() {
  var backgroundImage = document.getElementById('backgroundImage');
  if (backgroundImage) {
    // ローカル画像を使用
    backgroundImage.style.backgroundImage = 'url("img/bg.jpg")';
  }
}

// カテゴリ一覧を読み込む（最優先）
function loadCategories() {
  // ローディング表示
  var select = document.getElementById('categorySelect');
  if (select) {
    select.innerHTML = '<option value="">読み込み中...</option>';
    select.disabled = true;
  }
  
  // Google Sheets API v4でデータを取得
  // B列（Category_No）とC列（Category）を取得
  var url = 'https://sheets.googleapis.com/v4/spreadsheets/' + SPREADSHEET_ID + '/values/Data!B2:C?key=' + API_KEY;
  
  fetch(url)
    .then(function(response) {
      if (!response.ok) {
        throw new Error('ネットワークエラー: ' + response.status);
      }
      return response.json();
    })
    .then(function(data) {
      try {
        if (!data.values || data.values.length === 0) {
          throw new Error('データがありません');
        }
        
        // カテゴリを重複排除
        var categoryMap = {};
        var categoriesList = [];
        
        for (var i = 0; i < data.values.length; i++) {
          var row = data.values[i];
          if (!row || row.length < 2) continue;
          
          var categoryNo = row[0]; // B列: Category_No
          var category = row[1];   // C列: Category
          
          // 空の場合はスキップ
          if (!categoryNo || !category) continue;
          
          // 数値の場合は文字列に変換
          if (typeof categoryNo === 'number') {
            categoryNo = String(categoryNo);
          }
          
          // 重複チェック
          if (!categoryMap[categoryNo]) {
            categoryMap[categoryNo] = true;
            categoriesList.push({
              no: categoryNo,
              name: category
            });
          }
        }
        
        if (categoriesList.length === 0) {
          throw new Error('カテゴリが見つかりません');
        }
        
        categories = categoriesList;
        if (select) {
          select.innerHTML = '<option value="">Categoryを選択してください</option>';
          categories.forEach(function(cat) {
            var option = document.createElement('option');
            option.value = cat.no;
            option.textContent = cat.no + '-' + cat.name;
            select.appendChild(option);
          });
          select.disabled = false;
        }
      } catch (e) {
        showError('データ読み込みエラー: ' + e.toString());
        if (select) {
          select.disabled = false;
        }
      }
    })
    .catch(function(error) {
      showError('アクセスエラー: ' + error.toString());
      if (select) {
        select.disabled = false;
      }
    });
}

// イベントリスナーの設定
function setupEventListeners() {
  document.getElementById('categorySelect').addEventListener('change', function() {
    var categoryNo = this.value;
    if (categoryNo) {
      // 学習時間のカウント開始（カテゴリ選択時）
      if (learningStartTime === null) {
        learningStartTime = Date.now();
        startLearningTimeCounter();
      }
      loadCategoryData(categoryNo);
    } else {
      resetListDisplay();
    }
  });
  
  document.getElementById('startButton').addEventListener('click', function() {
    startLearning();
  });
  
  document.getElementById('answerButton').addEventListener('click', function() {
    showAnswer();
  });
  
  document.getElementById('playButton').addEventListener('click', function() {
    playAnswer();
  });
  
  document.getElementById('prevButton').addEventListener('click', function() {
    goToPreviousQuestion();
  });
  
  document.getElementById('nextButton').addEventListener('click', function() {
    goToNextQuestion();
  });
  
  document.getElementById('homeButton').addEventListener('click', function() {
    goToHome();
  });
  
  // モーダル閉じるボタン
  document.getElementById('modalCloseButton').addEventListener('click', function() {
    closeModal();
  });
  
  // モーダルオーバーレイクリックで閉じる
  document.getElementById('modalOverlay').addEventListener('click', function(e) {
    if (e.target === this) {
      closeModal();
    }
  });
  
  // ESCキーでモーダルを閉じる
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeModal();
    }
  });
}

// カテゴリデータを読み込む
function loadCategoryData(categoryNo) {
  // Google Sheets API v4でデータを取得
  // A列（ID）からI列（note）まで取得
  var url = 'https://sheets.googleapis.com/v4/spreadsheets/' + SPREADSHEET_ID + '/values/Data!A2:I?key=' + API_KEY;
  
  fetch(url)
    .then(function(response) {
      if (!response.ok) {
        throw new Error('ネットワークエラー: ' + response.status);
      }
      return response.json();
    })
    .then(function(data) {
      try {
        if (!data.values || data.values.length === 0) {
          throw new Error('データがありません');
        }
        
        // カテゴリ番号を文字列に統一
        if (typeof categoryNo === 'number') {
          categoryNo = String(categoryNo);
        }
        
        var items = [];
        
        for (var i = 0; i < data.values.length; i++) {
          var row = data.values[i];
          if (!row || row.length < 2) continue;
          
          var rowCategoryNo = row[1]; // B列: Category_No
          
          // 数値の場合は文字列に変換
          if (typeof rowCategoryNo === 'number') {
            rowCategoryNo = String(rowCategoryNo);
          }
          
          // カテゴリ番号が一致する行のみ取得
          if (rowCategoryNo == categoryNo) {
            items.push({
              id: row[0] || '',           // A列: ID
              no: row[3] || '',           // D列: No
              q_title: row[4] || '',      // E列: Q_Title
              question: row[5] || '',     // F列: Question
              a_title: row[6] || '',      // G列: A_Title
              answer: row[7] || '',       // H列: Answer
              note: row[8] || ''          // I列: note
            });
          }
        }
        
        currentCategoryData = items;
        currentCategoryNo = categoryNo;
        displayList();
      } catch (e) {
        showError('データ読み込みエラー: ' + e.toString());
      }
    })
    .catch(function(error) {
      showError('アクセスエラー: ' + error.toString());
    });
}

// リストを表示
function displayList() {
  var tableBody = document.getElementById('listTableBody');
  if (!tableBody) return;
  
  tableBody.innerHTML = '';
  
  // 最初のアイテムからQ_Titleを取得してヘッダーに設定
  if (currentCategoryData.length > 0 && currentCategoryData[0].q_title) {
    var headerCell = document.getElementById('listTableHeader');
    if (headerCell) {
      headerCell.textContent = currentCategoryData[0].q_title;
    }
  }
  
  currentCategoryData.forEach(function(item) {
    var row = document.createElement('tr');
    var noCell = document.createElement('td');
    noCell.textContent = item.no || '';
    var questionCell = document.createElement('td');
    // Question列の値を表示（大文字小文字を考慮）
    var questionText = item.question || item.Question || '';
    questionCell.textContent = questionText;
    row.appendChild(noCell);
    row.appendChild(questionCell);
    
    // 行クリックでモーダルを表示
    row.addEventListener('click', function() {
      showModal(item);
    });
    
    tableBody.appendChild(row);
  });
  
  var listMessage = document.getElementById('listMessage');
  var listContainer = document.getElementById('listContainer');
  var startButton = document.getElementById('startButton');
  
  if (listMessage) listMessage.style.display = 'none';
  if (listContainer) listContainer.style.display = 'block';
  if (startButton) startButton.style.display = 'block';
}

// リスト表示をリセット
function resetListDisplay() {
  var listMessage = document.getElementById('listMessage');
  var listContainer = document.getElementById('listContainer');
  var startButton = document.getElementById('startButton');
  
  if (listMessage) listMessage.style.display = 'block';
  if (listContainer) listContainer.style.display = 'none';
  if (startButton) startButton.style.display = 'none';
}

// エラーを表示
function showError(message) {
  var errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  var container = document.querySelector('.container');
  if (container) {
    container.insertBefore(errorDiv, container.firstChild);
    setTimeout(function() {
      errorDiv.remove();
    }, 3000);
  }
}

// 学習開始
function startLearning() {
  if (currentCategoryData.length === 0) {
    return;
  }
  
  // 画面遷移
  var screen1 = document.getElementById('screen1');
  var screen2 = document.getElementById('screen2');
  if (screen1) screen1.classList.remove('active');
  if (screen2) screen2.classList.add('active');
  
  // コンテナのパディングを減らす
  var container = document.querySelector('.container');
  if (container) container.classList.add('learning-mode');
  
  // カテゴリ情報を表示
  var selectedCategory = categories.find(function(cat) {
    return cat.no == currentCategoryNo;
  });
  if (selectedCategory) {
    var currentCategory = document.getElementById('currentCategory');
    if (currentCategory) {
      currentCategory.textContent = selectedCategory.no + '. ' + selectedCategory.name;
    }
  }
  
  // 最初の問題を表示
  currentQuestionIndex = 0;
  displayQuestion();
}

// 学習時間カウンターを開始
function startLearningTimeCounter() {
  learningTimeInterval = setInterval(function() {
    updateLearningTime();
  }, 1000);
  updateLearningTime();
}

// 学習時間を更新
function updateLearningTime() {
  if (learningStartTime === null) return;
  
  var elapsed = Date.now() - learningStartTime;
  var totalMinutes = Math.floor(elapsed / 60000);
  var hours = Math.floor(totalMinutes / 60);
  var minutes = totalMinutes % 60;
  var seconds = Math.floor((elapsed / 1000) % 60);
  
  var timeText = '<学習時間>' + hours + '時間' + String(minutes).padStart(2, '0') + '分' + String(seconds).padStart(2, '0') + '秒';
  
  // 学習画面の学習時間を更新
  var learningTimeElement = document.getElementById('learningTime');
  if (learningTimeElement) {
    learningTimeElement.textContent = timeText;
  }
  
  // TOPページの学習時間を更新
  var learningTimeTopElement = document.getElementById('learningTimeTop');
  if (learningTimeTopElement) {
    learningTimeTopElement.textContent = timeText;
  }
}

// 問題を表示
function displayQuestion() {
  if (currentQuestionIndex < 0 || currentQuestionIndex >= currentCategoryData.length) {
    return;
  }
  
  var item = currentCategoryData[currentQuestionIndex];
  
  // セクションラベルをQ_TitleとA_Titleから設定
  if (item.q_title) {
    var questionLabel = document.getElementById('questionSectionLabel');
    if (questionLabel) {
      questionLabel.textContent = item.q_title;
    }
  }
  if (item.a_title) {
    var answerLabel = document.getElementById('answerSectionLabel');
    if (answerLabel) {
      answerLabel.textContent = item.a_title;
    }
  }
  
  // 出題数表示
  var questionInfo = document.getElementById('questionInfo');
  if (questionInfo) {
    questionInfo.textContent = '[' + (currentQuestionIndex + 1) + '/' + currentCategoryData.length + ']';
  }
  
  // 質問文を表示
  var questionText = document.getElementById('questionText');
  if (questionText) {
    questionText.textContent = item.question || '';
  }
  
  // Answerボタンを表示
  var answerButtonContainer = document.getElementById('answerButtonContainer');
  var answerText = document.getElementById('answerText');
  if (answerButtonContainer) answerButtonContainer.style.display = 'block';
  if (answerText) answerText.classList.add('blinking');
  
  // 回答テキスト、停止時間表示コンテナを非表示
  var answerTextDisplay = document.getElementById('answerTextDisplay');
  var answerTimeContainer = document.getElementById('answerTimeContainer');
  var noteSection = document.getElementById('noteSection');
  if (answerTextDisplay) answerTextDisplay.style.display = 'none';
  if (answerTimeContainer) answerTimeContainer.style.display = 'none';
  if (noteSection) noteSection.style.display = 'none';
  isAnswerShown = false;
  
  // ストップウォッチをリセットして開始
  resetStopwatch();
  startStopwatch();
  
  // ナビゲーションボタンを無効化（Answerボタンが押されるまで）
  var prevButton = document.getElementById('prevButton');
  var nextButton = document.getElementById('nextButton');
  if (prevButton) prevButton.disabled = true;
  if (nextButton) nextButton.disabled = true;
}

// ストップウォッチを開始
function startStopwatch() {
  if (isStopwatchRunning) return;
  
  stopwatchStartTime = Date.now() - stopwatchElapsed;
  isStopwatchRunning = true;
  stopwatchInterval = setInterval(function() {
    updateStopwatch();
  }, 10);
  updateStopwatch();
}

// ストップウォッチを停止
function stopStopwatch() {
  if (!isStopwatchRunning) return;
  
  clearInterval(stopwatchInterval);
  stopwatchElapsed = Date.now() - stopwatchStartTime;
  isStopwatchRunning = false;
}

// ストップウォッチをリセット
function resetStopwatch() {
  stopStopwatch();
  stopwatchElapsed = 0;
  var answerStopwatch = document.getElementById('answerStopwatch');
  if (answerStopwatch) {
    answerStopwatch.textContent = '(00:00:00)';
  }
}

// ストップウォッチを更新
function updateStopwatch() {
  if (!isStopwatchRunning) return;
  
  var elapsed = Date.now() - stopwatchStartTime;
  var totalSeconds = Math.floor(elapsed / 1000);
  var minutes = Math.floor(totalSeconds / 60);
  var seconds = totalSeconds % 60;
  var milliseconds = Math.floor((elapsed % 1000) / 10);
  
  var answerStopwatch = document.getElementById('answerStopwatch');
  if (answerStopwatch) {
    answerStopwatch.textContent = 
      '(' + String(minutes).padStart(2, '0') + ':' +
      String(seconds).padStart(2, '0') + ':' +
      String(milliseconds).padStart(2, '0') + ')';
  }
}

// 答えを表示
function showAnswer() {
  if (isAnswerShown) return;
  
  stopStopwatch();
  
  var item = currentCategoryData[currentQuestionIndex];
  
  // Answerボタンを非表示
  var answerButtonContainer = document.getElementById('answerButtonContainer');
  var answerText = document.getElementById('answerText');
  if (answerButtonContainer) answerButtonContainer.style.display = 'none';
  if (answerText) answerText.classList.remove('blinking');
  
  // 停止時間を計算して表示
  var elapsed = stopwatchElapsed;
  var totalSeconds = Math.floor(elapsed / 1000);
  var minutes = Math.floor(totalSeconds / 60);
  var seconds = totalSeconds % 60;
  var milliseconds = Math.floor((elapsed % 1000) / 10);
  var timeText = String(minutes).padStart(2, '0') + ':' +
                 String(seconds).padStart(2, '0') + ':' +
                 String(milliseconds).padStart(2, '0');
  var answerTimeDisplay = document.getElementById('answerTimeDisplay');
  if (answerTimeDisplay) {
    answerTimeDisplay.textContent = timeText;
  }
  
  // 停止時間表示コンテナを表示（停止時間とplayボタンを含む）
  var answerTimeContainer = document.getElementById('answerTimeContainer');
  if (answerTimeContainer) {
    answerTimeContainer.style.display = 'flex';
  }
  
  // 回答文を表示
  var answerTextDisplay = document.getElementById('answerTextDisplay');
  if (answerTextDisplay) {
    answerTextDisplay.textContent = item.answer || '';
    answerTextDisplay.classList.remove('answer-hidden');
    answerTextDisplay.style.display = 'block';
  }
  
  // noteを表示
  if (item.note) {
    var noteText = document.getElementById('noteText');
    var noteSection = document.getElementById('noteSection');
    if (noteText) noteText.textContent = item.note;
    if (noteSection) noteSection.style.display = 'block';
  }
  
  isAnswerShown = true;
  
  // ナビゲーションボタンを有効化
  updateNavigationButtons();
}

// 回答を読み上げ
function playAnswer() {
  var item = currentCategoryData[currentQuestionIndex];
  if (!item || !item.answer) return;
  
  if ('speechSynthesis' in window) {
    var utterance = new SpeechSynthesisUtterance(item.answer);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

// 前の問題に戻る
function goToPreviousQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    displayQuestion();
  }
}

// 次の問題に進む
function goToNextQuestion() {
  if (currentQuestionIndex < currentCategoryData.length - 1) {
    currentQuestionIndex++;
    displayQuestion();
  }
}

// ナビゲーションボタンの状態を更新
function updateNavigationButtons() {
  var prevButton = document.getElementById('prevButton');
  var nextButton = document.getElementById('nextButton');
  if (prevButton) prevButton.disabled = (currentQuestionIndex === 0);
  if (nextButton) nextButton.disabled = (currentQuestionIndex === currentCategoryData.length - 1);
}

// ホームに戻る
function goToHome() {
  // ストップウォッチを停止
  stopStopwatch();
  
  // 画面遷移
  var screen2 = document.getElementById('screen2');
  var screen1 = document.getElementById('screen1');
  if (screen2) screen2.classList.remove('active');
  if (screen1) screen1.classList.add('active');
  
  // コンテナのパディングを元に戻す
  var container = document.querySelector('.container');
  if (container) container.classList.remove('learning-mode');
  
  // 学習時間はリセットしない（継続）
}

// モーダルを表示
function showModal(item) {
  if (!item) return;
  
  // A_Titleをラベルに設定
  if (item.a_title) {
    var modalAnswerLabel = document.getElementById('modalAnswerLabel');
    if (modalAnswerLabel) {
      modalAnswerLabel.textContent = item.a_title;
    }
  }
  
  // 回答文を表示
  var answerText = document.getElementById('modalAnswerText');
  if (answerText && item.answer) {
    answerText.textContent = item.answer;
  }
  
  // noteを表示（ある場合のみ）
  var noteSection = document.getElementById('modalNoteSection');
  var noteText = document.getElementById('modalNoteText');
  if (item.note && item.note.trim()) {
    if (noteText) {
      noteText.textContent = item.note;
    }
    if (noteSection) {
      noteSection.style.display = 'block';
    }
  } else {
    if (noteSection) {
      noteSection.style.display = 'none';
    }
  }
  
  // モーダルを表示
  var modalOverlay = document.getElementById('modalOverlay');
  if (modalOverlay) {
    modalOverlay.classList.add('active');
  }
}

// モーダルを閉じる
function closeModal() {
  var modalOverlay = document.getElementById('modalOverlay');
  if (modalOverlay) {
    modalOverlay.classList.remove('active');
  }
}

