# ==============================================================================
# PawEmotion AI - 백엔드 API (Python Serverless Function)
# ==============================================================================

# [파이썬 기본 내장 라이브러리 가져오기]
# json: 데이터를 주고받을 때 표준으로 사용하는 JSON 형식(텍스트)을 파이썬 객체(딕셔너리, 리스트 등)로 바꾸거나 반대로 변환하는 도구입니다.
import json
# os: 컴퓨터 시스템의 환경 변수(비밀 API 키 등)를 읽거나, 컴퓨터 내부의 파일 경로를 안전하게 다룰 때 사용합니다.
import os
# re: 텍스트 안에서 특정한 패턴(예: 이메일 형식, 특정 문자열 시작/끝)을 규칙적으로 찾거나 지울 때 쓰는 '정규표현식' 도구입니다.
import re
# BaseHTTPRequestHandler: 웹 서버가 브라우저(클라이언트)로부터 받는 요청(Request)과 돌려주는 응답(Response)을 처리해주는 핵심 클래스입니다.
from http.server import BaseHTTPRequestHandler

# [외부 라이브러리 안전하게 가져오기]
# OpenAI SDK가 현재 가상환경에 설치되어 있지 않을 수도 있으므로, import 에러가 나더라도 전체 서버가 강제 종료되지 않고
# 에러를 감지(try-except)하여 설치 안 됨(None) 상태로 처리할 수 있도록 작성한 예외 안전 장치(Lazy Loading)입니다.
try:
    from openai import OpenAI  # type: ignore
except ImportError:
    OpenAI = None

# [서비스 운영에 사용되는 전역 상수 및 설정 변수 정의]
# JSON_CONTENT_TYPE: 서버가 응답할 때 "이 데이터는 JSON 포맷이며 한글이 들어간 UTF-8 형식이다"라고 브라우저에 알려주는 꼬리표(Header) 정보입니다.
JSON_CONTENT_TYPE = 'application/json; charset=utf-8'
# TEXT_PLAIN_CONTENT_TYPE: "이 데이터는 일반 단순 텍스트이다"라고 알려주는 포맷입니다.
TEXT_PLAIN_CONTENT_TYPE = 'text/plain; charset=utf-8'
# HTML_CONTENT_TYPE: "이 데이터는 웹 화면을 그리는 HTML 문서이다"라고 알려주는 포맷입니다.
HTML_CONTENT_TYPE = 'text/html; charset=utf-8'

# 강아지의 몸 전체 신체 언어 특징을 구별하기 위한 행동 카테고리 꼬리표 정의
CUE_EYE = '눈'
CUE_EAR = '귀'
CUE_MOUTH = '입 및 혀'
CUE_BODY = '몸 및 자세'

# [웹 서버 요청 핸들러 클래스 선언]
# BaseHTTPRequestHandler를 상속받아 브라우저가 보내는 다양한 웹 요청(GET, POST 등)에 반응하는 핸들러를 정의합니다.
class handler(BaseHTTPRequestHandler):
    
    # --------------------------------------------------------------------------
    # CORS (Cross-Origin Resource Sharing) 보안 및 허용 설정 메서드
    # --------------------------------------------------------------------------
    # 브라우저는 기본적으로 보안상 다른 도메인(주소)의 서버로 데이터를 몰래 보내거나 가져오는 것을 막습니다.
    # 이를 허용하고 보안을 강화하기 위해 허가할 도메인을 지정하는 역할을 합니다.
    def _send_cors_headers(self):
        # 요청을 보낸 웹사이트의 원본 주소(Origin)를 확인합니다.
        origin = self.headers.get('Origin', '')
        is_allowed = False
        if origin:
            # 1) 로컬 개발 주소(localhost, 127.0.0.1)이거나 2) Vercel 호스팅 도메인(.vercel.app)인 경우에만 통신을 허가합니다.
            if origin.startswith(('http://localhost:', 'http://127.0.0.1:')) or origin.endswith('.vercel.app') or 'vercel.app' in origin:
                is_allowed = True

        if is_allowed:
            # 허용된 주소일 경우 해당 Origin 주소 그대로 허용 헤더를 추가합니다.
            self.send_header('Access-Control-Allow-Origin', origin)
        else:
            # 허용되지 않은 주소인 경우, 다른 악성 모방 사이트의 도용을 막기 위해 본래 서비스 공식 배포 주소로 고정해버립니다.
            self.send_header('Access-Control-Allow-Origin', 'https://hj202608m3-1-mtbbcbty8-haru2014s-projects.vercel.app')

        # GET(조회), POST(생성/분석), OPTIONS(보안사전검사) 메서드 전송을 허용한다고 헤더에 명시합니다.
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        # 클라이언트가 보낼 수 있는 데이터 타입(Content-Type)과 로그인 인증용(Authorization) 헤더도 허가합니다.
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    # --------------------------------------------------------------------------
    # OPTIONS 메서드 요청 처리 (사전 보안 검사)
    # --------------------------------------------------------------------------
    # 브라우저가 본격적으로 POST 요청을 보내기 전, 서버에 "너 나랑 안전하게 통신할 수 있니?" 하고 
    # 미리 찔러보는 사전 검사(Preflight Request)에 대하여 정상(200 OK) 응답을 주는 로직입니다.
    def do_OPTIONS(self):
        self.send_response(200)       # 200 OK 상태 코드 전송 (안전하다는 뜻)
        self._send_cors_headers()     # CORS 허용 통과 헤더 적용
        self.end_headers()            # 응답 헤더 작성 종료

    # --------------------------------------------------------------------------
    # 정적 파일(HTML, CSS, JS, 이미지) 경로 해석 및 보안 필터링
    # --------------------------------------------------------------------------
    # 브라우저가 요청한 웹 주소(/css/style.css 등)를 컴퓨터 내의 실제 파일 경로로 연결해 주는 도우미 함수입니다.
    def _resolve_static_file(self, clean_path, base_dir):
        # 1) 단순히 홈주소(/) 또는 메인 페이지(/index.html)를 요청한 경우
        if clean_path in ('/', '/index.html'):
            return os.path.join(base_dir, 'index.html'), HTML_CONTENT_TYPE

        # 2) 주소 앞에 붙은 슬래시(/)를 떼어내서 상대 경로로 변경합니다.
        rel_path = clean_path.lstrip('/')
        # base_dir(프로젝트 최상위 디렉터리)와 결합하여 컴퓨터 내부의 절대 경로로 변환합니다.
        target_file = os.path.abspath(os.path.join(base_dir, rel_path))

        # [보안 위험 방지: Path Traversal 공격 차단]
        # 해커가 웹 브라우저 주소창에 `../../windows/system32` 나 `.env` 처럼 최상위 폴더 외부의 중요한 
        # 시스템 파일이나 비밀 키 파일을 가리키려 할 때, 해당 경로가 프로젝트 기본 디렉터리인 base_dir 바깥에 있거나
        # 파일명이 숨김 설정파일인 `.env` 로 시작하면 강제로 접근을 금지(None 반환)시킵니다.
        if not target_file.startswith(base_dir) or os.path.basename(target_file).startswith('.env'):
            return None, None

        # 3) 요청 파일의 확장자를 분석하여 그에 맞는 인터넷 데이터 형식(MIME Type) 매핑 테이블입니다.
        ext_to_mime = {
            '.css': 'text/css; charset=utf-8',
            '.js': 'application/javascript; charset=utf-8',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.webp': 'image/webp',
            '.json': JSON_CONTENT_TYPE
        }
        _, ext = os.path.splitext(clean_path)
        # 매칭되는 형식이 없으면 안전을 위해 가장 일반적인 일반 텍스트(plain text)로 지정합니다.
        content_type = ext_to_mime.get(ext.lower(), TEXT_PLAIN_CONTENT_TYPE)
        return target_file, content_type

    # --------------------------------------------------------------------------
    # GET 요청 처리 (웹페이지 화면 전송 및 API 작동 상태 조회)
    # --------------------------------------------------------------------------
    # 브라우저가 무언가를 단순 "조회"하고자 할 때(예: 주소 입력 후 접속) 들어오는 요청을 처리합니다.
    def do_GET(self):
        # 웹 주소 뒤에 붙은 파라미터(?v=1.2 등)를 제거하고 순수한 주소 경로만 가져옵니다.
        clean_path = self.path.split('?')[0]

        # 만약 주소가 API 분석 엔진 상태 조회를 의미하는 "/api/analyze" 또는 "/api" 라면,
        # 현재 서버가 이상 없이 건강하게 동작하고 있다는 점을 알리는 JSON 데이터를 응답해 줍니다.
        if clean_path in ('/api/analyze', '/api', '/api/'):
            self.send_response(200)
            self._send_cors_headers()
            self.send_header('Content-Type', JSON_CONTENT_TYPE)
            self.end_headers()
            response_data = {
                "status": "healthy",
                "service": "PawEmotion AI API",
                "version": "1.0.0",
                "message": "POST /api/analyze 형식으로 { image, breed, age, situation }을 보내 분석하세요."
            }
            # 한글 깨짐을 막기 위해 utf-8 형식으로 바이트로 바꾸어 클라이언트에 써서 보냅니다.
            self.wfile.write(json.dumps(response_data, ensure_ascii=False).encode('utf-8'))
            return

        # 만약 API가 아닌 일반 정적 파일(HTML, CSS 등)을 달라고 하는 것이라면 프로젝트 최상위 경로를 파악합니다.
        # 이 파일의 2단계 부모 디렉터리가 웹 루트 경로가 됩니다.
        base_dir = os.path.abspath(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        target_file, content_type = self._resolve_static_file(clean_path, base_dir)

        # 경로가 부적절하거나 존재해선 안 될 비밀 경로로 해석된 경우 403 Forbidden(접근 거부) 상태 코드를 응답합니다.
        if not target_file:
            self.send_response(403)
            self._send_cors_headers()
            self.send_header('Content-Type', TEXT_PLAIN_CONTENT_TYPE)
            self.end_headers()
            self.wfile.write(b"403 Forbidden")
            return

        # 분석한 경로에 실제 파일이 잘 보관되어 있다면 파일을 통째로 바이너리('rb')로 읽어서 브라우저로 쏴줍니다.
        if os.path.isfile(target_file):
            try:
                with open(target_file, 'rb') as f:
                    file_content = f.read()
                self.send_response(200)
                self._send_cors_headers()
                self.send_header('Content-Type', content_type)
                # 데이터의 총 크기(바이트)를 브라우저에 적어주어 브라우저가 다운로드 끝 시점을 알 수 있게 돕습니다.
                self.send_header('Content-Length', str(len(file_content)))
                self.end_headers()
                self.wfile.write(file_content)
                return
            except Exception:
                pass # 파일 읽기 중 내부 예외가 발생할 경우 무시하고 아래 404로 흐르게 둡니다.

        # 정적 파일 경로도 아니고, 지정된 파일도 찾을 수 없는 경로인 경우 404 Not Found 에러를 응답합니다.
        self.send_response(404)
        self._send_cors_headers()
        self.send_header('Content-Type', TEXT_PLAIN_CONTENT_TYPE)
        self.end_headers()
        self.wfile.write(b"404 Not Found")

    # --------------------------------------------------------------------------
    # POST 요청 처리 (반려견 정보 및 이미지 업로드 분석 - 백엔드의 메인 엔진)
    # --------------------------------------------------------------------------
    # 프론트엔드에서 보낸 강아지 이미지와 정보들을 받아서 AI 모델을 거쳐 분석하는 핵심 비즈니스 로직입니다.
    def do_POST(self):
        # 클라이언트가 데이터 본문(Body)을 몇 바이트나 보냈는지 크기를 체크합니다.
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            # 본문 내용이 전혀 없으면 400 Bad Request 에러로 거절합니다.
            self._send_json_error(400, "요청 본문(Body)이 비어 있습니다. 분석할 반려견 사진 데이터를 전달해주세요.")
            return

        # [보안 위험 방지: 디바이스 메모리 보호 (DoS/폭탄 파일 차단)]
        # 해커가 대용량 고해상도 이미지(수십 메가바이트)나 바이러스를 보내 서버 컴퓨터의 RAM 메모리를 과점유하는 것을 막기 위해,
        # 최대 업로드 한도를 6MB 이하(5MB 사진까지 안전 권장)로 제한하여 그 이상은 분석 전 즉각 차단(413 Payload Too Large)합니다.
        if content_length > 6 * 1024 * 1024:
            self._send_json_error(413, "요청 데이터 용량이 제한(6MB)을 초과했습니다. 5MB 이하의 사진만 사용해주세요.")
            return

        try:
            # 요청받은 크기만큼 정확하게 바이트를 읽어와 한글/영문 텍스트로 변환(디코딩)하고 JSON 형식으로 파싱합니다.
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
        except Exception as e:
            # JSON 데이터 구조가 깨졌을 때 상세 정보 유출(Information Disclosure)을 차단하고자
            # 콘솔 내부 로그에는 오류 내역을 출력하되, 클라이언트에게는 정제된 에러 안내문만 전송합니다.
            import sys
            sys.stderr.write(f"[JSON 파싱 에러] {str(e)}\n")
            self._send_json_error(400, "유효하지 않은 JSON 데이터 구조입니다. 전송 파라미터를 다시 확인해주세요.")
            return

        # 프론트엔드가 보낸 원본 데이터를 가공/정제(Sanitize)하여 로컬 변수로 바인딩합니다.
        image_data, breed, age, situation = self._parse_request_data(data)

        # 필수 값인 반려견 사진(Base64)이 빠져 있다면 에러로 돌려보냅니다.
        if not image_data:
            self._send_json_error(400, "사진(image) 데이터는 필수 입력값입니다. 반려견 사진을 등록해주세요.")
            return

        # 서버 환경변수(Vercel OS Setting) 또는 로컬 파일(.env)에서 AI 연동에 필요한 시크릿 키를 로드합니다.
        gemini_api_key, openai_api_key = self._get_api_keys()

        # AI 모델(Gemini 혹은 GPT Vision)에 부여하여 분석의 정확성과 출력을 표준화하는 '전문가 페르소나 및 응답 형태(JSON)' 정의서입니다.
        system_instruction = (
            "당신은 세계적인 반려견 행동학(Canine Ethology) 및 동물심리 분석 전문가입니다. "
            "반드시 텍스트 설명보다 [제공된 사진 속 반려견의 실제 시각적 표정과 신체 언어]를 최우선 기준으로 정밀 판별하세요.\n\n"
            "핵심 관찰 기준:\n"
            "1. 눈(Eyes): 흰자위 노출(고래 눈, Whale eye), 동공 크기, 부드러운 눈매 vs 굳은 눈매, 시선 방향\n"
            "2. 귀(Ears): 뒤로 젖혀짐(경계/불안/복종), 쫑긋 앞으로 향함(집중/놀이), 힘이 빠진 중립(편안함)\n"
            "3. 입 및 혀(Mouth/Tongue): 편안한 개구호흡/미소, 굳게 다문 입술, 코 핥기(카밍 시그널), 이빨 노출 여부\n"
            "4. 몸 및 자세(Posture): 플레이 보우(Play bow), 근육 경직/무게중심 낮춤(불안/두려움), 이완된 누운 자세(편안함)\n\n"
            "사진에 나타난 실제 감정을 다음 6가지 중 가장 적합한 1개로 엄격하게 선정하세요:\n"
            "- 행복(Happy), 편안함(Relaxed), 불안(Anxious), 경계(Alert), 두려움(Fear), 놀이(Playful)\n\n"
            "반드시 아래 JSON 포맷으로만 응답하세요:\n"
            "{\n"
            '  "emotion": "행복 | 편안함 | 불안 | 경계 | 두려움 | 놀이 중 택1",\n'
            '  "emotion_en": "Happy | Relaxed | Anxious | Alert | Fear | Playful 중 택1",\n'
            '  "emoji": "😊 | 😌 | 😟 | 😠 | 😨 | 🎾",\n'
            '  "confidence": 92,\n'
            '  "summary": "사진에서 관찰된 실제 신체 언어를 근거로 작성한 1~2문장의 감정 상태 요약",\n'
            '  "cues": [\n'
            f'    {{"part": "{CUE_EYE}", "observation": "사진 속 눈의 형태 및 시선 특징"}},\n'
            f'    {{"part": "{CUE_EAR}", "observation": "사진 속 귀의 위치 및 각도 특징"}},\n'
            f'    {{"part": "{CUE_MOUTH}", "observation": "사진 속 입, 혀, 입술의 모양 특징"}},\n'
            f'    {{"part": "{CUE_BODY}", "observation": "사진 속 전신 자세, 근육 긴장도 특징"}}\n'
            '  ],\n'
            '  "recommendations": [\n'
            '    "보호자가 취해야 할 구체적인 행동 1",\n'
            '    "보호자가 취해야 할 구체적인 행동 2",\n'
            '    "보호자가 취해야 할 구체적인 행동 3"\n'
            '  ],\n'
            '  "precautions": [\n'
            '    "현재 감정 상태에서 주의해야 할 점 1",\n'
            '    "현재 감정 상태에서 주의해야 할 점 2"\n'
            '  ]\n'
            "}"
        )

        # AI 모델이 반려견 정보(견종, 나이)와 상황 맥락을 참고하여 시각적 데이터와 종합 판단할 수 있도록 프롬프트를 구성합니다.
        user_prompt_text = (
            f"참고 정보 (품종: {breed}, 나이: {age}, 상황: {situation})\n\n"
            "사진 속 반려견의 얼굴 표정과 귀, 입, 자세를 면밀히 관찰하여, 사진에 나타난 실제 감정을 동물행동학에 기반해 정밀 분석해주세요."
        )

        # AI 서버들과 교신하여 분석 결과를 도출하고 브라우저에 송신합니다.
        api_executed = self._execute_api_analysis(
            gemini_api_key, openai_api_key, image_data,
            system_instruction, user_prompt_text
        )

        # 시스템의 어떤 AI API 키도 세팅되어 있지 않아 AI 분석을 수행할 수 없는 상황인 경우 503 에러로 고지합니다.
        if not api_executed:
            self._send_json_error(503, "AI API 키가 설정되지 않았습니다. Vercel 환경 변수에 GEMINI_API_KEY 또는 OPENAI_API_KEY를 등록해주세요.")

    # --------------------------------------------------------------------------
    # 요청 매개변수 유효성 검사 및 정제용 내부 헬퍼 메서드
    # --------------------------------------------------------------------------
    # 사용자가 보낸 각 입력 필드에 악성 유저 입력이나 공백을 제거하고 기본값을 넣어 에러를 방지합니다.
    def _parse_request_data(self, data):
        image_data = data.get('image', '').strip()
        # 견종이나 나이가 적혀 있지 않으면 '미확인'으로 기본 기재해 AI에게 보냅니다.
        breed = data.get('breed', '미확인').strip() or '미확인'
        age = data.get('age', '미확인').strip() or '미확인'
        # 상황이 비어있으면 보수적으로 '일상' 상태로 정합니다.
        situation = data.get('situation', '일상').strip() or '일상'

        # 사용자가 원본 Base64 데이터를 전달했을 때 앞에 이미지 메타 규격 접두어(data:image/...)가 누락되어 있다면
        # AI 모델이 이를 올바른 이미지 파일로 인식하도록 강제로 헤더 규격을 결합해 줍니다.
        if image_data and not image_data.startswith(('data:image/', 'http')):
            image_data = f"data:image/jpeg;base64,{image_data}"
        return image_data, breed, age, situation

    # --------------------------------------------------------------------------
    # 다중 AI API 교차 호출 및 분석 조율용 헬퍼 메서드 (Failover 전략)
    # --------------------------------------------------------------------------
    # 1지망인 Google Gemini API를 먼저 시도하고, 만약 Gemini 서버 장애나 요금 초과 등으로 실패하면,
    # 2지망인 OpenAI GPT-4o-mini API로 자동 우회(폴백 - Failover) 처리하여 안정성을 100% 확보합니다.
    def _execute_api_analysis(self, gemini_api_key, openai_api_key, image_data, system_instruction, user_prompt_text):
        
        # [1단계: Google Gemini API 실행 시도]
        if gemini_api_key:
            try:
                # 제미나이 전담 호출 함수 실행
                result_json = self._call_gemini_api(gemini_api_key, image_data, system_instruction, user_prompt_text)
                # 성공하면 브라우저에 성공 결과 데이터를 돌려주고 즉시 종료
                self._send_json_success(result_json)
                return True
            except Exception as e:
                # Gemini에서 오류가 발생한 경우 콘솔로그에 기록하고, 다음 백업 플랜으로 전환합니다.
                import sys
                sys.stderr.write(f"[Gemini API 호출 에러] {str(e)}\n")
                # 만약 OpenAI 키조차 없다면 즉시 실패 에러 정보를 브라우저에 뿌려줍니다.
                if not openai_api_key:
                    self._send_json_error(502, f"AI API 연결에 실패했습니다. (Gemini 오류: {str(e)}) 잠시 후 다시 시도하거나 API 키 설정을 확인해주세요.")
                    return True

        # [2단계: OpenAI API 실행 시도 (백업)]
        if openai_api_key and OpenAI is not None:
            try:
                # GPT 모델 전담 호출 함수 실행
                result_json = self._call_openai_api(openai_api_key, image_data, system_instruction, user_prompt_text)
                self._send_json_success(result_json)
                return True
            except Exception as e:
                import sys
                sys.stderr.write(f"[OpenAI API 호출 에러] {str(e)}\n")
                self._send_json_error(502, f"AI API 연결에 실패했습니다. (OpenAI 오류: {str(e)}) 잠시 후 다시 시도하거나 API 키 설정을 확인해주세요.")
                return True

        return False

    # --------------------------------------------------------------------------
    # AI API 인증 키 로드 (서버 설정 및 로컬 .env)
    # --------------------------------------------------------------------------
    def _get_api_keys(self):
        # 1) Vercel 서버 운영체제 환경변수에 등록된 키를 우선 조회합니다.
        gemini_api_key = os.environ.get("GEMINI_API_KEY", "").strip()
        openai_api_key = os.environ.get("OPENAI_API_KEY", "").strip()

        # 2) 만약 로컬 컴퓨터에서 오프라인 개발 중인 경우, 프로젝트 상위 폴더의 `.env` 파일로부터 키를 직접 탐색합니다.
        if not gemini_api_key or not openai_api_key:
            env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
            gemini_api_key, openai_api_key = self._load_keys_from_env_file(env_path, gemini_api_key, openai_api_key)
        return gemini_api_key, openai_api_key

    # --------------------------------------------------------------------------
    # 로컬 .env 파일 파싱 헬퍼 메서드
    # --------------------------------------------------------------------------
    # `.env` 파일 내부의 데이터를 줄바꿈 기준으로 읽어 `=` 기호 뒤의 인증 키 문자열을 추출합니다.
    def _load_keys_from_env_file(self, env_path, gemini_api_key, openai_api_key):
        if not os.path.exists(env_path):
            return gemini_api_key, openai_api_key

        try:
            with open(env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    # 샾(#)으로 시작하는 주석은 건너뜁니다.
                    if not line or line.startswith('#'):
                        continue
                    if line.startswith('GEMINI_API_KEY=') and not gemini_api_key:
                        # 등호(=)를 기준으로 분할하고 양 옆의 큰따옴표나 작은따옴표를 떼어냅니다.
                        gemini_api_key = line.split('=', 1)[1].strip().strip('"\'')
                    elif line.startswith('OPENAI_API_KEY=') and not openai_api_key:
                        openai_api_key = line.split('=', 1)[1].strip().strip('"\'')
        except Exception:
            pass
        return gemini_api_key, openai_api_key

    # --------------------------------------------------------------------------
    # Base64 이미지 데이터에서 파일 규격 정보 분리 추출
    # --------------------------------------------------------------------------
    # 프론트엔드에서 보낸 사진 데이터는 보통 `data:image/png;base64,iVBORw0KGgo...` 처럼 생겼습니다.
    # 이 중 실질적으로 AI 엔진에게 전달해야 하는 순수 암호화 본문 데이터(`iVBORw...`)와 파일 확장자 종류를 발라냅니다.
    def _get_mime_and_base64(self, image_data):
        raw_b64 = image_data
        mime_type = "image/jpeg" # 매칭 실패 시 기본값은 jpeg로 지정
        if "base64," in image_data:
            header, raw_b64 = image_data.split("base64,", 1)
            if "image/png" in header:
                mime_type = "image/png"
            elif "image/webp" in header:
                mime_type = "image/webp"
        return mime_type, raw_b64.strip()

    # --------------------------------------------------------------------------
    # Google Gemini Vision API 웹 서비스 호출 로직
    # --------------------------------------------------------------------------
    def _call_gemini_api(self, gemini_api_key, image_data, system_instruction, user_prompt_text):
        import urllib.request
        import re

        # 이미지 형태를 쪼개어 가져옵니다.
        mime_type, raw_b64 = self._get_mime_and_base64(image_data)

        # 안정적인 구동을 위해 구글 제미나이의 활성화된 고성능 AI 모델 후보군들을 차례로 루프를 돌며 시도합니다.
        models_to_try = ["gemini-3.5-flash", "gemini-2.5-flash-lite", "gemini-flash-latest"]
        last_err = None

        # 구글 제미나이 API가 수용하는 규격화된 다차원 데이터 구조(Payload)를 정의합니다.
        payload = {
            "contents": [
                {
                    "parts": [
                        # AI에게 줄 행동 지침 및 사용자의 텍스트 질문을 첫 부품(part)으로 탑재
                        {"text": f"{system_instruction}\n\n{user_prompt_text}"},
                        # 이미지의 Base64 데이터와 MIME 포맷을 두 번째 부품(part)으로 바인딩
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": raw_b64
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                # 결과를 반드시 JSON 형식 텍스트로 보장하도록 설정하여 후속 파싱 에러를 예방합니다.
                "response_mime_type": "application/json",
                # 온도가 낮을수록 창의성을 낮추고, 행동학 데이터베이스에 정량 부합하는 사실만 일관되게 출력합니다.
                "temperature": 0.2
            }
        }

        for model_name in models_to_try:
            # 주소 뒤에 인증 키 파라미터를 붙여 타깃 주소를 정합니다.
            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_api_key}"
            # urllib를 이용해 외부 AI 주소로 보낼 비동기 통신 객체를 포장합니다.
            req = urllib.request.Request(
                gemini_url,
                data=json.dumps(payload).encode('utf-8'),
                headers={"Content-Type": "application/json"}
            )
            try:
                # 최대 25초 간 통신 소켓을 열어두고 응답을 기다립니다.
                with urllib.request.urlopen(req, timeout=25) as res:
                    gemini_resp = json.loads(res.read().decode('utf-8'))
                    # 제미나이가 내뱉은 응답 구조체에서 순수 텍스트 결과만 뽑아냅니다.
                    text_content = gemini_resp['candidates'][0]['content']['parts'][0]['text'].strip()
                    
                    # [마크다운 방어 조치]
                    # 간혹 AI 모델이 JSON 형식 응답에 불필요하게 ```json ... ``` 같은 마크다운 코드 감싸기 태그를 
                    # 붙여줄 때가 있습니다. 이를 방지하기 위해 정규표현식으로 코드블럭 표시를 깔끔히 지워줍니다.
                    if text_content.startswith('```'):
                        text_content = re.sub(r'^```[a-zA-Z]*\n', '', text_content)
                        text_content = re.sub(r'\n```$', '', text_content).strip()
                    
                    # 최종 JSON 직렬화 해제
                    result_json = json.loads(text_content)
                    # 분석에 참여한 모델 출처를 결과에 주입하여 프론트엔드 화면에 표시할 수 있게 합니다.
                    result_json["source"] = f"Google Gemini ({model_name}) Vision AI"
                    return result_json
            except Exception as e:
                last_err = e
                continue # 실패하면 루프를 계속 돌아 다음 AI 모델 후보군으로 자동 재요청합니다.

        # 모든 버전을 시도했음에도 실패한 경우 예외를 상위 함수로 버블링시킵니다.
        raise last_err or Exception("All Gemini models failed")

    # --------------------------------------------------------------------------
    # OpenAI GPT-4o-mini API 호출 로직 (백업 전용)
    # --------------------------------------------------------------------------
    def _call_openai_api(self, openai_api_key, image_data, system_instruction, user_prompt_text):
        # OpenAI의 파이썬 SDK 클라이언트를 생성합니다.
        client = OpenAI(api_key=openai_api_key)

        # GPT API는 프롬프트 텍스트와 이미지 데이터(URL 형태)를 리스트 안에 개별 딕셔너리로 담아야 합니다.
        user_content = [
            {"type": "text", "text": user_prompt_text},
            # detail을 high로 주면 사진 전체의 미세 부위(눈꼬리 등)를 세밀하게 확대 분석할 수 있습니다.
            {"type": "image_url", "image_url": {"url": image_data, "detail": "high"}}
        ]

        # OpenAI 서버로 채팅(Chat Completion) 생성 요청을 날립니다.
        response = client.chat.completions.create(
            model="gpt-4o-mini", # 가성비와 연산속도가 뛰어나며 비전 능력이 뛰어난 모델 지정
            messages=[
                {"role": "system", "content": system_instruction}, # 행동 강령 지시
                {"role": "user", "content": user_content}           # 본문 입력
            ],
            max_tokens=800, # 응답 텍스트 최대 토큰 한계값 설정 (너무 장황해지는 것 방지)
            temperature=0.3,
            response_format={"type": "json_object"} # 결과값을 JSON 데이터로 강제하여 출력 안정성 강화
        )

        content = response.choices[0].message.content
        result_json = json.loads(content)
        result_json["source"] = "OpenAI GPT-4o-mini Vision"
        return result_json

    # --------------------------------------------------------------------------
    # 성공(200 OK) 상태의 JSON 데이터 응답 전송 헬퍼 메서드
    # --------------------------------------------------------------------------
    def _send_json_success(self, data):
        self.send_response(200)
        self._send_cors_headers()
        self.send_header('Content-Type', JSON_CONTENT_TYPE)
        self.end_headers()
        # JSON 직렬화 시 아스키 변환을 끄는(ensure_ascii=False) 처리를 거쳐야 한글 텍스트가 
        # \u11a3 같이 깨지지 않고 고유의 글자로 정상 출력됩니다.
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    # --------------------------------------------------------------------------
    # 실패(4xx, 5xx 에러) 상태의 JSON 데이터 응답 전송 헬퍼 메서드
    # --------------------------------------------------------------------------
    def _send_json_error(self, status_code, message):
        self.send_response(status_code)
        self._send_cors_headers()
        self.send_header('Content-Type', JSON_CONTENT_TYPE)
        self.end_headers()
        error_payload = {
            "error": True,
            "status": status_code,
            "message": message
        }
        self.wfile.write(json.dumps(error_payload, ensure_ascii=False).encode('utf-8'))
