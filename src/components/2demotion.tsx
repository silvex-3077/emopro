import React, { useRef, useEffect } from 'react';

interface EmotionDataPoint {
  emotions: { [key: string]: number };
  text: string;
  character: string;
}

interface Props {
  emotionData: EmotionDataPoint[];
}

const emotionAngles = {
  '喜び': 0,
  '信頼': Math.PI / 4,
  '期待': Math.PI / 2,
  '驚き': (3 * Math.PI) / 4,
  '悲しみ': Math.PI,
  '恐れ': (5 * Math.PI) / 4,
  '嫌悪': (3 * Math.PI) / 2,
  '怒り': (7 * Math.PI) / 4
};

const calculatePosition = (emotions: { [key: string]: number }) => {
  let x = 0, z = 0;
  for (const [emotion, value] of Object.entries(emotions)) {
    const angle = emotionAngles[emotion as keyof typeof emotionAngles];
    x += value * Math.cos(angle);
    z += value * Math.sin(angle);
  }

  // 斜めの方向に対する座標の正規化
  const maxDistance = Math.sqrt(2); // 斜めの最大距離
  const distance = Math.sqrt(x * x + z * z);
  if (distance > maxDistance) {
    x = (x / distance) * maxDistance;
    z = (z / distance) * maxDistance;
  }

  return { x, z };
};

const PolarEmotionPlot: React.FC<Props> = ({ emotionData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const tooltip = tooltipRef.current;
    if (!canvas || !tooltip) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 解像度を設定 (高解像度用)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 500 * dpr; // 実際のピクセル数
    canvas.height = 500 * dpr;
    canvas.style.width = '500px'; // 表示サイズ
    canvas.style.height = '500px';

    ctx.scale(dpr, dpr); // スケーリング適用

    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 * 0.8;

    // スムージング設定
    ctx.imageSmoothingEnabled = true;

    ctx.clearRect(0, 0, width, height);

    // 軸線とラベルの描画
    Object.entries(emotionAngles).forEach(([emotion, angle]) => {
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = 'gray';
      ctx.stroke();

      // テキスト描画
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'black';
      ctx.fillText(emotion, x, y);
    });

    // データポイントと軌跡の描画
    ctx.beginPath();
    emotionData.forEach((dataPoint, index) => {
      const { x, z } = calculatePosition(dataPoint.emotions);
      const plotX = centerX + radius * x;
      const plotY = centerY - radius * z;

      if (index === 0) {
        ctx.moveTo(plotX, plotY);
      } else {
        ctx.lineTo(plotX, plotY);
      }

      ctx.strokeStyle = `rgba(${Math.floor(255 - (index * 255 / emotionData.length))}, ${Math.floor(index * 255 / emotionData.length)}, 150, 1)`;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(plotX, plotY, 5, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(${Math.floor(255 - (index * 255 / emotionData.length))}, ${Math.floor(index * 255 / emotionData.length)}, 150, 1)`;
      ctx.fill();
    });

    // マウスイベントの設定
    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      let found = false;
      emotionData.forEach((dataPoint, index) => {
        const { x, z } = calculatePosition(dataPoint.emotions);
        const plotX = centerX + radius * x;
        const plotY = centerY - radius * z;

        if (Math.sqrt((mouseX - plotX) ** 2 + (mouseY - plotY) ** 2) < 5) {
          tooltip.style.display = 'block';
          tooltip.style.left = `${event.clientX + 10}px`;
          tooltip.style.top = `${event.clientY + 10}px`;
          tooltip.innerHTML = `${index + 1}. ${dataPoint.character}: ${dataPoint.text}<br>${Object.entries(dataPoint.emotions).map(([k, v]) => `${k}: ${v.toFixed(2)}`).join('<br>')}`;
          found = true;
        }
      });

      if (!found) {
        tooltip.style.display = 'none';
      }
    });

    canvas.addEventListener('mouseout', () => {
      tooltip.style.display = 'none';
    });
  }, [emotionData]);

  return (
    <div style={{ backgroundColor: 'white' }}>
      <canvas ref={canvasRef} width={500} height={500}></canvas>
      <div ref={tooltipRef} style={{ position: 'absolute', backgroundColor: 'white', border: '1px solid black', padding: '5px', display: 'none' }}></div>
    </div>
  );
};

export default PolarEmotionPlot;
