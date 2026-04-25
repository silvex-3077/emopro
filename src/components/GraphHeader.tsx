import React, { useState } from 'react';
import '../styles/GraphHeader.css';

interface GraphHeaderProps {
  setGraph1Mode: (mode: 'overall' | 'by-character') => void;
  setGraph2Mode: (mode: 'overall' | 'by-character') => void;
  setGraph1Character: (character: string) => void;
  setGraph2Character: (character: string) => void;
  graph1Mode: 'overall' | 'by-character';
  graph2Mode: 'overall' | 'by-character';
  graph1Character: string;
  graph2Character: string;
  allCharacters: string[];
  // ▼追加
  overlayGraph1On2: boolean;
  setOverlayGraph1On2: (v: boolean) => void;
  overlayGraph2On1: boolean;
  setOverlayGraph2On1: (v: boolean) => void;
  invertOverlayOn1: boolean;
  setInvertOverlayOn1: (v: boolean) => void;
  invertOverlayOn2: boolean;
  setInvertOverlayOn2: (v: boolean) => void;

  curveType: 'none' | 'envelope' | 'regression';
  setCurveType: React.Dispatch<React.SetStateAction<'none' | 'envelope' | 'regression'>>;
  setActDividers: React.Dispatch<React.SetStateAction<[number, number]>>; // ★この行を追加
}

const GraphSelector: React.FC<{
  label: string;
  mode: 'overall' | 'by-character';
  setMode: (mode: 'overall' | 'by-character') => void;
  character: string;
  setCharacter: (character: string) => void;
  allCharacters: string[];
}> = ({ label, mode, setMode, character, setCharacter, allCharacters }) => (
  <div className="graph-selector-card">
    <div className="graph-selector-header">{label}</div>
    <div className="graph-selector-controls">
      <button
        className={`graph-selector-btn${mode === 'overall' ? ' selected' : ''}`}
        onClick={() => { setMode('overall'); setCharacter(''); }}
      >
        全体
      </button>
      <button
        className={`graph-selector-btn${mode === 'by-character' ? ' selected' : ''}`}
        onClick={() => { setMode('by-character'); if (!character && allCharacters.length > 0) setCharacter(allCharacters[0]); }}
      >
        キャラクター
      </button>
      {mode === 'by-character' && (
        <select
          className="graph-selector-dropdown"
          value={character}
          onChange={e => setCharacter(e.target.value)}
        >
          {allCharacters.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      )}
    </div>
  </div>
);

const GraphOverlayControls: React.FC<{
  overlayGraph1On2: boolean;
  setOverlayGraph1On2: (v: boolean) => void;
  overlayGraph2On1: boolean;
  setOverlayGraph2On1: (v: boolean) => void;
  invertOverlayOn1: boolean;
  setInvertOverlayOn1: (v: boolean) => void;
  invertOverlayOn2: boolean;
  setInvertOverlayOn2: (v: boolean) => void;
}> = ({
  overlayGraph1On2, setOverlayGraph1On2,
  overlayGraph2On1, setOverlayGraph2On1,
  invertOverlayOn1, setInvertOverlayOn1,
  invertOverlayOn2, setInvertOverlayOn2,
}) => (
  <div className="graph-overlay-controls">
    <label>
      <input
        type="checkbox"
        checked={overlayGraph2On1}
        onChange={e => setOverlayGraph2On1(e.target.checked)}
      />
      グラフ2をグラフ1に重ねる
    </label>
    {overlayGraph2On1 && (
      <label>
        <input
          type="checkbox"
          checked={invertOverlayOn1}
          onChange={e => setInvertOverlayOn1(e.target.checked)}
        />
        重ねたグラフを上下反転
      </label>
    )}
    <label>
      <input
        type="checkbox"
        checked={overlayGraph1On2}
        onChange={e => setOverlayGraph1On2(e.target.checked)}
      />
      グラフ1をグラフ2に重ねる
    </label>
    {overlayGraph1On2 && (
      <label>
        <input
          type="checkbox"
          checked={invertOverlayOn2}
          onChange={e => setInvertOverlayOn2(e.target.checked)}
        />
        重ねたグラフを上下反転
      </label>
    )}
  </div>
);

const GraphHeader: React.FC<GraphHeaderProps> = ({
  setGraph1Mode,
  setGraph2Mode,
  setGraph1Character,
  setGraph2Character,
  graph1Mode,
  graph2Mode,
  graph1Character,
  graph2Character,
  allCharacters,
  overlayGraph1On2,
  setOverlayGraph1On2,
  overlayGraph2On1,
  setOverlayGraph2On1,
  invertOverlayOn1,
  setInvertOverlayOn1,
  invertOverlayOn2,
  setInvertOverlayOn2,
}) => {
  const [showOverlayOptions, setShowOverlayOptions] = useState(false);

  return (
    <div className='graph-header'>
      <GraphSelector
        label="グラフ1"
        mode={graph1Mode}
        setMode={setGraph1Mode}
        character={graph1Character}
        setCharacter={setGraph1Character}
        allCharacters={allCharacters}
      />
      <GraphSelector
        label="グラフ2"
        mode={graph2Mode}
        setMode={setGraph2Mode}
        character={graph2Character}
        setCharacter={setGraph2Character}
        allCharacters={allCharacters}
      />
      {/* <div className="graph-option-group" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <span>近似曲線:</span>
          <label>
            <input
              type="radio"
              name="curveType"
              value="none"
              checked={curveType === 'none'}
              onChange={(e) => setCurveType(e.target.value as any)}
            />
            なし
          </label>
          <label>
            <input
              type="radio"
              name="curveType"
              value="envelope"
              checked={curveType === 'envelope'}
              onChange={(e) => setCurveType(e.target.value as any)}
            />
            包絡線
          </label>
          <label>
            <input
              type="radio"
              name="curveType"
              value="regression"
              checked={curveType === 'regression'}
              onChange={(e) => setCurveType(e.target.value as any)}
            />
            回帰曲線
          </label>

          <button
            onClick={() => setActDividers([7 / 32, (7 + 18) / 32])}
            style={{ marginLeft: '15px' }}
          >
            区切りをリセット
          </button>
      </div> */}

      <div className="graph-header-options-toggle">
        <button
          className="graph-header-options-btn"
          onClick={() => setShowOverlayOptions(v => !v)}
        >
          オプション{showOverlayOptions ? '▲' : '▼'}
        </button>
        {showOverlayOptions && (
          <GraphOverlayControls
            overlayGraph1On2={overlayGraph1On2}
            setOverlayGraph1On2={setOverlayGraph1On2}
            overlayGraph2On1={overlayGraph2On1}
            setOverlayGraph2On1={setOverlayGraph2On1}
            invertOverlayOn1={invertOverlayOn1}
            setInvertOverlayOn1={setInvertOverlayOn1}
            invertOverlayOn2={invertOverlayOn2}
            setInvertOverlayOn2={setInvertOverlayOn2}
          />
        )}
      </div>
    </div>
  );
};

export default GraphHeader;
