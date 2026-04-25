/// 型定義

export type EmotionKeys = '喜び' | '信頼' | '期待' | '驚き' | '悲しみ' | '恐れ' | '嫌悪' | '怒り';

export const getColor = (emotion: string): string => {
  const colorMap: { [key: string]: string } = {
    '喜び': '#FFD700',
    '信頼': '#92D050',
    '期待': '#FF8C00',
    '驚き': '#00B0F0',
    '悲しみ': '#6666FF',
    '恐れ': '#00B050',
    '嫌悪': '#FF66FF',
    '怒り': '#FF0000',
  };
  return colorMap[emotion] || 'gray';
};

const MAX_CHARACTERS = 50; // 最大文字数
const MAX_LINES = 3; // 最大行数
export const getLineHighlightColor = (content: string): string => {
  const lineCount = content.split('\n').length;
  if (content.length > MAX_CHARACTERS || lineCount > MAX_LINES) {
    return 'highlight-red';
  } else if (content.length > MAX_CHARACTERS * 0.8 || lineCount > MAX_LINES * 0.8) {
    return 'highlight-yellow';
  }
  return '';
};

export interface Scene {
  id: number;
  title: string;
  lines: Line[];
}

export interface Line {
  id: number;
  type: string;
  character?: string;
  content: string;
  emotion?: EmotionData;
}

export interface EmotionData {
  [key: string]: number;
}

export interface EmotionAnalysisResult {
  id: number;
  text: string;
  emotion: [{[key: string]: number}];
}





// ※仮置き※
// ベースとなる分析データ構造
export interface AnalysisData {
  id: string;                         // 一意のID (例: "scene-1" または "line-5")
  type: 'scene' | 'line' | 'dialog';  // データタイプ
  content: string;                    // 内容テキスト
  metadata: AnalysisMetadata;         // メタデータ
  emotions?: EmotionAnalysis;         // 感情分析データ（オプション）
  relationships?: RelationshipData[]; // 関係性データ（オプション）
}

// メタデータ
export interface AnalysisMetadata {
  sceneId: number;                    // シーンID
  lineId?: number;                    // 行ID（該当する場合）
  character?: string;                 // キャラクター名（該当する場合）
  position: number;                   // シーン内またはストーリー内の位置
  timestamp?: number;                 // 登録/更新タイムスタンプ
  tags?: string[];                    // 任意のタグ（キーワードなど）
}

// 感情分析データ
export interface EmotionAnalysis {
  raw: {[emotion: string]: number};   // 生の感情スコア
  normalized: {[emotion: string]: number}; // 正規化された感情スコア（合計1.0）
  dominant: string[];                 // 主要感情（上位1-3つ）
  intensity: number;                  // 全体的な感情強度（0-1）
}

// 関係性データ
export interface RelationshipData {
  targetId: string;                   // 関連エンティティのID
  type: string;                       // 関係の種類（例: "同じシーン", "応答", "会話"）
  strength: number;                   // 関係の強さ（0-1）
  context?: string;                   // 関係性の文脈説明
}

// 分析結果の総合データ
export interface StoryAnalysis {
  scenes: AnalysisData[];             // シーンデータ
  lines: AnalysisData[];              // 行データ
  characters: CharacterAnalysis[];    // キャラクター分析
  emotionFlow: EmotionFlowPoint[];    // 感情の流れデータ
}

// キャラクター分析
export interface CharacterAnalysis {
  name: string;                       // キャラクター名
  appearances: string[];              // 出現しているシーン/行のID
  emotionProfile: {[emotion: string]: number}; // 全体的な感情プロファイル
  relationships: {
    [characterName: string]: number   // 他キャラクターとの関係の強さ
  };
}

// 感情フロー分析ポイント
export interface EmotionFlowPoint {
  position: number;                   // ストーリー内の位置
  sceneId: number;                    // シーンID
  lineId?: number;                    // 行ID（オプション）
  emotions: {[emotion: string]: number}; // その位置での感情状態
  shift?: {                           // 感情の変化（あれば）
    from: string;                     // 変化前の主要感情
    to: string;                       // 変化後の主要感情
    magnitude: number;                // 変化の大きさ
  };
}