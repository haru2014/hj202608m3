# 파이썬 기본 제공 라이브러리 임포트 (JSON 처리, 운영체제 환경변수 접근, 정규식 등)
import json
import os
import re
# 파이썬 내장 HTTP 서버 클래스 가져오기 (Vercel serverless 함수는 http.server를 기반으로 작동할 수 있습니다)
from http.server import BaseHTTPRequestHandler

# OpenAI API SDK (설치되지 않았을 경우를 대비한 예외 처리 - Lazy Loading 방식)
try:
    from openai import OpenAI  # type: ignore
except ImportError:
    OpenAI = None

# 공통 MIME 타입 및 미세 바디랭귀지 특징 카테고리 정의 (리터럴 중복 방지 linter 준수)
JSON_CONTENT_TYPE = 'application/json; charset=utf-8'
CUE_EYE = '눈'
CUE_EAR = '귀'
CUE_MOUTH = '입 및 혀'
CUE_BODY = '몸 및 자세'

# BaseHTTPRequestHandler를 상속받는 API 핸들러 클래스 정의
class handler(BaseHTTPRequestHandler):
    # CORS(Cross-Origin Resource Sharing) 설정을 위한 공통 헤더 송신 메서드
    # 로컬 개발 환경(localhost) 또는 본 서비스의 Vercel 배포 도메인만 허용하도록 보안을 강화했습니다.
    def _send_cors_headers(self):
        origin = self.headers.get('Origin', '')
        is_allowed = False
        if origin:
            # 로컬 개발 환경 및 Vercel 배포 도메인 허용 여부를 검증
            if origin.startswith(('http://localhost:', 'http://127.0.0.1:')) or origin.endswith('.vercel.app') or origin == 'https://hj202608m3.vercel.app':
                is_allowed = True

        if is_allowed:
            self.send_header('Access-Control-Allow-Origin', origin)
        else:
            # 허용되지 않는 도메인은 기본 공식 사이트 주소로 지정하여 무단 도용 방지
            self.send_header('Access-Control-Allow-Origin', 'https://hj202608m3.vercel.app')

        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS') # 허용할 HTTP 메서드 종류
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization') # 허용할 요청 헤더 목록

    # OPTIONS 메서드 처리 (브라우저가 보안 검사를 위해 사전 요청을 보낼 때 응답하는 용도)
    def do_OPTIONS(self):
        self.send_response(200) # 성공 응답 코드 설정 (200 OK)
        self._send_cors_headers() # CORS 헤더 적용
        self.end_headers() # 응답 헤더 작성 완료

    # GET 요청 처리 (서버 상태 확인 및 정보 제공용)
    def do_GET(self):
        self.send_response(200) # 성공 응답 설정
        self._send_cors_headers() # CORS 헤더 적용
        self.send_header('Content-Type', JSON_CONTENT_TYPE) # 응답 본문 형식을 JSON으로 정의
        self.end_headers() # 헤더 작성 완료
        
        # 반환할 기본 API 가이드 정보 구성
        response_data = {
            "status": "healthy",
            "service": "PawEmotion AI API",
            "version": "1.0.0",
            "message": "POST /api/analyze with { image, breed, age, situation } to analyze canine emotion."
        }
        # JSON 포맷으로 문자열 변환 후 UTF-8 인코딩하여 클라이언트에 전송
        self.wfile.write(json.dumps(response_data, ensure_ascii=False).encode('utf-8'))

    # POST 요청 처리 (클라이언트로부터 강아지 정보 및 이미지 데이터를 받아 분석을 수행하는 핵심 로직)
    def do_POST(self):
        # 클라이언트가 보낸 요청의 데이터 크기(Content-Length)를 파악
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            # 보낸 본문이 비어 있으면 400 Bad Request 에러 반환
            self._send_json_error(400, "요청 본문(Body)이 비어 있습니다. 분석할 반려견 사진 데이터를 전달해주세요.")
            return

        # DoS(서비스 거부 공격) 방지를 위해 6MB를 초과하는 페이로드 전송은 사전에 차단 (5MB 이미지 한도 보호)
        if content_length > 6 * 1024 * 1024:
            self._send_json_error(413, "요청 데이터 용량이 제한(6MB)을 초과했습니다. 5MB 이하의 사진만 사용해주세요.")
            return

        try:
            # 지정한 크기만큼 데이터를 읽어들인 뒤 UTF-8로 디코딩하고 JSON 객체로 파싱
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
        except Exception as e:
            # JSON 포맷이 잘못되었을 때 상세 시스템 예외 노출(Information Disclosure)을 차단하고 서버 로그로만 출력
            import sys
            sys.stderr.write(f"[JSON 파싱 에러] {str(e)}\n")
            self._send_json_error(400, "유효하지 않은 JSON 데이터 구조입니다. 전송 파라미터를 다시 확인해주세요.")
            return

        # 요청 데이터 추출 및 이스케이프 포맷팅 처리
        image_data, breed, age, situation = self._parse_request_data(data)

        # 사진 데이터 누락 시 에러 처리
        if not image_data:
            self._send_json_error(400, "사진(image) 데이터는 필수 입력값입니다. 반려견 사진을 등록해주세요.")
            return

        # 운영체제 환경변수 및 .env에서 AI API 키들을 로드
        gemini_api_key, openai_api_key = self._get_api_keys()

        # AI 모델(Gemini, OpenAI)에 부여할 시스템 명령어(역할 정의 및 응답 포맷 안내)
        system_instruction = (
            "당신은 전 세계 최고의 반려견 행동학(Canine Ethology) 및 동물심리 전문가입니다. "
            "제공된 반려견의 사진과 추가 정보(품종, 나이, 상황)를 관찰하여 현재의 감정 상태를 다각도로 분석하고, "
            "보호자가 즉시 실천할 수 있는 긍정적인 행동 가이드와 주의사항을 친절하고 신뢰감 있는 어조로 제공하세요.\n\n"
            "반드시 아래 JSON 형식에 맞추어 순수 JSON만 응답하세요:\n"
            "{\n"
            '  "emotion": "행복 | 편안함 | 불안 | 경계 | 두려움 | 놀이 중 택1",\n'
            '  "emotion_en": "Happy | Relaxed | Anxious | Alert | Fear | Playful 중 택1",\n'
            '  "emoji": "😊 | 😌 | 😟 | 😠 | 😨 | 🎾",\n'
            '  "confidence": 85,\n'
            '  "summary": "반려견의 전체적인 상태를 요약한 1~2문장의 설명",\n'
            '  "cues": [\n'
            f'    {{"part": "{CUE_EYE}", "observation": "관찰된 특징"}},\n'
            f'    {{"part": "{CUE_EAR}", "observation": "관찰된 특징"}},\n'
            f'    {{"part": "{CUE_MOUTH}", "observation": "관찰된 특징"}},\n'
            f'    {{"part": "{CUE_BODY}", "observation": "관찰된 특징"}}\n'
            '  ],\n'
            '  "recommendations": [\n'
            '    "보호자가 취해야 할 권장 행동 1",\n'
            '    "보호자가 취해야 할 권장 행동 2",\n'
            '    "보호자가 취해야 할 권장 행동 3"\n'
            '  ],\n'
            '  "precautions": [\n'
            '    "주의해야 할 점 또는 스트레스 예방 팁 1",\n'
            '    "주의해야 할 점 또는 스트레스 예방 팁 2"\n'
            '  ]\n'
            "}"
        )

        # AI 모델에 보낼 유저 질문 텍스트 구성
        user_prompt_text = (
            f"반려견 정보:\n- 품종: {breed}\n- 나이: {age}\n- 현재 상황: {situation}\n\n"
            "이 사진의 눈, 귀, 입, 자세 등 신체 언어를 관찰하여 현재 감정과 보호자 가이드를 JSON으로 분석해주세요."
        )

        # API 연동 실행 및 응답 전송
        api_executed = self._execute_api_analysis(
            gemini_api_key, openai_api_key, image_data,
            system_instruction, user_prompt_text, breed, age, situation
        )

        # API 호출이 전혀 수행되지 않았을 경우 (데모 모드)
        if not api_executed:
            demo_result = self._generate_heuristic_response(breed, age, situation, error_msg="No API keys")
            self._send_json_success(demo_result)

    # 요청 매개변수 유효성 검사 및 정제용 내부 헬퍼 메서드
    def _parse_request_data(self, data):
        image_data = data.get('image', '').strip()
        breed = data.get('breed', '미확인').strip() or '미확인'
        age = data.get('age', '미확인').strip() or '미확인'
        situation = data.get('situation', '일상').strip() or '일상'

        if image_data and not image_data.startswith(('data:image/', 'http')):
            image_data = f"data:image/jpeg;base64,{image_data}"
        return image_data, breed, age, situation

    # API 연동 및 처리를 대행하는 조율용 내부 헬퍼 메서드
    def _execute_api_analysis(self, gemini_api_key, openai_api_key, image_data, system_instruction, user_prompt_text, breed, age, situation):
        # 1단계: Google Gemini API 실행
        if gemini_api_key:
            try:
                result_json = self._call_gemini_api(gemini_api_key, image_data, system_instruction, user_prompt_text)
                self._send_json_success(result_json)
                return True
            except Exception as e:
                import sys
                sys.stderr.write(f"[Gemini API 호출 에러] {str(e)}\n")
                if not openai_api_key:
                    fallback_result = self._generate_heuristic_response(breed, age, situation, error_msg=str(e))
                    self._send_json_success(fallback_result)
                    return True

        # 2단계: OpenAI API 실행
        if openai_api_key and OpenAI is not None:
            try:
                result_json = self._call_openai_api(openai_api_key, image_data, system_instruction, user_prompt_text)
                self._send_json_success(result_json)
                return True
            except Exception as e:
                import sys
                sys.stderr.write(f"[OpenAI API 호출 에러] {str(e)}\n")
                fallback_result = self._generate_heuristic_response(breed, age, situation, error_msg=str(e))
                self._send_json_success(fallback_result)
                return True

        return False

    # API 키 로드용 내부 헬퍼 메서드
    def _get_api_keys(self):
        gemini_api_key = os.environ.get("GEMINI_API_KEY", "").strip()
        openai_api_key = os.environ.get("OPENAI_API_KEY", "").strip()

        # 로컬 개발 환경에서 환경변수(.env) 파일이 있을 경우 자동으로 로드하는 예외적인 로직
        if not gemini_api_key or not openai_api_key:
            env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
            gemini_api_key, openai_api_key = self._load_keys_from_env_file(env_path, gemini_api_key, openai_api_key)
        return gemini_api_key, openai_api_key

    # .env 파일에서 API 키를 읽어오는 헬퍼 메서드 (복잡도 해소용)
    def _load_keys_from_env_file(self, env_path, gemini_api_key, openai_api_key):
        if not os.path.exists(env_path):
            return gemini_api_key, openai_api_key

        try:
            with open(env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line.startswith('GEMINI_API_KEY=') and not gemini_api_key:
                        gemini_api_key = line.split('=', 1)[1].strip().strip('"\'')
                    elif line.startswith('OPENAI_API_KEY=') and not openai_api_key:
                        openai_api_key = line.split('=', 1)[1].strip().strip('"\'')
        except Exception:
            pass
        return gemini_api_key, openai_api_key

    # Base64 이미지에서 MIME 타입과 정제된 Base64 데이터를 추출하는 헬퍼 메서드
    def _get_mime_and_base64(self, image_data):
        raw_b64 = image_data
        mime_type = "image/jpeg"
        if "base64," in image_data:
            header, raw_b64 = image_data.split("base64,", 1)
            if "image/png" in header:
                mime_type = "image/png"
            elif "image/webp" in header:
                mime_type = "image/webp"
        return mime_type, raw_b64.strip()

    # Gemini API 호출용 내부 헬퍼 메서드
    def _call_gemini_api(self, gemini_api_key, image_data, system_instruction, user_prompt_text):
        import urllib.request
        
        mime_type, raw_b64 = self._get_mime_and_base64(image_data)
        gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_api_key}"
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"{system_instruction}\n\n{user_prompt_text}"},
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
                "response_mime_type": "application/json",
                "temperature": 0.2
            }
        }

        req = urllib.request.Request(
            gemini_url,
            data=json.dumps(payload).encode('utf-8'),
            headers={"Content-Type": "application/json"}
        )

        with urllib.request.urlopen(req, timeout=25) as res:
            gemini_resp = json.loads(res.read().decode('utf-8'))
            text_content = gemini_resp['candidates'][0]['content']['parts'][0]['text']
            result_json = json.loads(text_content)
            result_json["source"] = "Google Gemini 1.5 Flash Vision"
            return result_json

    # OpenAI API 호출용 내부 헬퍼 메서드
    def _call_openai_api(self, openai_api_key, image_data, system_instruction, user_prompt_text):
        client = OpenAI(api_key=openai_api_key)

        user_content = [
            {"type": "text", "text": user_prompt_text},
            {"type": "image_url", "image_url": {"url": image_data, "detail": "low"}}
        ]

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_content}
            ],
            max_tokens=800,
            temperature=0.3,
            response_format={"type": "json_object"}
        )

        content = response.choices[0].message.content
        result_json = json.loads(content)
        result_json["source"] = "OpenAI GPT-4o-mini Vision"
        return result_json

    # API 키가 없거나 API 호출에 실패했을 때 동작하는 대체 분석(Rule-based Heuristic) 함수
    def _generate_heuristic_response(self, breed, age, situation, error_msg=None):
        """API 키가 구성되지 않았거나 오프라인 테스트 중에 동작하는 인공지능 대체/데모 분석기"""
        
        # 상황(Situation) 텍스트를 모두 소문자로 변환하여 매칭 확률을 높임
        situation_lower = situation.lower()
        
        # 1) 산책, 놀이, 간식 등의 쾌활한 단어가 들어간 상황인 경우 -> '놀이(Playful)' 상태로 판정
        if any(w in situation_lower for w in ['산책', '놀이', '간식', '공놀이', '달리기']):
            emotion = "놀이"
            emotion_en = "Playful"
            emoji = "🎾"
            confidence = 91 # 신뢰도 설정 (%)
            summary = f"{breed} 친구는 현재 넘치는 에너지와 호기심으로 놀이 활동에 완전히 몰입해 있는 상태입니다!"
            cues = [
                {"part": CUE_EYE, "observation": "반짝이고 초롱초롱하며 보호자 또는 장난감을 강하게 주시함"},
                {"part": CUE_EAR, "observation": "전방을 향해 쫑긋 세워져 높은 집중력과 흥분을 나타냄"},
                {"part": CUE_MOUTH, "observation": "입을 기분 좋게 벌리고 혀를 약간 내밀며 호흡 중"},
                {"part": CUE_BODY, "observation": "몸에 탄력적인 텐션이 있고 언제든 달려나갈 준비가 된 활발한 자세"}
            ]
            recs = [
                "터그놀이나 터치 놀이 등 신체 및 지능을 자극하는 놀이를 15~20분간 함께 즐겨주세요.",
                "신나게 놀아준 후에는 차분하게 앉아 기다리는 쿨다운(Cool-down) 시간을 가져주세요.",
                "충분한 수분 섭취를 돕고 칭찬과 함께 가벼운 간식 보상을 제공하세요."
            ]
            precautions = [
                "과도한 흥분으로 인한 점핑이나 입질 행동이 나타나지 않도록 적절한 템포 조절이 필요합니다.",
                "관절에 무리가 가지 않도록 미끄럽지 않은 바닥에서 놀이를 진행해주세요."
            ]
            
        # 2) 병원, 낯선 자극, 소음 등 위협을 느낄 수 있는 상황인 경우 -> '불안(Anxious)' 상태로 판정
        elif any(w in situation_lower for w in ['병원', '낯선', '천둥', '소음', '목욕', '주사']):
            emotion = "불안"
            emotion_en = "Anxious"
            emoji = "😟"
            confidence = 86
            summary = f"낯선 자극이나 환경({situation})으로 인해 가벼운 긴장과 불안 신호가 관찰됩니다."
            cues = [
                {"part": CUE_EYE, "observation": "눈을 크게 뜨고 흰자위(고래 눈 신호)가 살짝 보이거나 시선을 회피함"},
                {"part": CUE_EAR, "observation": "귀가 뒤쪽으로 살짝 눕혀져 경계 및 긴장 상태를 표현"},
                {"part": CUE_MOUTH, "observation": "입을 꽉 다물고 있거나 코를 자주 날름거리는 핥기 행동(카밍 시그널)"},
                {"part": CUE_BODY, "observation": "무게중심을 낮추고 몸이 약간 경직되어 방어적 태세를 취함"}
            ]
            recs = [
                "반려견을 다그치지 말고 보호자의 차분하고 낮은 목소리로 안정을 유도하세요.",
                "억지로 만지거나 눈을 정면으로 빤히 응시하지 말고, 충분한 안전거리를 확보해주세요.",
                "평소 좋아하는 부드러운 담요나 애착 인형을 제공하여 심리적 안정감을 심어주세요."
            ]
            precautions = [
                "갑작스러운 신체 접촉이나 큰 동작은 반려견을 놀라게 할 수 있으니 피하세요.",
                "불안이 지속되거나 떨림 증상이 심해지면 조용한 독립 공간으로 이동해 휴식을 취하게 하세요."
            ]
            
        # 3) 잠, 휴식, 침대 등 이완되고 아늑한 상황인 경우 -> '편안함(Relaxed)' 상태로 판정
        elif any(w in situation_lower for w in ['잠', '휴식', '침대', '소파', '낮잠', '쿠션']):
            emotion = "편안함"
            emotion_en = "Relaxed"
            emoji = "😌"
            confidence = 94
            summary = "보호자와의 신뢰 속에서 매우 편안하고 안정적인 심리 상태를 유지하고 있습니다."
            cues = [
                {"part": CUE_EYE, "observation": "눈꺼풀이 부드럽게 풀려있고 눈빛이 그윽하며 온화함"},
                {"part": CUE_EAR, "observation": "품종 고유의 자연스럽고 힘이 빠진 중립적인 귀 위치"},
                {"part": CUE_MOUTH, "observation": "턱의 힘이 빠져 입이 살짝 벌어져 있거나 편안히 다문 상태"},
                {"part": CUE_BODY, "observation": "전신의 근육이 이완되어 옆으로 눕거나 편하게 기대어 쉼"}
            ]
            recs = [
                "편안한 휴식을 방해하지 않고 조용하고 아늑한 실내 온도를 유지해주세요.",
                "부드러운 스킨십(가슴이나 귀 뒤쪽 마사지)을 통해 유대감을 더욱 깊게 형성해보세요.",
                "안락한 수면 환경을 위해 은은한 조명과 적절한 습도를 유지해주세요."
            ]
            precautions = [
                "깊은 수면 중일 때 갑자기 만지면 방어 반응으로 놀랄 수 있으니 천천히 다가가세요.",
                "편안한 상태를 오래 지속할 수 있도록 주변의 급작스러운 소음을 최소화해주세요."
            ]
            
        # 4) 그 외의 모든 일상적인 기본 상황 -> '행복(Happy)' 상태로 판정
        else:
            emotion = "행복"
            emotion_en = "Happy"
            emoji = "😊"
            confidence = 92
            summary = f"{breed} 친구는 현재 매우 긍정적이고 만족스러운 행복감을 느끼고 있는 것으로 분석됩니다."
            cues = [
                {"part": CUE_EYE, "observation": "눈가에 긴장감이 전혀 없고 따뜻하고 부드러운 표정"},
                {"part": CUE_EAR, "observation": "앞으로 편안하게 펼쳐져 친근감과 호의를 표출함"},
                {"part": CUE_MOUTH, "observation": "미소를 짓는 듯 입꼬리가 살짝 올라가며 입이 편안하게 열림"},
                {"part": CUE_BODY, "observation": "온몸에 긴장이 없고 꼬리를 가볍게 흔들며 친밀함을 나타냄"}
            ]
            recs = [
                "다정한 음성으로 칭찬해 주며 반려견과의 긍정적인 상호작용을 이어가세요.",
                "가벼운 산책이나 후각 활동(노즈워크)으로 행복감을 더욱 증진시켜 주세요.",
                "스킨십을 나누며 교감을 극대화하고 유대감을 강화하세요."
            ]
            precautions = [
                "지속적으로 긍정적인 일상을 유지할 수 있도록 규칙적인 산책과 식사 루틴을 지켜주세요.",
                "반려견의 기분 좋은 시그널을 기록하여 어떤 활동을 가장 선호하는지 파악해보세요."
            ]

        # 응답 정보 출처 텍스트 설정
        source_info = "PawEmotion AI 동물행동학 분석 엔진 (체험/데모 모드)"
        if error_msg:
            # API 키 미입력이나 오류 발생 시 UI에 가이드를 추가 노출시킴
            source_info += " [OpenAI API 연동 안내: 환경변수 OPENAI_API_KEY 설정 시 실시간 Vision 분석 활성화]"

        # 최종 프론트엔드로 전달할 표준화된 데이터 구조 반환
        return {
            "emotion": emotion,
            "emotion_en": emotion_en,
            "emoji": emoji,
            "confidence": confidence,
            "summary": summary,
            "cues": cues,
            "recommendations": recs,
            "precautions": precautions,
            "source": source_info,
            "meta": {
                "breed": breed,
                "age": age,
                "situation": situation
            }
        }

    # 성공적인 JSON 응답 전송 도우미 메서드 (200 OK 상태 코드 전달)
    def _send_json_success(self, data):
        self.send_response(200) # 응답 성공 상태 지정
        self._send_cors_headers() # CORS 활성화 헤더 세팅
        self.send_header('Content-Type', JSON_CONTENT_TYPE) # MIME 타입 설정
        self.end_headers() # 헤더 전송 마무리
        # 데이터 본문을 JSON 직렬화하여 클라이언트에 송신
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    # 실패(에러) 상태 응답 전송 도우미 메서드
    def _send_json_error(self, status_code, message):
        self.send_response(status_code) # 전달된 에러 코드 지정 (예: 400, 500)
        self._send_cors_headers()
        self.send_header('Content-Type', JSON_CONTENT_TYPE)
        self.end_headers()
        # 에러 정보를 포함하는 표준 응답 구조 생성
        error_payload = {
            "error": True,
            "status": status_code,
            "message": message
        }
        self.wfile.write(json.dumps(error_payload, ensure_ascii=False).encode('utf-8'))
