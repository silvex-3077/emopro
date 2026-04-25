import { useState, useRef, useMemo, useCallback } from 'react';
import Papa from 'papaparse';
import { Scene, Line } from './types/Types'; // Lineもインポート

import Editer from './components/Editer';
import EmotionLineGraph from './components/EmotionLineGraph';
import EmotionSettings from './components/EmotionSettings';
// import DebugEmotionData from './components/DebugEmotionData';
import GraphHeader from './components/GraphHeader';

import './styles/App.css';


export const eel = (window as any).eel;
eel.set_host("ws://localhost:8080");

// 全ての感情タイプ
const ALL_EMOTIONS = ['喜び', '信頼', '期待', '驚き', '悲しみ', '恐れ', '嫌悪', '怒り'];

// ★ CSVの行データからシーンの配列に変換するロジック
const convertCsvToScenes = (csvData: any[]): Scene[] => {
  const scenesMap = new Map<number, Scene>();

  csvData.forEach((row, index) => {
    const sceneNumber = parseInt(row['scene'], 10);
    const character = row['character']?.trim() || '';
    const dialogue = row['text']?.trim() || '';

    // sceneNumberが無効な行はスキップ
    if (isNaN(sceneNumber)) return;

    // 対応するシーンがまだなければ作成
    if (!scenesMap.has(sceneNumber)) {
      scenesMap.set(sceneNumber, {
        id: sceneNumber, // CSVのシーン番号をIDとして使用
        title: `第${sceneNumber}章：シーンタイトル`, // 仮のタイトル
        lines: [],
      });
    }

    let finalContent = '';
    // 「登場人物」列に名前がある場合 (セリフの場合)
    if (character) {
      // 「セリフ」列に既にカギ括弧があるかチェック
      if (dialogue.startsWith('「') && dialogue.endsWith('」')) {
        // ある場合は、キャラ名とセリフをそのまま結合
        finalContent = character + dialogue;
      }
    } else {
      // 「登場人物」列が空の場合 (ト書きの場合)
      finalContent = dialogue;
    }

    // 新しい行オブジェクトを作成
    const newLine: Line = {
      id: Date.now() + index, // ユニークなIDを生成
      character: character,
      content: finalContent,
      type: character ? 'セリフ' : 'ト書き',
      emotion: {}, // 感情データは初期化
    };

    // シーンに行を追加
    scenesMap.get(sceneNumber)?.lines.push(newLine);
  });

  // Mapからシーンの配列を生成して返す
  return Array.from(scenesMap.values());
};


function App() {
  const initialScenes: Scene[] = [
    {
      id: 1,
      title: '第1章：シーンタイトル',
      lines: [
        { id: 1, type: 'セリフ', character: '主人公', content: '主人公「始まりだ！」' },
        { id: 2, type: 'ト書き', character: '', content: '朝日が昇る頃、主人公は目を覚ました。' },
        { id: 3, type: 'セリフ', character: '親友', content: '親友「おはよう、よく眠れたかい？」' },
        { id: 4, type: 'ト書き', character: '', content: '窓から差し込む光が、新しい一日の始まりを告げていた。' },
        { id: 5, type: 'セリフ', character: '主人公', content: '主人公「ああ、バッチリだよ！」' },
      ],
    },
    {
      id: 2,
      title: '第2章：展開',
      lines: [
        { id: 6, type: 'ト書き', character: '', content: '街は既に活気に満ちていた。' },
        { id: 7, type: 'セリフ', character: 'モブ', content: 'モブ「今日の市場は賑やかだな！」' },
        { id: 8, type: 'セリフ', character: '主人公', content: '主人公「何だか胸が踊るな！」' },
      ],
    },
  ];
  // シーンの状態管理
  const [scenesState, setScenesState] = useState<{ scenes: Scene[] }>({ scenes: initialScenes });

  // ーーEditerで選択中の行を示すPropーー
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set());
  const lastSelectedLine = useRef<string | null>(null);

  // グラフ1・グラフ2の表示オプションの状態
  const [graph1Mode, setGraph1Mode] = useState<'overall' | 'by-character'>('overall');
  const [graph2Mode, setGraph2Mode] = useState<'overall' | 'by-character'>('overall');
  const [graph1Character, setGraph1Character] = useState<string>('');
  const [graph2Character, setGraph2Character] = useState<string>('');

  // グラフ重ね表示・反転の状態
  const [overlayGraph1On2, setOverlayGraph1On2] = useState(false);
  const [overlayGraph2On1, setOverlayGraph2On1] = useState(false);
  const [invertOverlayOn1, setInvertOverlayOn1] = useState(false);
  const [invertOverlayOn2, setInvertOverlayOn2] = useState(false);

  // 全てのキャラクター名を抽出
  const allCharacters = useMemo(() => {
    const characters = new Set<string>();
    scenesState.scenes.forEach(scene => {
      scene.lines.forEach(line => {
        if (line.character && line.character !== '') {
          characters.add(line.character);
        }
      });
    });
    return Array.from(characters);
  }, [scenesState.scenes]);

  // 感情グラフに渡すデータを準備する関数
  const prepareEmotionDataForGraph = useCallback(() => {
    const graphData: Array<{ lineId: number; content: string; emotion?: Record<string, number>; character?: string }> = [];
    scenesState.scenes.forEach(scene => {
      scene.lines.forEach(line => {
        // 感情データがあり、内容が空でない行のみを含める
        // キャラクター情報も追加
        if (line.emotion && Object.keys(line.emotion).length > 0 && line.content.trim() !== '') {
          graphData.push({
            lineId: line.id,
            content: line.content,
            emotion: line.emotion,
            character: line.character, // キャラクター情報を追加
          });
        }
      });
    });
    return graphData;
  }, [scenesState.scenes]);


  // 感情グラフ設定関連の状態管理
  const [isEmotionSettingsOpen, setIsEmotionSettingsOpen] = useState(false);
  const [isEmotionGraphVisible, setIsEmotionGraphVisible] = useState(true); // Editer内のインライングラフ表示用
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>(ALL_EMOTIONS); // グラフとEditerの両方で使う感情フィルター
  const [emotionThreshold, setEmotionThreshold] = useState<number>(0); // グラフとEditerの両方で使うしきい値

  // 感情アコーディオンメニューの切り替え
  const toggleEmotionSettings = useCallback(() => {
    setIsEmotionSettingsOpen(prev => !prev);
  }, []);

  // すべての感情を選択/解除する関数
  const toggleAllEmotions = useCallback((select: boolean) => {
    setSelectedEmotions(select ? [...ALL_EMOTIONS] : []);
  }, []);

  // 感情チェックボックスの変更ハンドラ
  const handleEmotionCheckboxChange = useCallback((emotion: string) => {
    setSelectedEmotions(prev => {
      if (prev.includes(emotion)) {
        return prev.filter(e => e !== emotion);
      } else {
        return [...prev, emotion];
      }
    });
  }, []);

  // 感情のしきい値変更ハンドラ
  const handleThresholdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 1) {
      setEmotionThreshold(value);
    }
  }, []);


    // ファイル読み込み用の非表示input要素への参照
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ファイルを保存する関数 (TypeScriptのみで実装)
  const handleSave = useCallback(() => {
    const dataToSave = scenesState.scenes;
    const jsonString = JSON.stringify(dataToSave, null, 2);
    // データをBlobオブジェクトに変換
    const blob = new Blob([jsonString], { type: 'application/json' });
    // BlobからURLを生成
    const url = URL.createObjectURL(blob);
    
    // aタグを生成してダウンロードをトリガー
    const link = document.createElement('a');
    link.href = url;
    link.download = 'scenario.json'; // 保存するファイル名
    document.body.appendChild(link);
    link.click(); // aタグを擬似的にクリック
    
    // 後片付け
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('保存処理が完了しました。');
  }, [scenesState.scenes]);

  // ファイルを選択するダイアログを開く関数
  const triggerFileLoad = useCallback(() => {
    // 非表示のinput要素をクリックする
    fileInputRef.current?.click();
  }, []);

  // ファイルが選択されたときに呼ばれる関数 (TypeScriptのみで実装)
  const handleFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルの拡張子によって処理を分岐
    if (file.name.endsWith('.csv')) {
      // --- CSVファイルの処理 ---
      Papa.parse(file, {
        header: true, // 1行目をヘッダーとして扱う
        skipEmptyLines: true,
        complete: (results) => {
          console.log("Parsed CSV data:", results.data);
          const newScenes = convertCsvToScenes(results.data);
          if (newScenes.length > 0) {
            setScenesState({ scenes: newScenes });
            alert('CSVデータを読み込みました。');
          } else {
            alert('CSVの形式が正しくないか、読み込むデータがありません。');
          }
        },
        error: (error) => {
          console.error('CSV parse error:', error);
          alert('CSVファイルの解析中にエラーが発生しました。');
        }
      });
    } else if (file.name.endsWith('.json')) {
      // --- JSONファイルの処理 (既存のロジック) ---
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileContent = event.target?.result;
        if (typeof fileContent === 'string') {
          try {
            const loadedScenes: Scene[] = JSON.parse(fileContent);
            if (Array.isArray(loadedScenes)) {
              setScenesState({ scenes: loadedScenes });
              alert('JSONデータを読み込みました。');
            }
          } catch (err) {
            alert('JSONデータの読み込みに失敗しました。');
            console.error(err);
          }
        }
      };
      reader.readAsText(file, 'UTF-8');
    } else {
      alert('対応していないファイル形式です。.json または .csv を選択してください。');
    }

    e.target.value = ''; // 同じファイルを再度選択できるようにリセット
  }, []);

  // グラフ関連
  const [curveType, setCurveType] = useState<'none' | 'envelope' | 'regression'>('none');
  const [actDividers, setActDividers] = useState<[number, number]>([7 / 32, (7 + 18) / 32]);

  return (
    <>
      <div className="editor-header">
        <div className="header-content">
          {/* その他のヘッダーコンテンツ */}
          <button
            className="accordion-button"
            onClick={toggleEmotionSettings} // 親のハンドラを呼ぶ
          >
            感情グラフ設定 {isEmotionSettingsOpen ? '▲' : '▼'}
          </button>
          {/* 感情設定コンポーネント。感情表示の全体的な設定を管理。 */}
          <EmotionSettings
            isEmotionSettingsOpen={isEmotionSettingsOpen}
            isEmotionGraphVisible={isEmotionGraphVisible}
            setIsEmotionGraphVisible={setIsEmotionGraphVisible}
            selectedEmotions={selectedEmotions}
            handleEmotionCheckboxChange={handleEmotionCheckboxChange}
            toggleAllEmotions={toggleAllEmotions}
            emotionThreshold={emotionThreshold}
            handleThresholdChange={handleThresholdChange}
            ALL_EMOTIONS={ALL_EMOTIONS}
          />

          <button className="accordion-button" onClick={handleSave}>ファイルに保存</button>
          <button className="accordion-button" onClick={triggerFileLoad}>ファイルから読み込み</button>
          {/* ファイル選択ダイアログを開くための非表示の要素 */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelected}
            accept=".json, .csv" // ★ .csvも受け入れるように変更accept=".json" 
            style={{ display: 'none' }} 
          />

          <GraphHeader
            setGraph1Mode={setGraph1Mode}
            setGraph2Mode={setGraph2Mode}
            setGraph1Character={setGraph1Character}
            setGraph2Character={setGraph2Character}
            graph1Mode={graph1Mode}
            graph2Mode={graph2Mode}
            graph1Character={graph1Character}
            graph2Character={graph2Character}
            allCharacters={allCharacters}
            overlayGraph1On2={overlayGraph1On2}
            setOverlayGraph1On2={setOverlayGraph1On2}
            overlayGraph2On1={overlayGraph2On1}
            setOverlayGraph2On1={setOverlayGraph2On1}
            invertOverlayOn1={invertOverlayOn1}
            setInvertOverlayOn1={setInvertOverlayOn1}
            invertOverlayOn2={invertOverlayOn2}
            setInvertOverlayOn2={setInvertOverlayOn2}
            curveType={curveType} // ★追加
            setCurveType={setCurveType} // ★追加
            setActDividers={setActDividers} // ★追加
          />
        </div>
      </div>

      {/* デバッグ表示の切り替え　※削除厳禁※ */}
      {/* <DebugEmotionData
        scenes={scenesState.scenes}
        show={showDebugEmotionData}
        toggleShow={() => setShowDebugEmotionData(prev => !prev)}
      /> */}

      <div className="app-container">
        <div className="emotion-container">
          {/* ▼グラフ本体 */}
          <EmotionLineGraph
            emotionData={prepareEmotionDataForGraph()}
            selectedEmotions={selectedEmotions}
            emotionThreshold={emotionThreshold}
            graphMode={graph1Mode}
            selectedLines={selectedLines}
            selectedCharacter={graph1Character}
            overlayData={overlayGraph2On1 ? {
              emotionData: prepareEmotionDataForGraph(),
              selectedLines,
              selectedEmotions,
              emotionThreshold,
              graphMode: graph2Mode,
              selectedCharacter: graph2Character,
              invert: invertOverlayOn1,
            } : undefined}
            curveType={curveType}
            actDividers={actDividers}
            setActDividers={setActDividers}
          />
        </div>
        <div className='editer-container'>
          <Editer
            scenes={scenesState.scenes}
            onScenesChange={(updatedScenes) => setScenesState({ scenes: updatedScenes })}
            isEmotionGraphVisible={isEmotionGraphVisible}
            selectedLines={selectedLines} // ★追加
            setSelectedLines={setSelectedLines} // ★追加
            lastSelectedLine={lastSelectedLine} // ★追加
            selectedEmotions={selectedEmotions}
            emotionThreshold={emotionThreshold}
            ALL_EMOTIONS={ALL_EMOTIONS}
          />
        </div>
      </div>
    </>
  );
}

export default App;