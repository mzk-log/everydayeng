/**
 * Google Apps Script for Cloud Text-to-Speech API
 * Everyday English アプリ用
 */

// 許可されたドメインのリスト
var ALLOWED_DOMAINS = [
  'https://mzk-log.github.io',
  'http://localhost',
  'http://127.0.0.1'
];

// テキストの最大長さ（文字数）
var MAX_TEXT_LENGTH = 1000;

/**
 * Webアプリとして公開するメイン関数
 * POSTリクエストを受け取る
 */
function doPost(e) {
  try {
    // 1. リファラーチェック（セキュリティ対策）
    var referer = e.parameter.referer || '';
    if (!isAllowedDomain(referer)) {
      return createErrorResponse('Access denied: Invalid referer');
    }
    
    // 2. 入力検証
    var text = e.parameter.text || '';
    if (!text || text.trim() === '') {
      return createErrorResponse('Text parameter is required');
    }
    
    if (text.length > MAX_TEXT_LENGTH) {
      return createErrorResponse('Text length exceeds maximum limit of ' + MAX_TEXT_LENGTH + ' characters');
    }
    
    // 3. 言語を自動判定
    var languageCode = detectLanguage(text);
    var voiceName = getVoiceName(languageCode);
    
    // 4. Cloud Text-to-Speech APIを呼び出し
    var audioContent = callTextToSpeechAPI(text, languageCode, voiceName);
    
    if (!audioContent) {
      return createErrorResponse('Failed to generate speech');
    }
    
    // 5. 音声データを返す
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      audioContent: audioContent,
      language: languageCode,
      voiceName: voiceName
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return createErrorResponse('Error: ' + error.toString());
  }
}

/**
 * 許可されたドメインかチェック
 */
function isAllowedDomain(referer) {
  if (!referer) {
    return false;
  }
  
  for (var i = 0; i < ALLOWED_DOMAINS.length; i++) {
    if (referer.indexOf(ALLOWED_DOMAINS[i]) === 0) {
      return true;
    }
  }
  
  return false;
}

/**
 * テキストから言語を自動判定
 * 日本語文字（ひらがな、カタカナ、漢字）が含まれていれば日本語、そうでなければ英語
 */
function detectLanguage(text) {
  // 日本語文字の正規表現（ひらがな、カタカナ、漢字）
  var japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
  
  if (japanesePattern.test(text)) {
    return 'ja-JP';
  } else {
    return 'en-US';
  }
}

/**
 * 言語コードから音声名を取得
 */
function getVoiceName(languageCode) {
  if (languageCode === 'ja-JP') {
    return 'ja-JP-Neural2-B'; // 日本語女性
  } else {
    return 'en-US-Neural2-F'; // 英語女性
  }
}

/**
 * Cloud Text-to-Speech APIを呼び出す
 */
function callTextToSpeechAPI(text, languageCode, voiceName) {
  // APIキーをPropertiesServiceから取得
  var apiKey = PropertiesService.getScriptProperties().getProperty('TTS_API_KEY');
  
  if (!apiKey) {
    throw new Error('API key is not set. Please run setApiKey() function first.');
  }
  
  // Cloud Text-to-Speech APIのエンドポイント
  var url = 'https://texttospeech.googleapis.com/v1/text:synthesize?key=' + apiKey;
  
  // リクエストボディ
  var requestBody = {
    input: {
      text: text
    },
    voice: {
      languageCode: languageCode,
      name: voiceName,
      ssmlGender: 'FEMALE'
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 1.25,
      pitch: 0.0,
      volumeGainDb: 0.0
    }
  };
  
  // APIを呼び出し
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(requestBody),
    muteHttpExceptions: true
  };
  
  var response = UrlFetchApp.fetch(url, options);
  var responseCode = response.getResponseCode();
  var responseText = response.getContentText();
  
  if (responseCode !== 200) {
    throw new Error('API error: ' + responseCode + ' - ' + responseText);
  }
  
  var result = JSON.parse(responseText);
  
  if (!result.audioContent) {
    throw new Error('No audio content in response');
  }
  
  return result.audioContent;
}

/**
 * エラーレスポンスを作成
 */
function createErrorResponse(message) {
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: message
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * APIキーを設定する方法:
 * 
 * 【推奨方法】Google Apps Scriptエディタから直接設定:
 * 1. メニューから「プロジェクトの設定」を開く
 * 2. 「スクリプト プロパティ」セクションを開く
 * 3. 「スクリプト プロパティを追加」をクリック
 * 4. プロパティ名: TTS_API_KEY
 * 5. プロパティ値: 実際のCloud Text-to-Speech APIのAPIキー
 * 6. 「保存」をクリック
 * 
 * この方法なら、APIキーをコード内に記述する必要がありません。
 */

/**
 * APIキーが正しく設定されているか確認する関数
 */
function checkApiKey() {
  var apiKey = PropertiesService.getScriptProperties().getProperty('TTS_API_KEY');
  
  if (apiKey) {
    Logger.log('API key is set (length: ' + apiKey.length + ' characters)');
  } else {
    Logger.log('API key is not set. Please run setApiKey() function first.');
  }
}


