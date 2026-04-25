import React, { useRef, useEffect, useState, useCallback } from 'react';
import '../styles/EmotionLineGraph.css';

// 感情データのインターフェース
interface EmotionData {
  [key: string]: number;
}

// グラフに渡すデータのインターフェース
interface GraphLineData {
  lineId: number;
  content: string;
  emotion?: EmotionData;
  character?: string; // キャラクター情報を追加
}

interface OverlayGraphProps {
  emotionData: GraphLineData[];
  selectedEmotions: string[];
  emotionThreshold: number;
  graphMode: 'overall' | 'by-character';
  selectedLines: Set<string>;
  selectedCharacter: string;
  invert?: boolean;
  flipHorizontal?: boolean; // 追加: 左右反転
}

interface EmotionLineGraphProps {
  emotionData: GraphLineData[];
  selectedEmotions: string[];
  emotionThreshold: number;
  graphMode: 'overall' | 'by-character';
  selectedLines: Set<string>;
  selectedCharacter: string;
  overlayData?: OverlayGraphProps;
  curveType: 'none' | 'envelope' | 'regression';
  flipHorizontal?: boolean; // 追加: メイングラフも左右反転できるように
  actDividers: [number, number]; // ★追加
  setActDividers: React.Dispatch<React.SetStateAction<[number, number]>>; // ★追加
}

// 感情と色のマッピング (testing.tsx の getColor と同じものを使用)
const EMOTION_COLORS: { [key: string]: string } = {
  '喜び': '#FFD700',
  '信頼': '#92D050',
  '期待': '#FF8C00',
  '驚き': '#00B0F0',
  '悲しみ': '#6666FF',
  '恐れ': '#00B050',
  '嫌悪': '#FF66FF',
  '怒り': '#FF0000',
};

const getColor = (emotion: string): string => {
  return EMOTION_COLORS[emotion] || '#cccccc'; // デフォルトはライトグレー
};

// 連立一次方程式を解くためのガウスの消去法
function solveLinearEquation(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  for (let i = 0; i < n; i++) {
    let maxEl = Math.abs(A[i][i]);
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > maxEl) {
        maxEl = Math.abs(A[k][i]);
        maxRow = k;
      }
    }

    for (let k = i; k < n; k++) {
      [A[maxRow][k], A[i][k]] = [A[i][k], A[maxRow][k]];
    }
    [b[maxRow], b[i]] = [b[i], b[maxRow]];

    if (A[i][i] === 0) return null; // 解なし

    for (let k = i + 1; k < n; k++) {
      const c = -A[k][i] / A[i][i];
      for (let j = i; j < n; j++) {
        if (i === j) {
          A[k][j] = 0;
        } else {
          A[k][j] += c * A[i][j];
        }
      }
      b[k] += c * b[i];
    }
  }

  const x: number[] = new Array(n).fill(0);
  for (let i = n - 1; i > -1; i--) {
    x[i] = b[i] / A[i][i];
    for (let k = i - 1; k > -1; k--) {
      b[k] -= A[k][i] * x[i];
    }
  }
  return x;
}

// データポイントから多項式回帰の係数を計算する
function polynomialRegression(data: { x: number, y: number }[], degree: number): number[] | null {
  const n = data.length;
  if (n === 0) return null;
  
  const d = degree + 1;
  const X: number[][] = Array.from({ length: d }, () => Array(d).fill(0));
  const Y: number[] = Array(d).fill(0);

  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) {
      X[i][j] = data.reduce((sum, p) => sum + Math.pow(p.x, i + j), 0);
    }
    Y[i] = data.reduce((sum, p) => sum + p.y * Math.pow(p.x, i), 0);
  }

  return solveLinearEquation(X, Y);
}

// データの上限（エンベロープ）を計算するための移動最大値を計算する関数
const calculateMovingMaximum = (data: number[], windowSize: number): number[] => {
  if (windowSize <= 1) return data;
  const envelopeData: number[] = [];
  const adjustedWindowSize = windowSize % 2 === 0 ? windowSize + 1 : windowSize;
  const halfWindow = Math.floor(adjustedWindowSize / 2);

  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(data.length, i + halfWindow + 1);
    const windowSlice = data.slice(start, end);
    const max = windowSlice.length > 0 ? Math.max(...windowSlice) : 0;
    envelopeData.push(max);
  }
  return envelopeData;
};


const EmotionLineGraph: React.FC<EmotionLineGraphProps> = ({
  emotionData,
  selectedEmotions,
  emotionThreshold,
  graphMode,
  selectedLines,
  selectedCharacter,
  overlayData,
  curveType,
  flipHorizontal = false,
  actDividers,
  setActDividers,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // ★ ドラッグ状態を管理するstateを追加
  const [draggingMarker, setDraggingMarker] = useState<'none' | 'divider1' | 'divider2'>('none');

  // グラフ描画のロジック
  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // キャンバスのDPI調整
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr); // キャンバスをクリア

    // グラフの余白とサイズ (bottomを増やして凡例スペースを確保)
    const padding = { top: 20, right: 30, bottom: 60, left: 60 };
    const graphWidth = (canvas.width / dpr) - padding.left - padding.right;
    const graphHeight = (canvas.height / dpr) - padding.top - padding.bottom;
    const dataLength = emotionData.length;

    const xScale = graphWidth / (dataLength - 1 > 0 ? dataLength - 1 : 1); // X軸のスケール (行のインデックス)
    const yScale = graphHeight; // Y軸のスケール (感情値 0-1)

    // --- 左右反転対応: X座標計算関数 ---
    const getX = (index: number, length: number, scale: number) => {
      if (flipHorizontal) { return padding.left + (length - 1 - index) * scale; }
      return padding.left + index * scale;
    };

    // データフィルタリング
    let filteredEmotionData = emotionData;
    if (graphMode === 'by-character' && selectedCharacter) {
      // 全体の行数・順序を維持しつつ、選択キャラクター以外の行はemotion: {}で埋める
      filteredEmotionData = emotionData.map(data =>
        data.character === selectedCharacter
          ? data
          : { ...data, emotion: {} }
      );
    } else if (graphMode === 'by-character' && !selectedCharacter) {
      // '全てのキャラクター'が選択されている場合は、キャラクターフィルターを適用しない（全体表示と同様）
      // あるいは、キャラクターのない行も含む全体表示にする
      // ここでは、キャラクターが指定されていない場合は「全体」として扱う
    }

    // --- 3幕構成の区切りに▼マーカーを配置(アクトディバイダー) ---
    const divider1X = padding.left + graphWidth * actDividers[0];
    const divider2X = padding.left + graphWidth * actDividers[1];
    
    const drawMarker = (x: number, isDragging: boolean) => {
      ctx.save();
      ctx.fillStyle = isDragging ? '#FF0000' : '#a9a9a9'; // ドラッグ中は赤
      const markerSize = 6;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x - markerSize, padding.top - markerSize);
      ctx.lineTo(x + markerSize, padding.top - markerSize);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    
    drawMarker(divider1X, draggingMarker === 'divider1');
    drawMarker(divider2X, draggingMarker === 'divider2');


    if (graphWidth <= 0 || graphHeight <= 0) return;
    if (dataLength === 0) {
      ctx.font = '16px Arial';
      ctx.fillStyle = '#666';
      ctx.textAlign = 'center';
      ctx.fillText('表示する感情データがありません', (canvas.width / dpr) / 2, (canvas.height / dpr) / 2);
      return;
    }

    // 全ての感情タイプを取得 (選択された感情のみ)
    const allEmotions = Array.from(new Set(selectedEmotions));

    // Y軸の描画 (0から1の目盛り)
    ctx.beginPath();
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + graphHeight);
    ctx.moveTo(padding.left, padding.top + graphHeight);
    ctx.lineTo(padding.left + graphWidth, padding.top + graphHeight);
    ctx.stroke();

    // Y軸の目盛りとラベル
    ctx.fillStyle = '#333';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 1; i += 0.2) {
      const y = padding.top + graphHeight * (1 - i);
      ctx.fillText(i.toFixed(1), padding.left - 10, y + 4);
      ctx.beginPath();
      ctx.moveTo(padding.left - 5, y);
      ctx.lineTo(padding.left, y);
      ctx.stroke();
    }
    ctx.fillText('感', padding.left - 35, padding.top + graphHeight / 2 - 12);
    ctx.fillText('情', padding.left - 35, padding.top + graphHeight / 2);
    ctx.fillText('値', padding.left - 35, padding.top + graphHeight / 2 + 12);

    // X軸の目盛り（データのインデックス）
    ctx.textAlign = 'center';
    ctx.font = '10px Arial';
    for (let i = 0; i < dataLength; i++) {
      const x = getX(i, dataLength, xScale);
      ctx.fillText(`${i + 1}`, x, padding.top + graphHeight + 15);
    }
    ctx.fillText('行数', padding.left + graphWidth / 2, padding.top + graphHeight + 30);

    // 各感情ごとにバーと点を描画
    allEmotions.forEach(emotion => {
      const emotionColor = getColor(emotion);

      filteredEmotionData.forEach((dataPoint, index) => {
        const emotionValue = dataPoint.emotion?.[emotion] ?? 0;
        const totalEmotionSum = dataPoint.emotion ? Object.values(dataPoint.emotion).reduce((sum, val) => sum + val, 0) : 0;
        const normalizedEmotionValue = totalEmotionSum > 0 ? emotionValue / totalEmotionSum : 0;

        if (normalizedEmotionValue >= emotionThreshold) {
          const x = getX(index, dataLength, xScale);
          const y0 = padding.top + graphHeight;
          const y1 = padding.top + graphHeight - (normalizedEmotionValue * yScale);

          // 縦線（バー）を描画
          ctx.save();
          ctx.strokeStyle = emotionColor;
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.5;
          ctx.beginPath();
          ctx.moveTo(x, y0);
          ctx.lineTo(x, y1);
          ctx.stroke();
          ctx.restore();

          // ★★★ 点を描画する処理を追加
          ctx.save();
          ctx.fillStyle = emotionColor;
          ctx.beginPath();
          ctx.arc(x, y1, 1, 0, 2 * Math.PI); // 半径1pxの円
          ctx.fill();
          ctx.restore();
        }
      });
    });
    
    // --- ★★★ 凡例の描画を追加 ★★★ ---
    ctx.save();
    ctx.font = '12px Arial';
    let legendX = padding.left;
    const legendY = padding.top + graphHeight + 45;
    const legendItemPadding = 25; // 各凡例アイテムの間のスペース
    const rectWidth = 15;
    const rectHeight = 10;
    const textPadding = 5;

    allEmotions.forEach(emotion => {
      const color = getColor(emotion);
      const textWidth = ctx.measureText(emotion).width;
      const itemWidth = rectWidth + textPadding + textWidth;

      // 凡例がグラフ幅を超える場合は改行
      if (legendX + itemWidth > padding.left + graphWidth) {
        legendX = padding.left;
        // legendY += 20; // 2行目のY座標 (必要に応じて)
      }

      // 色の四角形
      ctx.fillStyle = color;
      ctx.fillRect(legendX, legendY, rectWidth, rectHeight);
      
      // テキスト
      ctx.fillStyle = '#333';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(emotion, legendX + rectWidth + textPadding, legendY + rectHeight / 2);

      legendX += itemWidth + legendItemPadding;
    });
    ctx.restore();
    // --- 凡例ここまで ---

    // --- 選択されたタイプの近似曲線を描画 ---
    if (curveType === 'envelope') {
      allEmotions.forEach(emotion => {
        const rawValues = filteredEmotionData.map(dp => {
          const eV = dp.emotion?.[emotion] ?? 0;
          const tS = dp.emotion ? Object.values(dp.emotion).reduce((s, v) => s + v, 0) : 0;
          return tS > 0 ? eV / tS : 0;
        });

        const smoothingWindowSize = 5;
        const envelopeValues = calculateMovingMaximum(rawValues, smoothingWindowSize);
        const envelopePoints: { x: number; y: number }[] = [];
        envelopeValues.forEach((value, index) => {
          if (value >= emotionThreshold) {
            envelopePoints.push({ x: getX(index, dataLength, xScale), y: padding.top + graphHeight - (value * yScale) });
          }
        });

        if (envelopePoints.length < 2) return;
        
        ctx.beginPath();
        ctx.moveTo(envelopePoints[0].x, envelopePoints[0].y);
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 1;
        for (let i = 0; i < envelopePoints.length - 2; i++) {
            const p0 = envelopePoints[i], p1 = envelopePoints[i+1];
            ctx.quadraticCurveTo(p0.x, p0.y, (p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
        }
        const lastP1 = envelopePoints[envelopePoints.length-2], lastP2 = envelopePoints[envelopePoints.length-1];
        ctx.quadraticCurveTo(lastP1.x, lastP1.y, lastP2.x, lastP2.y);
        ctx.stroke();
      });
    } else if (curveType === 'regression') {
      allEmotions.forEach(emotion => {
        const regressionData = filteredEmotionData.map((dp, i) => {
            const eV = dp.emotion?.[emotion] ?? 0;
            const tS = dp.emotion ? Object.values(dp.emotion).reduce((s, v) => s + v, 0) : 0;
            return { x: i, y: tS > 0 ? eV / tS : 0 };
        }).filter(p => p.y > 0);

        const degree = 13;
        if (regressionData.length < degree + 1) return;

        const coeffs = polynomialRegression(regressionData, degree);
        if (coeffs) {
          ctx.beginPath();
          ctx.strokeStyle = '#333333';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 4]);
          let firstPoint = true;
          for (let i = 0; i < dataLength; i++) {
            const x = getX(i, dataLength, xScale);
            let yValue = 0;
            for (let j = 0; j < coeffs.length; j++) yValue += coeffs[j] * Math.pow(i, j);
            const y = padding.top + graphHeight - (yValue * yScale);

            if (y > padding.top && y < padding.top + graphHeight) {
              if (firstPoint) { ctx.moveTo(x, y); firstPoint = false; } else { ctx.lineTo(x, y); }
            }
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });
    }

    // ★ハイライト用の縦線は、全てのグラフ描画の最後に描画する
    filteredEmotionData.forEach((dataPoint, index) => {
        if (selectedLines.has(dataPoint.lineId.toString())) {
            const lineX = getX(index, dataLength, xScale);
            ctx.beginPath();
            ctx.strokeStyle = '#00000020';
            ctx.lineWidth = 4;
            ctx.moveTo(lineX, padding.top);
            ctx.lineTo(lineX, padding.top + graphHeight);
            ctx.stroke();
        }
    });

    // しきい値の位置に横一線の点線を描画
    if (emotionThreshold > 0 && emotionThreshold < 1.1) {
      ctx.save();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = '#d3d3d3';
      ctx.lineWidth = 1;
      const thresholdY = padding.top + graphHeight - (emotionThreshold * yScale);
      ctx.beginPath();
      ctx.moveTo(padding.left, thresholdY);
      ctx.lineTo(padding.left + graphWidth, thresholdY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      ctx.fillStyle = '#d3d3d3';
      ctx.font = '11px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`しきい値 (${emotionThreshold})`, padding.left + 5, thresholdY - 5);
    }

    // --- overlayDataの描画 ---
    if (overlayData) {
      let overlayFiltered = overlayData.emotionData;
      if (overlayData.graphMode === 'by-character' && overlayData.selectedCharacter) {
        overlayFiltered = overlayData.emotionData.map(data =>
          data.character === overlayData.selectedCharacter
            ? data
            : { ...data, emotion: {} }
        );
      }
      const overlayDataLength = overlayFiltered.length;
      const overlayXScale = graphWidth / (overlayDataLength - 1 > 0 ? overlayDataLength - 1 : 1);
      const overlayYScale = graphHeight;

      // overlay用X座標計算
      const getOverlayX = (index: number, length: number, scale: number) => {
        if (overlayData.flipHorizontal) {
          return padding.left + (length - 1 - index) * scale;
        }
        return padding.left + index * scale;
      };

      const overlayEmotions = Array.from(new Set(overlayData.selectedEmotions));
      overlayEmotions.forEach(emotion => {
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.strokeStyle = getColor(emotion);
        ctx.lineWidth = 2;
        let firstPointDrawn = false;
        overlayFiltered.forEach((dataPoint, index) => {
          const x = getOverlayX(index, overlayDataLength, overlayXScale);
          const emotionValue = dataPoint.emotion && dataPoint.emotion[emotion] !== undefined
            ? dataPoint.emotion[emotion]
            : 0;
          const totalEmotionSum = dataPoint.emotion ? Object.values(dataPoint.emotion).reduce((sum, val) => sum + val, 0) : 0;
          const normalizedEmotionValue = totalEmotionSum > 0 ? emotionValue / totalEmotionSum : 0;
          let y = padding.top + graphHeight - (normalizedEmotionValue * overlayYScale);
          if (overlayData.invert) {
            y = padding.top + (normalizedEmotionValue * overlayYScale);
          }
          if (normalizedEmotionValue >= overlayData.emotionThreshold) {
            if (!firstPointDrawn) {
              ctx.moveTo(x, y);
              firstPointDrawn = true;
            } else {
              ctx.lineTo(x, y);
            }
          } else {
            firstPointDrawn = false;
          }
        });
        ctx.stroke();

        overlayFiltered.forEach((dataPoint, index) => {
          const x = getOverlayX(index, overlayDataLength, overlayXScale);
          const emotionValue = dataPoint.emotion && dataPoint.emotion[emotion] !== undefined
            ? dataPoint.emotion[emotion]
            : 0;
          const totalEmotionSum = dataPoint.emotion ? Object.values(dataPoint.emotion).reduce((sum, val) => sum + val, 0) : 0;
          const normalizedEmotionValue = totalEmotionSum > 0 ? emotionValue / totalEmotionSum : 0;
          let y = padding.top + graphHeight - (normalizedEmotionValue * overlayYScale);
          if (overlayData.invert) {
            y = padding.top + (normalizedEmotionValue * overlayYScale);
          }
          if (normalizedEmotionValue >= overlayData.emotionThreshold) {
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fillStyle = getColor(emotion);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
        ctx.restore();
      });
    }
    // --- overlayDataここまで ---

  }, [emotionData, selectedEmotions, emotionThreshold, graphMode, selectedLines, selectedCharacter, overlayData, flipHorizontal,  actDividers, draggingMarker]);

  // データまたはウィンドウサイズが変更されたときにグラフを再描画
  useEffect(() => {
    drawGraph();
    const handleResize = () => drawGraph();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawGraph]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    const padding = { left: 60 };
    const graphWidth = canvasRef.current!.getBoundingClientRect().width - padding.left - 30;

    const divider1X = padding.left + graphWidth * actDividers[0];
    const divider2X = padding.left + graphWidth * actDividers[1];
    const hitBoxSize = 8; // マーカーの当たり判定の大きさ

    if (Math.abs(pos.x - divider1X) < hitBoxSize) {
      setDraggingMarker('divider1');
    } else if (Math.abs(pos.x - divider2X) < hitBoxSize) {
      setDraggingMarker('divider2');
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingMarker === 'none') return;
    
    const pos = getMousePos(e);
    const padding = { left: 60 };
    const graphWidth = canvasRef.current!.getBoundingClientRect().width - padding.left - 30;

    let newRatio = (pos.x - padding.left) / graphWidth;
    
    // 0~1の範囲に収め、マーカー同士が追い越さないようにする
    if (draggingMarker === 'divider1') {
      newRatio = Math.max(0.01, Math.min(newRatio, actDividers[1] - 0.01));
      setActDividers([newRatio, actDividers[1]]);
    } else if (draggingMarker === 'divider2') {
      newRatio = Math.max(actDividers[0] + 0.01, Math.min(newRatio, 0.99));
      setActDividers([actDividers[0], newRatio]);
    }
  };

  const handleMouseUpOrLeave = () => {
    setDraggingMarker('none');
  };

  return (
    <div className="emotion-line-graph-container">
      <canvas 
        ref={canvasRef} 
        className="emotion-line-graph-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
      />
    </div>
  );
};

export default EmotionLineGraph;