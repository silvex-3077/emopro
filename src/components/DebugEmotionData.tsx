import React from 'react';
import { Scene } from '../types/Types';
import '../styles/EmotionSettings.css';

interface DebugEmotionDataProps {
  scenes: Scene[];
  show: boolean;
  toggleShow: () => void;
}

const DebugEmotionData: React.FC<DebugEmotionDataProps> = ({ scenes, show, toggleShow }) => {
  // すべての感情タイプを抽出
  const allEmotions = React.useMemo(() => {
    const set = new Set<string>();
    scenes.forEach(scene =>
      scene.lines.forEach(line =>
        line.emotion && Object.keys(line.emotion).forEach(e => set.add(e))
      )
    );
    return Array.from(set);
  }, [scenes]);

  return (
    <div className="editor-header">
      <div className="header-content">
        <button className="accordion-button" onClick={toggleShow}>
          感情データデバッグ {show ? '▲' : '▼'}
        </button>
      </div>
      {show && (
        <div className="emotion-settings-panel open" style={{ maxHeight: 350, overflow: 'auto' }}>
          <div className="emotion-settings-content" style={{ gap: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #e5e7eb', background: '#f9fafb', padding: '0.3rem' }}>シーン</th>
                    <th style={{ border: '1px solid #e5e7eb', background: '#f9fafb', padding: '0.3rem' }}>行ID</th>
                    <th style={{ border: '1px solid #e5e7eb', background: '#f9fafb', padding: '0.3rem' }}>種別</th>
                    <th style={{ border: '1px solid #e5e7eb', background: '#f9fafb', padding: '0.3rem' }}>キャラクター</th>
                    <th style={{ border: '1px solid #e5e7eb', background: '#f9fafb', padding: '0.3rem' }}>内容</th>
                    {allEmotions.map(emotion => (
                      <th key={emotion} style={{ border: '1px solid #e5e7eb', background: '#f3f4f6', padding: '0.3rem' }}>{emotion}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scenes.map(scene =>
                    scene.lines.map(line => (
                      <tr key={line.id}>
                        <td style={{ border: '1px solid #e5e7eb', padding: '0.3rem', background: '#f9fafb' }}>{scene.title}</td>
                        <td style={{ border: '1px solid #e5e7eb', padding: '0.3rem' }}>{line.id}</td>
                        <td style={{ border: '1px solid #e5e7eb', padding: '0.3rem' }}>{line.type}</td>
                        <td style={{ border: '1px solid #e5e7eb', padding: '0.3rem' }}>{line.character}</td>
                        <td style={{ border: '1px solid #e5e7eb', padding: '0.3rem', minWidth: 120 }}>{line.content}</td>
                        {allEmotions.map(emotion => (
                          <td key={emotion} style={{ border: '1px solid #e5e7eb', padding: '0.3rem', textAlign: 'right', background: line.emotion && line.emotion[emotion] > 0 ? '#e0f2fe' : undefined }}>
                            {line.emotion && line.emotion[emotion] !== undefined ? Number(line.emotion[emotion]).toFixed(2) : '-'}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="threshold-description" style={{ marginTop: '0.5rem' }}>
              感情データをテーブル形式で比較できます（横スクロール可）
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugEmotionData;
