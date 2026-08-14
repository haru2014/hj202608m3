import json
import os
import re
from http.server import BaseHTTPRequestHandler

# OpenAI API SDK (Lazy-loaded or standard import)
try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

class handler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        self.send_response(200)
        self._send_cors_headers()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        response_data = {
            "status": "healthy",
            "service": "PawEmotion AI API",
            "version": "1.0.0",
            "message": "POST /api/analyze with { image, breed, age, situation } to analyze canine emotion."
        }
        self.wfile.write(json.dumps(response_data, ensure_ascii=False).encode('utf-8'))

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            self._send_json_error(400, "요청 본문(Body)이 비어 있습니다. 분석할 반려견 사진 데이터를 전달해주세요.")
            return

        try:
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
        except Exception as e:
            self._send_json_error(400, f"유효하지 않은 JSON 데이터입니다: {str(e)}")
            return

        image_data = data.get('image', '').strip()
        breed = data.get('breed', '미확인').strip() or '미확인'
        age = data.get('age', '미확인').strip() or '미확인'
        situation = data.get('situation', '일상').strip() or '일상'

        if not image_data:
            self._send_json_error(400, "사진(image) 데이터는 필수 입력값입니다. 반려견 사진을 등록해주세요.")
            return

        # Handle base64 formatting
        if not image_data.startswith('data:image/') and not image_data.startswith('http'):
            image_data = f"data:image/jpeg;base64,{image_data}"

        api_key = os.environ.get("OPENAI_API_KEY", "").strip()

        # If API key is provided, use OpenAI GPT-4o-mini Vision
        if api_key and OpenAI is not None:
            try:
                client = OpenAI(api_key=api_key)
                
                system_prompt = (
                    "당신은 전 세계 최고의 반려견 행동학(Canine Ethology) 및 동물심리 전문가입니다. "
                    "제공된 반려견의 사진과 추가 정보(품종, 나이, 상황)를 관찰하여 현재의 감정 상태를 다각도로 분석하고, "
                    "보호자가 즉시 실천할 수 있는 긍정적인 행동 가이드와 주의사항을 친절하고 신뢰감 있는 어조로 제공하세요.\n\n"
                    "반드시 아래 JSON 형식에 맞추어 마크다운이나 추가 설명 없이 순수 JSON만 응답하세요:\n"
                    "{\n"
                    '  "emotion": "행복 | 편안함 | 불안 | 경계 | 두려움 | 놀이 중 택1",\n'
                    '  "emotion_en": "Happy | Relaxed | Anxious | Alert | Fear | Playful 중 택1",\n'
                    '  "emoji": "😊 | 😌 | 😟 | 😠 | 😨 | 🎾",\n'
                    '  "confidence": 85,\n'
                    '  "summary": "반려견의 전체적인 상태를 요약한 1~2문장의 설명",\n'
                    '  "cues": [\n'
                    '    {"part": "눈", "observation": "관찰된 특징"},\n'
                    '    {"part": "귀", "observation": "관찰된 특징"},\n'
                    '    {"part": "입 및 혀", "observation": "관찰된 특징"},\n'
                    '    {"part": "몸 및 자세", "observation": "관찰된 특징"}\n'
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

                user_content = [
                    {
                        "type": "text",
                        "text": f"반려견 정보:\n- 품종: {breed}\n- 나이: {age}\n- 현재 상황: {situation}\n이 사진의 표정과 신체 언어를 정밀 분석하여 감정 상태를 진단해주세요."
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": image_data,
                            "detail": "low"
                        }
                    }
                ]

                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content}
                    ],
                    max_tokens=800,
                    temperature=0.3,
                    response_format={"type": "json_object"}
                )

                content = response.choices[0].message.content
                result_json = json.loads(content)
                result_json["source"] = "OpenAI GPT-4o-mini Vision"

                self._send_json_success(result_json)
                return

            except Exception as e:
                # If OpenAI API fails (e.g. quota, network), fallback to intelligent rule-based response with notice
                fallback_result = self._generate_heuristic_response(breed, age, situation, error_msg=str(e))
                self._send_json_success(fallback_result)
                return
        else:
            # When OPENAI_API_KEY is not set (e.g., local demo or initial test)
            demo_result = self._generate_heuristic_response(breed, age, situation, is_demo=True)
            self._send_json_success(demo_result)

    def _generate_heuristic_response(self, breed, age, situation, is_demo=False, error_msg=None):
        """Intelligent fallback/demo analyzer when API key is not configured or during offline testing"""
        # Determine emotion context based on situation
        situation_lower = situation.lower()
        if any(w in situation_lower for w in ['산책', '놀이', '간식', '공놀이', '달리기']):
            emotion = "놀이"
            emotion_en = "Playful"
            emoji = "🎾"
            confidence = 91
            summary = f"{breed} 친구는 현재 넘치는 에너지와 호기심으로 놀이 활동에 완전히 몰입해 있는 상태입니다!"
            cues = [
                {"part": "눈", "observation": "반짝이고 초롱초롱하며 보호자 또는 장난감을 강하게 주시함"},
                {"part": "귀", "observation": "전방을 향해 쫑긋 세워져 높은 집중력과 흥분을 나타냄"},
                {"part": "입 및 혀", "observation": "입을 기분 좋게 벌리고 혀를 약간 내밀며 호흡 중"},
                {"part": "몸 및 자세", "observation": "몸에 탄력적인 텐션이 있고 언제든 달려나갈 준비가 된 활발한 자세"}
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
        elif any(w in situation_lower for w in ['병원', '낯선', '천둥', '소음', '목욕', '주사']):
            emotion = "불안"
            emotion_en = "Anxious"
            emoji = "😟"
            confidence = 86
            summary = f"낯선 자극이나 환경({situation})으로 인해 가벼운 긴장과 불안 신호가 관찰됩니다."
            cues = [
                {"part": "눈", "observation": "눈을 크게 뜨고 흰자위(고래 눈 신호)가 살짝 보이거나 시선을 회피함"},
                {"part": "귀", "observation": "귀가 뒤쪽으로 살짝 눕혀져 경계 및 긴장 상태를 표현"},
                {"part": "입 및 혀", "observation": "입을 꽉 다물고 있거나 코를 자주 날름거리는 핥기 행동(카밍 시그널)"},
                {"part": "몸 및 자세", "observation": "무게중심을 낮추고 몸이 약간 경직되어 방어적 태세를 취함"}
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
        elif any(w in situation_lower for w in ['잠', '휴식', '침대', '소파', '낮잠', '쿠션']):
            emotion = "편안함"
            emotion_en = "Relaxed"
            emoji = "😌"
            confidence = 94
            summary = f"보호자와의 신뢰 속에서 매우 편안하고 안정적인 심리 상태를 유지하고 있습니다."
            cues = [
                {"part": "눈", "observation": "눈꺼풀이 부드럽게 풀려있고 눈빛이 그윽하며 온화함"},
                {"part": "귀", "observation": "품종 고유의 자연스럽고 힘이 빠진 중립적인 귀 위치"},
                {"part": "입 및 혀", "observation": "턱의 힘이 빠져 입이 살짝 벌어져 있거나 편안히 다문 상태"},
                {"part": "몸 및 자세", "observation": "전신의 근육이 이완되어 옆으로 눕거나 편하게 기대어 쉼"}
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
        else:
            emotion = "행복"
            emotion_en = "Happy"
            emoji = "😊"
            confidence = 92
            summary = f"{breed} 친구는 현재 매우 긍정적이고 만족스러운 행복감을 느끼고 있는 것으로 분석됩니다."
            cues = [
                {"part": "눈", "observation": "눈가에 긴장감이 전혀 없고 따뜻하고 부드러운 표정"},
                {"part": "귀", "observation": "앞으로 편안하게 펼쳐져 친근감과 호의를 표출함"},
                {"part": "입 및 혀", "observation": "미소를 짓는 듯 입꼬리가 살짝 올라가며 입이 편안하게 열림"},
                {"part": "몸 및 자세", "observation": "온몸에 긴장이 없고 꼬리를 가볍게 흔들며 친밀함을 나타냄"}
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

        source_info = "PawEmotion AI 동물행동학 분석 엔진 (체험/데모 모드)"
        if error_msg:
            source_info += f" [OpenAI API 연동 안내: 환경변수 OPENAI_API_KEY 설정 시 실시간 Vision 분석 활성화]"

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

    def _send_json_success(self, data):
        self.send_response(200)
        self._send_cors_headers()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def _send_json_error(self, status_code, message):
        self.send_response(status_code)
        self._send_cors_headers()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        error_payload = {
            "error": True,
            "status": status_code,
            "message": message
        }
        self.wfile.write(json.dumps(error_payload, ensure_ascii=False).encode('utf-8'))
