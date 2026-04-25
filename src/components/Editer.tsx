import React, { useState, useRef, useCallback } from 'react';
import { getColor } from '../types/Types';
import '../styles/Editer.css';

export const eel = (window as any).eel;

/// <summary>
//
// やることリスト
// ・スクリプトの簡易化
// ・セリフ「」内のみをPythonに入力できているかの確認を逐一行う
//
/// </summary>

// 親コンポーネントから受け取るPropsの型定義
interface EditerProps {
  scenes: Scene[];
  onScenesChange: (scenes: Scene[]) => void;
  isEmotionGraphVisible: boolean; // Appから受け取る
  selectedLines: Set<string>; // ★追加
  setSelectedLines: React.Dispatch<React.SetStateAction<Set<string>>>; // ★追加
  lastSelectedLine: React.MutableRefObject<string | null>; // ★追加
  selectedEmotions: string[]; // Appから受け取る
  emotionThreshold: number; // Appから受け取る
  ALL_EMOTIONS: string[]; // Appから受け取る
}

interface Scene {
  id: number;
  title: string;
  lines: Line[];
}
interface Line {
  id: number;
  type: string;
  character?: string;
  content: string;
  emotion?: EmotionData;
}

// 感情データのインターフェース
interface EmotionData {
  [key: string]: number;
}
// 感情分析結果インターフェース
interface EmotionAnalysisResult {
  id: number;
  text: string;
  emotion: [{[key: string]: number}];
}


function Editer({
  scenes,
  onScenesChange,
  isEmotionGraphVisible, // propsとして受け取る
  selectedEmotions, // propsとして受け取る
  emotionThreshold, // propsとして受け取る
  selectedLines,
  setSelectedLines,
  lastSelectedLine,
}: EditerProps) {

  const [draggedLine, setDraggedLine] = useState<string | null>(null);
  const dragOverLineId = useRef<string | null>(null);
  // const [activeSceneId, setActiveSceneId] = useState<number>(1);

  // デバウンス処理用タイマー
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- 感情分析 ---
  const analyzeSceneEmotions = useCallback((sceneId: number) => {
    const targetScene = scenes.find(scene => scene.id === sceneId);
    if (!targetScene) return;

    const itemsToAnalyze = targetScene.lines
      .map(line => ({ id: line.id, text: line.content.match(/「(.*?)」/)?.[1] || line.content }))
      .filter(item => item.text.trim() !== '');

    if (itemsToAnalyze.length === 0) return;

    eel.analyze_emotion_simple(itemsToAnalyze)((data: string) => {
      try {
        const parsedData: EmotionAnalysisResult[] = JSON.parse(data);
        const updatedScenes = scenes.map(scene => {
          if (scene.id === sceneId) {
            return {
              ...scene,
              lines: scene.lines.map(line => {
                const result = parsedData.find(item => item.id === line.id);
                return result ? { ...line, emotion: result.emotion[0] } : line;
              })
            };
          }
          return scene;
        });
        onScenesChange(updatedScenes);
      } catch (error) { console.error("Error parsing emotion data:", error); }
    });
  }, [scenes, onScenesChange]);

  // --- 判定ロジック ---
  const determineLineTag = useCallback((content: string): { type: string; character: string } => {
    const match = content.match(/^(.*?)「(.*?)」/);
    return match ? { type: 'セリフ', character: match[1].trim() || '不明' } : { type: 'ト書き', character: '' };
  }, []);

  // --- イベントハンドラ ---
  const addNewScene = useCallback(() => {
    const newScene: Scene = {
      id: Date.now(),
      title: `シーンタイトル ${scenes.length + 1}`,
      lines: [{ id: Date.now() + 1, type: '', character: '', content: '' }]
    };
    onScenesChange([...scenes, newScene]);
    setSelectedLines(new Set([newScene.lines[0].id.toString()]));
  }, [scenes, onScenesChange]);

  const handleSceneTitleChange = useCallback((sceneId: number, newTitle: string) => {
    const updatedScenes = scenes.map(scene => 
      scene.id === sceneId ? { ...scene, title: newTitle } : scene
    );
    onScenesChange(updatedScenes);
  }, [scenes, onScenesChange]);

  // Editerコンポーネントの内部、既存のハンドラ関数の近くに追加
  const handleAnalyzeAllScenes = useCallback(() => {
    // 1. 全てのシーンから分析対象の行を一つの配列にまとめる
    const allItemsToAnalyze = scenes.flatMap(scene =>
      scene.lines
        .map(line => ({
          id: line.id,
          text: line.content.match(/「(.*?)」/)?.[1] || line.content
        }))
        .filter(item => item.text.trim() !== '')
    );

    if (allItemsToAnalyze.length === 0) {
      alert('分析対象のテキストがありません。');
      return;
    }

    // 2. 既存のeel関数を一度だけ呼び出す
    eel.analyze_emotion_simple(allItemsToAnalyze)((data: string) => {
      try {
        const parsedData: EmotionAnalysisResult[] = JSON.parse(data);
        
        // 3. 返ってきた分析結果を元のデータ構造にマージする
        const updatedScenes = scenes.map(scene => ({
          ...scene,
          lines: scene.lines.map(line => {
            const result = parsedData.find(item => item.id === line.id);
            // 分析結果があればemotionを更新、なければ元のまま
            return result ? { ...line, emotion: result.emotion[0] } : line;
          })
        }));

        // 4. 親コンポーネントの状態を更新
        onScenesChange(updatedScenes);
        alert('全シーンの感情分析が完了しました。');

      } catch (error) {
        console.error("Error parsing all scenes analysis results:", error);
        alert('分析結果の解析中にエラーが発生しました。');
      }
    });
  }, [scenes, onScenesChange]);

  const handleLineChange = useCallback((sceneId: number, lineId: number, newContent: string) => {
    const updatedScenes = scenes.map(scene => {
      if (scene.id === sceneId) {
        return {
          ...scene,
          lines: scene.lines.map(line => {
            if (line.id === lineId) {
              const { type, character } = determineLineTag(newContent);
              return { ...line, content: newContent, type, character };
            }
            return line;
          })
        };
      }
      return scene;
    });
    onScenesChange(updatedScenes);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      analyzeSceneEmotions(sceneId);
    }, 500);
  }, [scenes, onScenesChange, determineLineTag, analyzeSceneEmotions]);

  const addNewLine = useCallback((sceneId: number, afterId?: number) => {
    const newLine: Line = { id: Date.now(), type: '', character: '', content: '' };
    const updatedScenes = scenes.map(scene => {
      if (scene.id === sceneId) {
        const newLines = [...scene.lines];
        const index = afterId !== undefined ? newLines.findIndex(line => line.id === afterId) : -1;
        newLines.splice(index + 1, 0, newLine);
        return { ...scene, lines: newLines };
      }
      return scene;
    });
    onScenesChange(updatedScenes);
    setSelectedLines(new Set([newLine.id.toString()]));
  }, [scenes, onScenesChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, sceneId: number, lineId: number) => {
    const currentScene = scenes.find(s => s.id === sceneId);
    if (!currentScene) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addNewLine(sceneId, lineId);
    } else if (e.key === 'Backspace') {
      const line = currentScene.lines.find(l => l.id === lineId);
      if (line?.content === '' && currentScene.lines.length > 1) {
        e.preventDefault();
        const lineIndex = currentScene.lines.findIndex(l => l.id === lineId);
        const updatedScenes = scenes.map(scene => 
          scene.id === sceneId 
            ? { ...scene, lines: scene.lines.filter(l => l.id !== lineId) }
            : scene
        );
        onScenesChange(updatedScenes);
        
        if (lineIndex > 0) {
          setSelectedLines(new Set([currentScene.lines[lineIndex - 1].id.toString()]));
        }
      }
    }
  }, [scenes, onScenesChange, addNewLine]);


  // 行クリックハンドラ
  const handleLineClick = useCallback((e: React.MouseEvent, lineId: number) => {
    if (e.shiftKey && lastSelectedLine.current) {
      // 複数行選択（シフトキー）
      let allLines: Line[] = [];
      scenes.forEach(scene => allLines = [...allLines, ...scene.lines]);
      
      const newSelected = new Set<string>();
      const startIndex = allLines.findIndex(line => line.id === Number(lastSelectedLine.current));
      const endIndex = allLines.findIndex(line => line.id === lineId);
      const [start, end] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];

      allLines.slice(start, end + 1).forEach(line => newSelected.add(line.id.toString()));
      setSelectedLines(newSelected);
    } else if (e.ctrlKey || e.metaKey) {
      // 複数行選択（Ctrl/Cmdキー）
      const newSelected = new Set(selectedLines);
      if (newSelected.has(lineId.toString())) {
        newSelected.delete(lineId.toString());
      } else {
        newSelected.add(lineId.toString());
      }
      setSelectedLines(newSelected);
    } else {
      // 単一行選択
      setSelectedLines(new Set([lineId.toString()]));
    }
    lastSelectedLine.current = lineId.toString();
  }, [scenes, selectedLines, setSelectedLines, lastSelectedLine]);

  // ドラッグアンドドロップ関連の処理
  const handleDragStart = useCallback((e: React.DragEvent, lineId: number) => {
    if (selectedLines.has(lineId.toString())) {
      e.dataTransfer.setData('text/plain', Array.from(selectedLines).join(','));
    } else {
      e.dataTransfer.setData('text/plain', lineId.toString());
      setSelectedLines(new Set([lineId.toString()]));
    }
    setDraggedLine(lineId.toString());
    e.dataTransfer.effectAllowed = 'move';
  }, [selectedLines]);

  const handleDragOver = useCallback((e: React.DragEvent, lineId: number) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLDivElement;
    const rect = target.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    
    target.classList.remove('drag-over-top', 'drag-over-bottom');
    if (e.clientY < midY) {
      target.classList.add('drag-over-top');
    } else {
      target.classList.add('drag-over-bottom');
    }
    
    dragOverLineId.current = lineId.toString();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const target = e.currentTarget as HTMLDivElement;
    target.classList.remove('drag-over-top', 'drag-over-bottom');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetSceneId: number) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLDivElement;
    target.classList.remove('drag-over-top', 'drag-over-bottom');

    if (!draggedLine || !dragOverLineId.current) return;

    const draggedIds = e.dataTransfer.getData('text/plain').split(',').map(Number);
    const targetId = Number(dragOverLineId.current);
    const insertAfter = e.clientY > (target.getBoundingClientRect().top + target.getBoundingClientRect().height / 2);

    let draggedLines: Line[] = [];
    let tempScenes = scenes.map(scene => {
      draggedLines.push(...scene.lines.filter(line => draggedIds.includes(line.id)));
      return { ...scene, lines: scene.lines.filter(line => !draggedIds.includes(line.id)) };
    });

    const finalScenes = tempScenes.map(scene => {
      if (scene.id === targetSceneId) {
        const targetIndex = scene.lines.findIndex(line => line.id === targetId);
        const insertIndex = insertAfter ? targetIndex + 1 : targetIndex;
        const newLines = [...scene.lines];
        newLines.splice(insertIndex, 0, ...draggedLines);
        return { ...scene, lines: newLines };
      }
      return scene;
    });

    onScenesChange(finalScenes);
    setDraggedLine(null);
    dragOverLineId.current = null;
  }, [draggedLine, scenes, onScenesChange]);


  // 総文字数と行数を計算する関数
  const getTotalStats = useCallback(() => {
    let totalCharacters = 0;
    let totalLineCount = 0;
    
    scenes.forEach(scene => {
      scene.lines.forEach(line => {
        totalCharacters += line.content.length;
        totalLineCount++;
      });
    });
    
    return { totalCharacters, totalLineCount };
  }, [scenes]);

  const { totalCharacters, totalLineCount } = getTotalStats();


  // フィルター適用後の感情データを取得する関数
  const getFilteredEmotionData = useCallback((rawEmotionData?: EmotionData): EmotionData => {
    if (!rawEmotionData) return {};
    
    let filtered = Object.fromEntries(Object.entries(rawEmotionData).filter(([key]) => selectedEmotions.includes(key)));
    const total = Object.values(filtered).reduce((sum, value) => sum + value, 0);
    
    if (emotionThreshold > 0 && total > 0) {
      filtered = Object.fromEntries(Object.entries(filtered).filter(([, value]) => (value / total) >= emotionThreshold));
    }
    return filtered;
  }, [selectedEmotions, emotionThreshold]);



  return (
    <div className="container">
      <div className="editor-header">
        <div className="header-content">
          <div className="scene-controls">
            <button
              onClick={addNewScene}
              className="add-scene-button"
            >
              <span>新しいシーンを追加</span>
            </button>
            <button
              onClick={handleAnalyzeAllScenes}
              className="analyze-all-btn"
            >
              <span>全シーンを分析</span>
            </button>
          </div>
          <div className="stats">
            <span>{`総文字数: ${totalCharacters}`}</span>
            <span>{`総ライン数: ${totalLineCount}`}</span>
          </div>
        </div>
      </div>

      <div className="editor-wrapper">
        <div className="editor">
          <div className="editor-content">
            {scenes.map((scene) => (
              <div key={scene.id} className="scene">
                <div className="scene-title-container">
                  <input
                    type="text"
                    value={scene.title}
                    onChange={(e) => handleSceneTitleChange(scene.id, e.target.value)}
                    className="scene-title"
                  />
                  <button className="delete-button"></button>
                </div>

                {scene.lines.map((line) => {
                  const filteredEmotionData = getFilteredEmotionData(line.emotion);
                  // emotionValueの合計ではなく、個々の感情値の合計でバーの合計幅を計算
                  const total = Object.values(filteredEmotionData).reduce((sum, value) => sum + value, 0);


                  return (
                    <div
                      key={line.id}
                      className={`line ${selectedLines.has(line.id.toString()) ? 'selected' : ''}`}
                      onClick={(e) => handleLineClick(e, line.id)}
                      draggable
                      onDragStart={(e) => handleDragStart(e, line.id)}
                      onDragOver={(e) => handleDragOver(e, line.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, scene.id)}
                    >
                      <div
                        className="grip-handle"
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        {/* CSSで実装したグリップハンドル */}
                      </div>
                      <textarea
                        value={line.content}
                        onChange={(e) => handleLineChange(scene.id, line.id, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, scene.id, line.id)}
                        className="line-input"
                        rows={1}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = target.scrollHeight + 'px';
                        }}
                      />
                      {/* isEmotionGraphVisibleがtrueの場合のみインライングラフを表示 */}
                      {isEmotionGraphVisible && (
                        <div className="stacked-bar-chart-bar">
                          {total > 0 ? (
                            Object.entries(filteredEmotionData).map(([emotion, value]) => (
                              <div
                                key={emotion}
                                className="stacked-bar-chart-section"
                                style={{
                                  // 各感情の比率に基づいて幅を計算
                                  width: `${(value / total) * 100}%`,
                                  backgroundColor: getColor(emotion),
                                }}
                                title={`${emotion}: ${Math.round((value / total) * 100)}%`}
                              />
                            ))
                          ) : (
                            <div className="no-emotion-data">NO DATA</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Editer;