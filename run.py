import os
import platform
import sys
import eel

#感情分析関連のモジュールをインストール
import json
import numpy as np
from transformers import AutoTokenizer, AutoModelForSequenceClassification

sys.path.insert(1, '../../')

@eel.expose
def np_softmax(x):
    f_x = np.exp(x) / np.sum(np.exp(x))
    return f_x

@eel.expose
def analyze_emotion(data_list):
    if not data_list:
        return json.dumps({})

    model_data = './src/models' # 感情を8種類に修正
    emotion_names_jp = ['喜び', '信頼', '期待', '驚き', '悲しみ', '恐れ', '嫌悪', '怒り']

    model = AutoModelForSequenceClassification.from_pretrained(model_data)
    tokenizer = AutoTokenizer.from_pretrained(model_data)
    model.eval()

    result_list = []

    for data in data_list:
        id, character, text = int(data['id']), data['character'], data['text']  # IDを整数型に変換
        if not text:
            result_list.append({'id': id, 'character':'', 'text': '', 'emotion': {}})
        else:
            tokens = tokenizer(text, truncation=True, return_tensors="pt")
            tokens.to(model.device)
            preds = model(**tokens)
            prob = np_softmax(preds.logits.cpu().detach().numpy()[0])
            emotion_result = [{emotion: float(prob) for emotion, prob in zip(emotion_names_jp, prob)}]
            result_list.append({'id': id, 'character': character, 'text': text, 'emotion': emotion_result, 'sentiment': 0})

    return json.dumps(result_list)


@eel.expose
def analyze_emotion_simple(data_list):
    if not data_list:
        return json.dumps({})

    # 修正後: resource_pathを使って絶対パスに変換
    model_data = resource_path(os.path.join('src', 'models'))
    
    # さらに、パスが本当に存在するかチェックを入れるとデバッグが捗ります
    if not os.path.exists(model_data):
        print(f"Error: Model not found at {model_data}")

    emotion_names_jp = ['喜び', '信頼', '期待', '驚き', '悲しみ', '恐れ', '嫌悪', '怒り']

    model = AutoModelForSequenceClassification.from_pretrained(model_data)
    tokenizer = AutoTokenizer.from_pretrained(model_data)
    model.eval()

    result_list = []

    for data in data_list:
        id, text = int(data['id']), data['text']  # IDを整数型に変換
        if not text:
            result_list.append({'id': id, 'text': text, 'emotion': {}})
        else:
            tokens = tokenizer(text, truncation=True, return_tensors="pt")
            tokens.to(model.device)
            preds = model(**tokens)
            prob = np_softmax(preds.logits.cpu().detach().numpy()[0])
            emotion_result = [{emotion: float(prob) for emotion, prob in zip(emotion_names_jp, prob)}]
            result_list.append({'id': id, 'text': text, 'emotion': emotion_result})

    return json.dumps(result_list)

def resource_path(relative_path):
    try:
        # PyInstallerの一時フォルダパス
        base_path = sys._MEIPASS
    except Exception:
        # 通常実行時のパス
        base_path = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_path, relative_path)

def start_eel(develop):
    if develop:
        directory = "src"
        page = {"port": 5173}
    else:
        # 【重要】resource_path関数を通してパスを取得
        directory = resource_path("dist") 
        page = "index.html"

    eel.init(directory)

    eel_kwargs = dict(
        host="localhost",
        port=8080,
        size=(1280, 800),
    )

    try:
        eel.start(page, app=None, **eel_kwargs)
    except EnvironmentError:
        # chromeが見つからないときはwin10以降のedgeを呼び出す
        if sys.platform in ["win32", "win64"] and int(platform.release()) >= 10:
            eel.start(page, mode="edge", **eel_kwargs)
        else:
            raise


if __name__ == '__main__':
    import sys

    start_eel(develop=len(sys.argv) == 2)