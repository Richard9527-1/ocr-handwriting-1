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
# 你的密钥
# ============================================
API_KEY = "N1DvWG01pY3suaUWdXh4eroA"
SECRET_KEY = "cpp10Ch1oo5aYBEN3ilP5uRdrgWRjfeP"
# ============================================

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

@app.route('/')
def index():
    """返回前端页面"""
    return send_from_directory('.', 'index.html')

@app.route('/health', methods=['GET'])
def health():
    """健康检查"""
    return jsonify({'status': 'ok'})

@app.route('/ocr', methods=['POST'])
def ocr_handwriting():
    """手写识别接口"""
    print("\n" + "=" * 60)
    print("📨 收到识别请求")
    print("=" * 60)
    
    if 'image' not in request.files:
        return jsonify({'code': -1, 'msg': '请上传图片'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'code': -1, 'msg': '请选择图片'}), 400
    
    try:
        img_data = file.read()
        img_base64 = base64.b64encode(img_data).decode('utf-8')
        print(f"📸 图片大小: {len(img_data) / 1024:.1f} KB")
    except Exception as e:
        return jsonify({'code': -1, 'msg': f'图片读取失败: {str(e)}'}), 400
    
    token = get_access_token()
    if not token:
        return jsonify({'code': -1, 'msg': '获取API凭证失败'}), 500
    
    # ==========================================
    # 使用普通手写识别接口
    # ==========================================
    print("🔍 使用普通手写识别接口...")
    
    normal_url = f"https://aip.baidubce.com/rest/2.0/ocr/v1/handwriting?access_token={token}"
    
    normal_headers = {'Content-Type': 'application/x-www-form-urlencoded'}
    normal_data = {
        'image': img_base64,
        'recognize_granularity': 'big',
        'language_type': 'CHN_ENG'
    }
    
    try:
        normal_resp = requests.post(
            normal_url,
            headers=normal_headers,
            data=normal_data,
            timeout=15
        )
        
        print(f"📡 普通接口响应状态: {normal_resp.status_code}")
        
        normal_result = normal_resp.json()
        
        if normal_result.get('error_code') == 0 or 'words_result' in normal_result:
            words = [item.get('words', '') for item in normal_result.get('words_result', [])]
            full_text = '\n'.join(words) if words else '(未识别到文字)'
            if full_text and full_text != '(未识别到文字)':
                print(f"✅ 普通接口识别成功，共 {len(words)} 行")
                return jsonify({
                    'code': 0,
                    'msg': 'success',
                    'result': full_text
                })
    except Exception as e:
        print(f"⚠️ 普通接口异常: {e}")
    
    # ==========================================
    # 备选：手写作文识别
    # ==========================================
    print("🔍 使用手写作文识别接口...")
    
    submit_url = f"https://aip.baidubce.com/rest/2.0/ocr/v1/handwriting_composition/create_task?access_token={token}"
    
    payload = {
        "image": img_base64,
        "recognize_granularity": "line"
    }
    
    headers = {'Content-Type': 'application/json'}
    
    try:
        print("📤 提交任务...")
        
        submit_resp = requests.post(
            submit_url, 
            headers=headers, 
            json=payload,
            timeout=15
        )
        
        submit_result = submit_resp.json()
        print(f"📡 提交响应: {json.dumps(submit_result, ensure_ascii=False)[:200]}")
        
        if submit_result.get('error_code'):
            return jsonify({
                'code': submit_result.get('error_code'),
                'msg': f'提交失败: {submit_result.get("error_msg", "未知错误")}'
            }), 500
        
        # 获取 task_id
        task_id = None
        result_obj = submit_result.get('result', {})
        if isinstance(result_obj, dict):
            task_id = result_obj.get('task_id')
        if not task_id:
            task_id = submit_result.get('data', {}).get('task_id')
        if not task_id:
            task_id = submit_result.get('task_id')
        
        if task_id:
            task_id = str(task_id)
        
        if not task_id:
            return jsonify({
                'code': -1, 
                'msg': f'未获取到任务ID'
            }), 500
        
        print(f"📝 任务ID: {task_id}")
        
        result_url = f"https://aip.baidubce.com/rest/2.0/ocr/v1/handwriting_composition/get_result?access_token={token}"
        
        max_retry = 25
        for i in range(max_retry):
            print(f"\n--- 第 {i+1}/{max_retry} 次轮询 ---")
            time.sleep(1.5)
            
            result_resp = requests.post(
                result_url,
                headers={'Content-Type': 'application/json'},
                json={"task_id": task_id},
                timeout=10
            )
            
            result = result_resp.json()
            print(f"📡 响应状态: {result.get('status')}")
            
            if result.get('error_code'):
                print(f"⚠️ 错误码: {result.get('error_code')}")
                continue
            
            # 提取文字 - 路径1: result.result.essayOverall.contentText
            extracted_text = None
            try:
                essay_overall = result.get('result', {}).get('result', {}).get('essayOverall', {})
                content_text = essay_overall.get('contentText', '')
                if content_text:
                    extracted_text = content_text
                    print(f"✅ 从 essayOverall.contentText 提取成功")
            except:
                pass
            
            # 路径2: result.result.contentText
            if not extracted_text:
                try:
                    content_text = result.get('result', {}).get('result', {}).get('contentText', '')
                    if content_text:
                        extracted_text = content_text
                        print(f"✅ 从 result.result.contentText 提取成功")
                except:
                    pass
            
            # 路径3: result.result.words_result
            if not extracted_text:
                try:
                    words_list = result.get('result', {}).get('result', {}).get('words_result', [])
                    if words_list and len(words_list) > 0:
                        all_text = []
                        for item in words_list:
                            if isinstance(item, dict):
                                all_text.append(item.get('words', item.get('word', item.get('text', ''))))
                            elif isinstance(item, str):
                                all_text.append(item)
                        extracted_text = '\n'.join([t for t in all_text if t])
                        print(f"✅ 从 result.result.words_result 提取成功")
                except:
                    pass
            
            if extracted_text and len(extracted_text.strip()) > 0:
                print(f"📝 识别结果长度: {len(extracted_text)} 字符")
                return jsonify({
                    'code': 0,
                    'msg': 'success',
                    'result': extracted_text
                })
            
            status = result.get('status')
            if status is None:
                status = result.get('result', {}).get('status')
            
            print(f"📊 状态: {status}")
            
            if status == "Success" or status == 0:
                print("⏳ 状态为Success但文字还未生成，继续等待...")
                continue
            elif status == 1 or status == "Processing":
                print("⏳ 识别进行中...")
                continue
            elif status == 3 or status == "Queued":
                print("⏳ 排队中...")
                continue
            elif status == 2 or status == "Failed":
                error_msg = result.get('error_msg', '识别失败')
                return jsonify({
                    'code': -1,
                    'msg': f'识别失败: {error_msg}'
                }), 500
            else:
                continue
        
        return jsonify({
            'code': -1,
            'msg': '识别超时，请稍后重试'
        }), 500
        
    except Exception as e:
        print(f"❌ 异常: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'code': -1, 'msg': f'识别异常: {str(e)}'}), 500

# 在 app.py 最后，替换原来的 app.run(...) 为：
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)