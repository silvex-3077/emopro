# emopro

![gif](https://github.com/silvex-3077/emopro/blob/main/images/emopro.gif)

## OverView

登場人物それぞれの感情を時系列的に可視化することで、

- 伝えたいニュアンスに合わせた感情表現の強弱のつけ方を試行錯誤する
- 登場人物同士のセリフから見えない相関関係を明らかにする

ことを目的としたプロジェクト

## Requirement

### Python 仮想環境構築

プロジェクトのルートディレクトリで実行してください。
```
cd -
python -m venv emopro
cd emopro
pip install -r requirements.txt
```
フロントエンドの準備
```
npm install
```

### 開発時の起動方法

フロントエンド（React）
```
npm run dev
```

バックエンド（Python / Eel）※仮想環境を有効にした状態で行う
```
python run.py true
```

### exe ファイルへのビルド

React のビルド
```
npm run build
```
PyInstallerによる .exe ファイルの作成
```
python -m eel run.py dist --onefile --name emopro --add-data "src/models;src/models" --add-data "Lib/site-packages/unidic_lite;unidic_lite"
```

## Usage

テキストエディター部分に以下2つの形式どちらかでテキストを入力することによって感情分析を行うことができる

- `ト書き`
- `キャラクター名「セリフ」`

表示されたグラフにおける、それぞれの色に対応する感情は以下の画像の通り
![png](https://github.com/silvex-3077/emopro/blob/main/images/graph.png)

※ 不具合のため、入力時に正しく結果が反映されないことがあります
