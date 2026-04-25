import React, { useCallback } from 'react';
import { getColor } from '../types/Types';
import '../styles/EmotionSettings.css';

// Propsの型定義から toggleEmotionSettings を削除
export interface EmotionSettingsProps {
  isEmotionSettingsOpen: boolean;
  isEmotionGraphVisible: boolean;
  setIsEmotionGraphVisible: (isVisible: boolean) => void;
  selectedEmotions: string[];
  handleEmotionCheckboxChange: (emotion: string) => void;
  toggleAllEmotions: (select: boolean) => void;
  emotionThreshold: number;
  handleThresholdChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  ALL_EMOTIONS: string[];
}

const EmotionSettings: React.FC<EmotionSettingsProps> = ({
  isEmotionSettingsOpen,
  isEmotionGraphVisible,
  setIsEmotionGraphVisible,
  selectedEmotions,
  handleEmotionCheckboxChange,
  toggleAllEmotions,
  emotionThreshold,
  handleThresholdChange,
  ALL_EMOTIONS,
}) => {
  const onToggleVisibility = useCallback(() => {
    setIsEmotionGraphVisible(!isEmotionGraphVisible);
  }, [isEmotionGraphVisible, setIsEmotionGraphVisible]);

  // isEmotionSettingsOpen が false の場合は何もレンダリングしない
  if (!isEmotionSettingsOpen) {
    return null;
  }

  // true の場合のみ設定パネルをレンダリング
  return (
    <div className={`emotion-settings-panel open`}>
      <div className="emotion-settings-content">
        <div className="emotion-checkboxes">
          <div className="emotion-checkbox-controls">
            <button
              className="select-all-button"
              onClick={() => toggleAllEmotions(true)}
            >
              全選択
            </button>
            <button
              className="clear-all-button"
              onClick={() => toggleAllEmotions(false)}
            >
              全解除
            </button>
          </div>
          {ALL_EMOTIONS.map(emotion => (
            <label key={emotion} className="emotion-checkbox-label">
              <input
                type="checkbox"
                checked={selectedEmotions.includes(emotion)}
                onChange={() => handleEmotionCheckboxChange(emotion)}
              />
              <span
                className="emotion-color-indicator"
                style={{ backgroundColor: getColor(emotion) }}
              ></span>
              {emotion}
            </label>
          ))}
          <div className="threshold-description">
            チェックボックスで選択した感情のみをグラフに表示します
          </div>
        </div>
        <div className="threshold-setting">
          <label htmlFor="threshold-input">しきい値（0～1）:</label>
          <input
            id="threshold-input" type="number" min="0" max="1" step="0.01"
            value={emotionThreshold}
            onChange={handleThresholdChange}
          />
          <div className="threshold-description">
            設定したしきい値以上の感情のみを表示します
          </div>
        </div>
        <div className="emotion-graph-visibility">
          <label>
            <input
              type="checkbox"
              checked={isEmotionGraphVisible}
              onChange={onToggleVisibility}
            />
            テキストエディタ上に感情グラフを表示
          </label>
        </div>
      </div>
    </div>
  );
};

export default EmotionSettings;