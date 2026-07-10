from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import base64
import json
import time
import os

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# ============================================
# 你的百度云密钥（使用环境变量）
# ============================================
API_KEY = os.environ.get('API_KEY', "N1DvWG01pY3suaUWdXh4eroA")
SECRET_KEY = os.environ.get('SECRET_KEY', "gmNkleGlrRKHu5kzbfj6oJc2dWI6lmBN")

def get_access_token():
    """获取百度API的access_token"""
    url = f"https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id={API_KEY}&client_secret={SECRET_KEY}"
    
    try:
        resp = requests.get(url, timeout=10)
        data = resp.json()
        
        if 'error' in data:
            print(f"❌ Token错误: {data}")
            return None
        
        token = data.get('access_token')
        if token:
            print(f"✅ Token获取成功")
            return token
        else:
            print("❌ 无access_token")
            return None
            
    except Exception as e:
        print(f"❌ Token异常: {e}")
        return None

def ocr_handwriting_image(image_data):
    """识别手写图片，返回文字"""
    token = get_access_token()
    if not token:
        return None, "获取API凭证失败"
    
    img_base64 = base64.b64encode(image_data).decode('utf-8')
    
    # 普通手写识别接口
    normal_url = f"https://aip.baidubce.com/rest/2.0/ocr/v1/handwriting?access_token={token}"
    normal_headers = {'Content-Type': 'application/x-www-form-urlencoded'}
    normal_data = {
        'image': img_base64,
        'recognize_granularity': 'big',
        'language_type': 'CHN_ENG'
    }
    
    try:
        normal_resp = requests.post(normal_url, headers=normal_headers, data=normal_data, timeout=15)
        normal_result = normal_resp.json()
        
        if normal_result.get('error_code') == 0 or 'words_result' in normal_result:
            words = [item.get('words', '') for item in normal_result.get('words_result', [])]
            full_text = '\n'.join(words) if words else ''
            if full_text:
                return full_text, None
    except Exception as e:
        print(f"⚠️ 普通接口异常: {e}")
    
    # 备选：手写作文识别
    submit_url = f"https://aip.baidubce.com/rest/2.0/ocr/v1/handwriting_composition/create_task?access_token={token}"
    payload = {"image": img_base64, "recognize_granularity": "line"}
    headers = {'Content-Type': 'application/json'}
    
    try:
        submit_resp = requests.post(submit_url, headers=headers, json=payload, timeout=15)
        submit_result = submit_resp.json()
        
        if submit_result.get('error_code'):
            return None, f"提交失败: {submit_result.get('error_msg', '未知错误')}"
        
        task_id = submit_result.get('result', {}).get('task_id')
        if not task_id:
            task_id = submit_result.get('data', {}).get('task_id')
        if not task_id:
            task_id = submit_result.get('task_id')
        
        if not task_id:
            return None, "未获取到任务ID"
        
        result_url = f"https://aip.baidubce.com/rest/2.0/ocr/v1/handwriting_composition/get_result?access_token={token}"
        
        for i in range(25):
            time.sleep(1.5)
            result_resp = requests.post(
                result_url,
                headers={'Content-Type': 'application/json'},
                json={"task_id": str(task_id)},
                timeout=10
            )
            result = result_resp.json()
            
            if result.get('error_code'):
                continue
            
            essay_overall = result.get('result', {}).get('result', {}).get('essayOverall', {})
            content_text = essay_overall.get('contentText', '')
            if content_text:
                return content_text, None
            
            content_text = result.get('result', {}).get('result', {}).get('contentText', '')
            if content_text:
                return content_text, None
            
            status = result.get('status')
            if status == "Success" or status == 0:
                continue
            elif status == 2 or status == "Failed":
                return None, "识别失败"
        
        return None, "识别超时"
    except Exception as e:
        return None, f"识别异常: {str(e)}"

# ============================================
# 评分逻辑（60分制）
# ============================================

def calculate_scores(text):
    """智能评分（60分制）"""
    base_score = 30  # 基础分（及格线）
    
    char_count = len(text.replace('\n', '').replace(' ', ''))
    
    # 字数加分（最多 +12 分）
    if char_count > 800:
        base_score += 12
    elif char_count > 500:
        base_score += 8
    elif char_count > 300:
        base_score += 4
    
    # 段落结构加分（最多 +5 分）
    paragraphs = text.split('\n')
    para_count = len([p for p in paragraphs if len(p.strip()) > 10])
    if para_count >= 4:
        base_score += 5
    elif para_count >= 3:
        base_score += 3
    
    # 标点多样性加分（最多 +4 分）
    punctuation_marks = ['。', '，', '、', '；', '：', '！', '？']
    punc_count = sum(text.count(m) for m in punctuation_marks)
    if punc_count > 15:
        base_score += 4
    elif punc_count > 8:
        base_score += 2
    
    # 深度词汇加分（最多 +8 分）
    deep_words = ['思考', '感悟', '理解', '认识', '体会', '反思', '启示', '意义', '价值']
    deep_count = sum(text.count(w) for w in deep_words)
    if deep_count > 5:
        base_score += 8
    elif deep_count > 3:
        base_score += 4
    
    # 限制在 20-60 分之间
    return min(max(base_score, 20), 60)

def generate_comments(text, score):
    """生成评语（60分制）"""
    char_count = len(text.replace('\n', '').replace(' ', ''))
    paragraphs = text.split('\n')
    para_count = len([p for p in paragraphs if len(p.strip()) > 10])
    
    comments = []
    
    # 总体评价（60分制）
    if score >= 52:
        comments.append("🌟 这是一篇非常优秀的作文！")
    elif score >= 44:
        comments.append("👍 这是一篇优秀的作文，展现了你扎实的写作功底。")
    elif score >= 36:
        comments.append("📝 这是一篇不错的作文，有进一步提升的空间。")
    elif score >= 28:
        comments.append("✏️ 这篇作文基本完成了写作任务，但还有不少需要改进的地方。")
    else:
        comments.append("📚 这篇作文还需要更多的练习和积累，继续加油！")
    
    if char_count > 500:
        comments.append("✅ 文章篇幅适中，内容较为充实。")
    elif char_count > 300:
        comments.append("✅ 文章内容基本完整，可以进一步丰富细节。")
    else:
        comments.append("📌 文章内容偏短，建议适当增加论述和描写。")
    
    if para_count >= 4:
        comments.append("✅ 文章结构清晰，层次分明。")
    elif para_count >= 3:
        comments.append("✅ 文章结构基本合理，可以进一步优化段落划分。")
    else:
        comments.append("📌 文章段落较少，建议合理分段。")
    
    punctuation_marks = ['。', '，', '、', '；', '：', '！', '？']
    punc_count = sum(text.count(m) for m in punctuation_marks)
    if punc_count > 12:
        comments.append("✅ 语言表达流畅，标点使用规范。")
    elif punc_count > 6:
        comments.append("✅ 语言表达基本通顺，建议丰富标点使用。")
    else:
        comments.append("📌 注意使用丰富的标点符号。")
    
    if score < 30:
        comments.append("💡 建议：多阅读优秀范文，积累素材，加强日常写作练习。")
    elif score < 44:
        comments.append("💡 建议：在文章深度和语言表达上继续打磨。")
    else:
        comments.append("🎯 建议：保持写作热情，尝试更多样化的写作风格。")
    
    return '\n'.join(comments)

# ============================================
# 路由
# ============================================

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/css/<path:path>')
def serve_css(path):
    return send_from_directory('css', path)

@app.route('/js/<path:path>')
def serve_js(path):
    return send_from_directory('js', path)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

@app.route('/api/ocr', methods=['POST'])
def ocr_endpoint():
    if 'image' not in request.files:
        return jsonify({'code': -1, 'msg': '请上传图片'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'code': -1, 'msg': '请选择图片'}), 400
    
    try:
        img_data = file.read()
        text, error = ocr_handwriting_image(img_data)
        
        if error:
            return jsonify({'code': -1, 'msg': error}), 500
        
        if text:
            score = calculate_scores(text)
            comments = generate_comments(text, score)
            
            return jsonify({
                'code': 0,
                'msg': 'success',
                'data': {
                    'text': text,
                    'score': score,
                    'comments': comments,
                    'char_count': len(text.replace('\n', '').replace(' ', ''))
                }
            })
        else:
            return jsonify({'code': -1, 'msg': '未识别到文字'}), 500
            
    except Exception as e:
        return jsonify({'code': -1, 'msg': f'处理异常: {str(e)}'}), 500

@app.route('/api/grading/auto', methods=['POST'])
def auto_grading():
    data = request.get_json()
    text = data.get('text', '')
    
    if not text:
        return jsonify({'code': -1, 'msg': '请提供作文内容'}), 400
    
    score = calculate_scores(text)
    comments = generate_comments(text, score)
    
    char_count = len(text.replace('\n', '').replace(' ', ''))
    paragraphs = text.split('\n')
    para_count = len([p for p in paragraphs if len(p.strip()) > 10])
    
    # 60分制维度评分
    dimensions = {
        'content': {
            'score': min(24, int(18 + char_count / 80)), 
            'comment': '内容充实' if char_count > 300 else '内容有待丰富'
        },
        'structure': {
            'score': min(15, int(9 + para_count * 2)), 
            'comment': '结构清晰' if para_count >= 4 else '结构有待优化'
        },
        'language': {
            'score': min(15, int(9 + len(text) / 120)), 
            'comment': '语言流畅' if len(text) > 300 else '语言有待提升'
        },
        'creativity': {
            'score': min(6, int(3 + len([w for w in ['思考', '感悟', '理解'] if w in text]) * 1.5)), 
            'comment': '有一定创意' if '感悟' in text else '可增加思考深度'
        }
    }
    
    return jsonify({
        'code': 0,
        'msg': 'success',
        'data': {
            'score': score,
            'comments': comments,
            'dimensions': dimensions,
            'summary': f'总字数{char_count}字，共{para_count}段'
        }
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print("\n" + "=" * 60)
    print("📝 作文批改系统启动（60分制）")
    print("🌐 http://127.0.0.1:5000")
    print("=" * 60 + "\n")
    app.run(debug=True, host='0.0.0.0', port=port)