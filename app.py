from cohere import Client
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS, cross_origin
import requests
from clarifai.client.model import Model
import os
import asyncio
import mimetypes
import logging
from werkzeug.exceptions import RequestEntityTooLarge
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set proper MIME type for manifest files
mimetypes.add_type('application/manifest+json', '.webmanifest')

# Allowed image file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


app = Flask(__name__)
# Giới hạn kích thước upload 10MB (tránh ảnh điện thoại quá lớn gây lỗi)
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024

# Add security headers to all responses
@app.after_request
def add_security_headers(response):
    if not response.headers.get('Content-Type'):
        response.headers['Content-Type'] = 'application/json; charset=utf-8'
    if not response.headers.get('Cache-Control'):
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Content-Security-Policy'] = "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; frame-ancestors 'none'"
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    # Remove deprecated headers
    response.headers.pop('X-XSS-Protection', None)
    response.headers.pop('Expires', None)
    response.headers.pop('X-Frame-Options', None)
    return response

# Cấu hình CORS theo ENV (mặc định cho localhost)
ALLOWED_ORIGINS = os.environ.get(
    'ALLOWED_ORIGINS',
    'http://localhost:5500,http://127.0.0.1:5500,http://localhost:5000,http://127.0.0.1:5000,https://foodninja-ai.netlify.app,https://foodninja-app.netlify.app'
).split(',')
# Hỗ trợ wildcard qua ENV: đặt ALLOWED_ORIGINS="*" để cho phép mọi origin (chỉ nên dùng tạm thời khi debug)
_wildcard = any(o.strip() == '*' for o in ALLOWED_ORIGINS)
ORIGINS_FOR_CORS = '*' if _wildcard else ALLOWED_ORIGINS
# Khi dùng wildcard, KHÔNG bật credentials để tránh xung đột trình duyệt
CORS(
    app,
    resources={r"/*": {"origins": ORIGINS_FOR_CORS}},
    supports_credentials=False if _wildcard else True,
    methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=86400,
)

# Lấy API keys từ ENV (không hardcode)
COHERE_API_KEY = os.environ.get('COHERE_API_KEY', '')
PAT = os.environ.get('CLARIFAI_PAT', '')  # Clarifai PAT
CALORIE_API_KEY = os.environ.get('CALORIE_API_KEY', '')
# Ngưỡng tin cậy cho nhận diện (mặc định 0.4 = 40%)
try:
    MIN_CONFIDENCE = float(os.environ.get('MIN_CONFIDENCE', '0.4'))
except Exception:
    MIN_CONFIDENCE = 0.4

# Serve static files with proper cache headers
@app.route('/<path:filename>')
def serve_static(filename):
    try:
        if filename.endswith('.webmanifest'):
            response = send_file(filename, mimetype='application/manifest+json')
            response.headers['Content-Type'] = 'application/manifest+json; charset=utf-8'
            response.headers['Cache-Control'] = 'public, max-age=86400'
        elif filename.endswith(('.js', '.css', '.svg', '.png', '.jpg', '.jpeg')):
            response = send_file(filename)
            response.headers['Cache-Control'] = 'public, max-age=86400'
        else:
            response = send_file(filename)
            response.headers['Cache-Control'] = 'public, max-age=3600'
        
        response.headers['X-Content-Type-Options'] = 'nosniff'
        return response
    except FileNotFoundError:
        return jsonify({'error': 'File not found'}), 404

# Serve manifest with correct content-type
@app.route('/manifest.webmanifest', methods=['GET'])
def manifest():
    try:
        response = send_file('manifest.webmanifest', mimetype='application/manifest+json')
        response.headers['Content-Type'] = 'application/manifest+json; charset=utf-8'
        response.headers['Cache-Control'] = 'public, max-age=86400'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        return response
    except FileNotFoundError:
        return jsonify({'error': 'Manifest not found'}), 404

# Health check / root endpoint (tránh 404 khi truy cập URL gốc trên Render)
@app.route('/', methods=['GET'])
def root():
    response = jsonify({
        'status': 'ok',
        'service': 'Nutrition Food API',
        'endpoints': ['/predict (POST)', '/chat (POST)', '/ask_ai (POST)']
    })
    response.headers['Content-Type'] = 'application/json; charset=utf-8'
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Content-Security-Policy'] = "default-src 'self'; frame-ancestors 'none'"
    return response, 200

# Health check endpoint for Render
@app.route('/health', methods=['GET'])
def health_check():
    response = jsonify({
        'status': 'healthy',
        'service': 'Food Ninja Backend',
        'version': '2.0'
    })
    response.headers['Content-Type'] = 'application/json; charset=utf-8'
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    return response

@app.route('/ask_ai', methods=['POST'])
@cross_origin(origins=ORIGINS_FOR_CORS)
def ask_ai():
    data = request.get_json()
    prompt = data.get('prompt', '')
    if not prompt:
        return jsonify({'error': 'No prompt provided'}), 400
    try:
        if not COHERE_API_KEY:
            return jsonify({'error': 'Missing COHERE_API_KEY'}), 500
        print(f"[ASK_AI] Prompt gửi lên Cohere: {prompt}: Trả lời ngắn gọn, súc tích, hướng tới người tiêu dùng và sức khỏe.")
        client = Client(api_key=COHERE_API_KEY)
        ai_answer = ""
        try:
            response = client.chat(
                model="command-a-03-2025",
                message=prompt,
                temperature=0.3
            )
            # Ưu tiên lấy từ response.text; fallback sang cấu trúc cũ nếu có
            ai_answer = getattr(response, 'text', None) or (
                response.message.content[0].text if getattr(response, 'message', None) and getattr(response.message, 'content', None) else ""
            )
            print(f"[ASK_AI] Cohere trả về: {ai_answer}")
            if not ai_answer or not str(ai_answer).strip():
                ai_answer = "[AI Warning] Cohere không trả về nội dung. Hãy kiểm tra lại prompt hoặc quota API."
        except Exception as e:
            ai_answer = f"[AI Error] {str(e)}"
            print(f"[ASK_AI] Lỗi Cohere: {ai_answer}")
        return jsonify({'result': ai_answer})
    except Exception as e:
        print(f"[ASK_AI] Lỗi tổng: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Clarifai & CalorieNinjas config
MODEL_URL = "https://clarifai.com/clarifai/main/models/food-item-recognition"

@app.route('/predict', methods=['POST'])
@cross_origin(origins=ORIGINS_FOR_CORS)
def predict():
    try:
        asyncio.set_event_loop(asyncio.new_event_loop())
    except Exception:
        pass
    
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
    
    if not PAT:
        return jsonify({'error': 'Missing CLARIFAI_PAT'}), 500
    
    image = request.files['image']
    
    # Validate file
    if image.filename == '':
        return jsonify({'error': 'No image selected'}), 400
    
    if not allowed_file(image.filename):
        return jsonify({'error': 'Invalid file type. Please upload PNG, JPG, JPEG, GIF, BMP, or WEBP files only.'}), 400
    
    image_bytes = image.read()
    
    # Check if image is not empty
    if len(image_bytes) == 0:
        return jsonify({'error': 'Empty image file'}), 400
    try:
        model_prediction = Model(url=MODEL_URL, pat=PAT).predict_by_bytes(
            input_bytes=image_bytes,
            input_type="image"
        )
        concepts = model_prediction.outputs[0].data.concepts
        if not concepts:
            return jsonify({'error': 'No food detected'}), 200
        # Lấy best prediction
        food_name = concepts[0].name
        probability = float(concepts[0].value)

        # Nếu độ tin cậy < ngưỡng, trả báo cáo hướng dẫn người dùng
        if probability < MIN_CONFIDENCE:
            # Lấy top-3 gợi ý để người dùng tham khảo
            top_alternatives = []
            for c in concepts[:3]:
                try:
                    top_alternatives.append({
                        'name': c.name,
                        'probability': float(c.value)
                    })
                except Exception:
                    # Bỏ qua mục lỗi định dạng
                    pass

            user_message = (
                f"Nhận diện có độ tin cậy thấp ({probability:.0%} < {MIN_CONFIDENCE:.0%}).\n"
                "Gợi ý để cải thiện kết quả: \n"
                "- Chụp gần hơn, đủ sáng, hạn chế bóng đổ.\n"
                "- Đặt món ăn trên nền đơn giản, không bị che khuất.\n"
                "- Chỉ để 1 món chính trong khung hình (tránh nhiều món trộn).\n"
                "Bạn có thể chọn một trong các gợi ý bên dưới hoặc nhập tên món vào chatbot để tra cứu dinh dưỡng."
            )

            response_data = {
                'low_confidence': True,
                'min_confidence': MIN_CONFIDENCE,
                'food_name': food_name,
                'probability': probability,
                'alternatives': top_alternatives,
                'message': user_message,
                'nutrition': None,
                'ai_answer': (
                    "Hệ thống chưa đủ chắc chắn để đưa ra tư vấn dinh dưỡng. "
                    "Hãy thử chụp lại ảnh rõ hơn hoặc nhập tên món ăn để tôi hỗ trợ."
                )
            }
            response = jsonify(response_data)
            response.headers['Content-Type'] = 'application/json; charset=utf-8'
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['X-Content-Type-Options'] = 'nosniff'
            return response, 200
        # Call CalorieNinjas with timeout
        nutrition = None
        if CALORIE_API_KEY:
            try:
                api_url = f'https://api.calorieninjas.com/v1/nutrition?query={food_name}'
                headers = {'X-Api-Key': CALORIE_API_KEY}
                response = requests.get(api_url, headers=headers, timeout=10)
                if response.status_code == requests.codes.ok:
                    nutrition = response.json()
                else:
                    logger.warning(f"CalorieNinjas API returned status {response.status_code}")
            except requests.exceptions.Timeout:
                logger.error("CalorieNinjas API timeout")
            except requests.exceptions.RequestException as e:
                logger.error(f"CalorieNinjas API error: {str(e)}")
        else:
            logger.warning('Missing CALORIE_API_KEY, skipping nutrition lookup')

        # In nutrition để debug
        import json
        logger.info(f"Nutrition data received: {nutrition}")
        nutrition_str = json.dumps(nutrition, ensure_ascii=False)
        prompt = (
            f"Hãy phân tích món ăn '{food_name}' với thông tin dinh dưỡng sau: {nutrition_str}. "
            f"Đưa ra nhận xét về lợi ích, rủi ro sức khỏe (nếu có) và gợi ý ăn uống lành mạnh. "
            f"(Phân tích ngắn gọn dễ hiểu, hướng tới người tiêu dùng)"
            f"Trả lời ngắn gọn súc tích, khoa học."
        )
        logger.info(f"Sending prompt to Cohere: {prompt}")
        ai_answer = ""
        if not COHERE_API_KEY:
            ai_answer = "[AI Warning] Thiếu COHERE_API_KEY nên không thể gọi AI."
        else:
            try:
                client = Client(api_key=COHERE_API_KEY)
                response = client.chat(
                    model="command-a-03-2025",
                    message=prompt,
                    temperature=0.3
                )
                ai_answer = getattr(response, 'text', None) or (
                    response.message.content[0].text if getattr(response, 'message', None) and getattr(response.message, 'content', None) else ""
                )
                logger.info(f"Cohere response received: {ai_answer}")
                if not ai_answer or not str(ai_answer).strip():
                    ai_answer = "[AI Warning] Cohere không trả về nội dung. Hãy kiểm tra lại prompt hoặc quota API."
            except Exception as e:
                ai_answer = f"[AI Error] {str(e)}"
                logger.error(f"Cohere API error: {ai_answer}")

        response_data = {
            'food_name': food_name,
            'probability': probability,
            'nutrition': nutrition,
            'ai_answer': ai_answer,
            'low_confidence': False,
            'min_confidence': MIN_CONFIDENCE
        }
        response = jsonify(response_data)
        response.headers['Content-Type'] = 'application/json; charset=utf-8'
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        return response
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return jsonify({'error': 'Internal server error during prediction'}), 500

@app.route('/chat', methods=['POST', 'OPTIONS'])
@cross_origin(origins=ORIGINS_FOR_CORS)  # Chỉ cho phép các origin cấu hình
def chat():
    # Trả nhanh cho preflight
    if request.method == 'OPTIONS':
        return ('', 204)
    data = request.get_json()
    user_message = data.get('message', '')
    if not user_message:
        return jsonify({'error': 'No message provided'}), 400
    try:
        if not COHERE_API_KEY:
            return jsonify({'error': 'Missing COHERE_API_KEY'}), 500
        client = Client(api_key=COHERE_API_KEY)
        response = client.chat(
            model="command-a-03-2025",
            message=user_message,
            temperature=0.3
        )
        ai_answer = getattr(response, 'text', None) or (
            response.message.content[0].text if getattr(response, 'message', None) and getattr(response.message, 'content', None) else ""
        )
        if not ai_answer.strip():
            ai_answer = "[AI Warning] Cohere không trả về nội dung. Hãy kiểm tra lại prompt hoặc quota API."
        return jsonify({"response": ai_answer})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Xử lý lỗi file quá lớn (413) để trả JSON rõ ràng
from werkzeug.exceptions import RequestEntityTooLarge

@app.errorhandler(413)
def handle_large_file(e: RequestEntityTooLarge):
    return jsonify({'error': 'File quá lớn, tối đa 10MB'}), 413

# Main entry point
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    print(f"[INFO] Starting Food Ninja Backend on port {port}, debug={debug_mode}")
    app.run(host='0.0.0.0', port=port, debug=debug_mode)
