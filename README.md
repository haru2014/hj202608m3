# 🐾 PawEmotion AI - 반려견 사진 기반 AI 감정 분석 웹 서비스

> **사진 한 장으로 읽는 우리 아이의 마음!**  
> **PawEmotion AI**는 반려견의 표정과 신체 언어(눈, 귀, 입, 자세)를 멀티모달 비전 AI로 정밀 분석하여 현재 감정 상태를 진단하고, 보호자에게 동물행동학 기반 맞춤형 행동 가이드를 처방해 주는 AI 웹 서비스입니다.

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-black?style=flat&logo=vercel)](https://hj202608m3.vercel.app)
[![Tech Stack](https://img.shields.io/badge/Stack-Vanilla%20HTML%2FCSS%2FJS-orange)](#-기술-스택-tech-stack)
[![Backend](https://img.shields.io/badge/Backend-Python%20Serverless-blue?logo=python)](#-기술-스택-tech-stack)
[![AI Model](https://img.shields.io/badge/AI-OpenAI%20Vision%20API-green?logo=openai)](#-기술-스택-tech-stack)

---

## 📌 목차 (Table of Contents)
1. [서비스 소개 (Service Overview)](#-서비스-소개-service-overview)
2. [주요 기능 및 특징 (Key Features)](#-주요-기능-및-특징-key-features)
3. [배포 URL 및 데모 (Live Demo)](#-배포-url-및-데모-live-demo)
4. [기술 스택 (Tech Stack)](#-기술-스택-tech-stack)
5. [프로젝트 디렉토리 구조 (Directory Structure)](#-프로젝트-디렉토리-구조-directory-structure)
6. [로컬 실행 방법 (Local Development)](#-로컬-실행-방법-local-development)
7. [Vercel 배포 및 환경 변수 설정 (Deployment & Env)](#-vercel-배포-및-환경-변수-설정-deployment--env)
8. [API 명세서 (API Specification)](#-api-명세서-api-specification)
9. [오류 및 예외 처리 기준 (Error Handling)](#-오류-및-예외-처리-기준-error-handling)
10. [서비스 기획 요약 (Service Planning)](#-서비스-기획-요약-service-planning)
11. [최근 작업 내역 (Recent Updates)](#-최근-작업-내역-recent-updates)

---

## 🌟 1. 서비스 소개 (Service Overview)

### 기획 배경 & 문제 정의
- 반려견은 말을 하지 못하기 때문에 눈빛, 귀의 각도, 입 모양, 자세 등 **카밍 시그널(Calming Signals)**을 통해 끊임없이 자신의 감정을 표현합니다.
- 그러나 많은 보호자들은 이러한 미세한 신체 신호를 정확히 해석하기 어려워하며, 반려견이 느끼는 스트레스나 불안을 제때 알아차리지 못하는 경우가 많습니다.
- **PawEmotion AI**는 반려견의 사진과 간단한 상황 정보(품종, 나이, 환경)를 입력받아, **AI Vision 기술과 동물행동학(Canine Ethology) 이론**을 접목해 반려견의 감정을 분석하고 즉시 실천 가능한 행동 처방을 제공합니다.

---

## 🚀 2. 주요 기능 및 특징 (Key Features)

- **📸 멀티모달 비전 AI 감정 분석**: 사진 속 반려견의 4대 관찰 포인트(눈, 귀, 입/혀, 신체 자세)를 정밀 분석하여 6대 감정(행복, 편안함, 놀이, 불안, 경계, 두려움) 및 신뢰도(%) 도출.
- **💡 1-Click 샘플 프리셋 체험**: 실제 고화질 반려견 샘플 사진 3종(골든 리트리버, 시바견, 말티즈)을 원클릭으로 로드하여 사진 파일 없이도 즉시 테스트 가능.
- **📋 맞춤형 보호자 행동 가이드**: 감정 상태에 맞추어 즉시 실천할 수 있는 행동 체크리스트 및 스트레스 예방 주의사항 제공.
- **📚 6대 감정 도감 & 필터**: 긍정적 감정과 주의/스트레스 신호를 분류하여 학습할 수 있는 인터랙티브 감정 도감.
- **💾 LocalStorage 분석 이력 관리**: 브라우저 로컬 저장소를 활용하여 최근 10건의 감정 분석 기록을 안전하게 보관/조회/삭제 가능.
- **🌓 다크 모드 / 라이트 모드**: 사용자의 환경과 취향에 맞춘 현대적인 테마 전환 시스템.
- **📱 100% 모바일 반응형**: 데스크톱, 태블릿, 모바일 기기 완벽 대응.
- **📋 결과 복사 및 공유**: 분석 결과를 원클릭으로 클립보드에 복사하여 지인과 공유.

---

## 🌐 3. 배포 URL 및 데모 (Live Demo)

- **Vercel 프로덕션 배포 주소**: `https://hj202608m3.vercel.app` *(또는 사용자의 Vercel 배포 URL)*
- **GitHub 저장소**: `https://github.com/haru2014/hj202608m3`

---

## 🛠️ 4. 기술 스택 (Tech Stack)

| 구분 | 기술 / 도구 | 상세 설명 |
| :--- | :--- | :--- |
| **Frontend** | **Vanilla HTML5, CSS3, JavaScript (ES6+)** | 프레임워크(React/Vue 등) 없이 순수 바닐라 웹 표준 기술로 구현 |
| **Styling** | **Vanilla CSS (Design Tokens, Glassmorphism)** | CSS 변수 기반 다크/라이트 테마, 반응형 미디어 쿼리, 부드러운 애니메이션 |
| **Backend** | **Python (Vercel Serverless Functions)** | `BaseHTTPRequestHandler` 기반 `/api/analyze` 서버리스 엔드포인트 |
| **AI Engine** | **OpenAI GPT-4o-mini Vision API** | 멀티모달 비전 모델을 통한 사진 및 신체 언어 분석, 구조화된 JSON 출력 |
| **Deployment** | **Vercel + GitHub Actions** | Git Push 시 자동 빌드 및 글로벌 CDN 서버리스 배포 |

---

## 📂 5. 프로젝트 디렉토리 구조 (Directory Structure)

```text
hj202608m3/
├── index.html              # 시맨틱 마크업, 5대 섹션, 반응형 레이아웃, 모달/토스트
├── css/
│   └── style.css           # 일관된 디자인 시스템, 다크/라이트 테마, 반응형 스타일
├── js/
│   └── main.js            # 이미지 업로드/미리보기, API 비동기 통신, 이력 관리, UI 인터랙션
├── api/
│   └── analyze.py          # Vercel Serverless Python 함수 (OpenAI Vision API 호출 및 예외 처리)
├── images/                 # 고화질 샘플 반려견 사진 에셋 (sample_happy, alert, relaxed)
├── requirements.txt        # Python 백엔드 패키지 종속성 (openai, requests)
├── vercel.json             # Vercel 서버리스 라우팅 및 정적 파일 매핑 설정
├── .gitignore              # 환경변수(.env), 임시파일, 캐시 등 제외 설정
├── README.md               # 프로젝트 종합 안내 문서 (본 파일)
├── 08_m3미션공지.md         # 원본 미션 공지
├── 08_m3미션계획.md         # 원본 미션 수행 계획서
└── 08_m3서비스 기획서.md    # 원본 서비스 기획서
```

---

## 💻 6. 로컬 실행 방법 (Local Development)

### 1) 저장소 복제 (Clone)
```bash
git clone https://github.com/haru2014/hj202608m3.git
cd hj202608m3
```

### 2) 로컬 정적 웹 서버 실행 (Python 내장 모듈 활용)
별도의 복잡한 설치 없이 Python 내장 HTTP 서버로 즉시 프론트엔드를 구동할 수 있습니다:
```bash
python -m http.server 8000
```
브라우저에서 `http://localhost:8000`으로 접속합니다.

> 💡 **참고**: 로컬 정적 서버 환경 또는 API 키가 없을 때도 **클라이언트 자체 내장 스마트 휴리스틱 엔진**이 작동하여 100% 원활하게 테스트할 수 있습니다.

### 3) Vercel CLI를 통한 백엔드 로컬 실행 (선택 사항)
```bash
# Vercel CLI 설치
npm i -g vercel

# 로컬 개발 서버 실행 (API 엔드포인트 포함)
vercel dev
```

---

## ☁️ 7. Vercel 배포 및 환경 변수 설정 (Deployment & Env)

### 1) GitHub 저장소 푸시
```bash
git add .
git commit -m "feat: PawEmotion AI 웹 서비스 완성"
git push origin main
```

### 2) Vercel 프로젝트 생성 및 배포
1. [Vercel 대시보드](https://vercel.com)에 로그인합니다.
2. **Add New...** $\rightarrow$ **Project**를 클릭하고 본인의 GitHub 저장소(`hj202608m3`)를 임포트합니다.
3. Framework Preset은 **Other**로 유지합니다.

### 3) 환경 변수(Environment Variables) 설정
1. Vercel 프로젝트 설정의 **Settings** $\rightarrow$ **Environment Variables** 메뉴로 이동합니다.
2. 아래 환경 변수 중 하나를 추가합니다:
   - **Google Gemini 사용 시 (무료 티어 제공 / 추천)**:
     - **Key**: `GEMINI_API_KEY`
     - **Value**: `AIzaSy...` (Google AI Studio에서 무료 발급)
   - **OpenAI 사용 시**:
     - **Key**: `OPENAI_API_KEY`
     - **Value**: `sk-proj-...`
3. **Save** 후 **Redeploy**를 진행합니다.

> 🔒 **보안 주의사항**: API 키는 절대로 GitHub 저장소의 공개 코드나 `README.md`에 직접 커밋하지 않으며, 오직 Vercel 환경 변수로만 안전하게 관리합니다.

---

## 📡 8. API 명세서 (API Specification)

### 엔드포인트: `POST /api/analyze`

반려견 사진(Base64)과 메타데이터를 전송하여 감정 분석 결과를 반환받습니다.

#### 요청 헤더 (Request Headers)
```http
Content-Type: application/json
```

#### 요청 본문 (Request Body)
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "breed": "골든 리트리버",
  "age": "2살",
  "situation": "거실에서 장난감으로 신나게 놀이 후 휴식 중"
}
```

#### 성공 응답 (Response Body - 200 OK)
```json
{
  "emotion": "행복",
  "emotion_en": "Happy",
  "emoji": "😊",
  "confidence": 92,
  "summary": "골든 리트리버 친구는 현재 매우 편안하고 안정적인 행복감을 느끼고 있는 것으로 분석됩니다.",
  "cues": [
    { "part": "눈", "observation": "눈가에 긴장감이 전혀 없고 따뜻하고 부드러운 표정" },
    { "part": "귀", "observation": "앞으로 편안하게 펼쳐져 친근감과 호의를 표출함" },
    { "part": "입 및 혀", "observation": "미소를 짓는 듯 입꼬리가 살짝 올라가며 입이 편안하게 열림" },
    { "part": "몸 및 자세", "observation": "온몸에 긴장이 없고 꼬리를 가볍게 흔들며 친밀함을 나타냄" }
  ],
  "recommendations": [
    "다정한 음성으로 칭찬해 주며 반려견과의 긍정적인 상호작용을 이어가세요.",
    "가벼운 산책이나 후각 활동(노즈워크)으로 행복감을 더욱 증진시켜 주세요.",
    "스킨십을 나누며 교감을 극대화하고 유대감을 강화하세요."
  ],
  "precautions": [
    "지속적으로 긍정적인 일상을 유지할 수 있도록 규칙적인 루틴을 지켜주세요.",
    "현재의 편안한 휴식을 방해하지 않도록 주변 환경을 차분하게 유지하세요."
  ],
  "source": "OpenAI GPT-4o-mini Vision"
}
```

---

## 🛡️ 9. 오류 및 예외 처리 기준 (Error Handling)

사용자 경험(UX)과 시스템 안정성을 위해 다음과 같은 다단계 예외 처리를 구현하였습니다:

| 예외 상황 | 발생 원인 | 사용자 안내 피드백 (Toast / UI) | 시스템 처리 방식 |
| :--- | :--- | :--- | :--- |
| **사진 미등록** | 사진 업로드 없이 분석 클릭 | `반려견 사진을 먼저 업로드하거나 샘플 사진을 선택해주세요.` | 클라이언트 폼 유효성 검사 차단 & 드롭존 하이라이트 |
| **비지원 파일 형식** | 이미지 외 다른 포맷 파일 드롭 | `JPG, PNG, WEBP 형식의 이미지 파일만 업로드할 수 있습니다.` | 클라이언트 파일 업로드 차단 |
| **파일 용량 초과** | 5MB 초과 이미지 업로드 | `파일 크기는 5MB 이하만 지원됩니다.` | 클라이언트 파일 업로드 차단 |
| **네트워크 지연 / 타임아웃** | 30초 이상 응답 지연 발생 | `AI 분석 중 지연이 발생하여 로컬 분석 모드로 전환합니다.` | `AbortController` 타임아웃 감지 후 안전한 Fallback 전환 |
| **API 키 누락 / 할당량 초과** | OpenAI 쿼터 소진 또는 미설정 | `동물행동학 분석 엔진 (체험/데모 모드)으로 안전하게 전환되었습니다.` | 서비스 중단 없이 스마트 휴리스틱 분석 결과 정상 반환 |

---

## 📋 10. 서비스 기획 요약 (Service Planning)

- **타겟 사용자**:
  - 1차: 반려견의 미세한 감정 신호를 이해하고 올바르게 교감하고 싶은 20~50대 반려견 보호자
  - 2차: 반려견 입양 예정자, 펫시터, 애견 유치원 교사, 훈련사
- **차별점 (Value Proposition)**:
  - 단순 감정 라벨만 붙이는 것이 아닌, **동물행동학적 관찰 근거(눈/귀/입/자세 4개 항목)**와 **보호자가 즉시 따라 할 수 있는 맞춤형 케어 행동 체크리스트**를 함께 제공.
- **면책 조항 (Disclaimer)**:
  - 본 서비스는 수의학적 진료나 전문 행동 교정 치료를 대체하지 않으며, 보호자의 일상적인 이해를 돕는 AI 보조 가이드입니다.

---

## 🛠️ 11. 최근 작업 내역 (Recent Updates)

### 2026-08-16 작업 내역
1. **SonarLint 개발 환경 최적화**:
   - Windows 환경에서 JavaScript/TypeScript 정적 분석이 정상 동작하도록 `.vscode/settings.json` 파일을 작업 영역(Workspace) 수준에서 생성했습니다.
   - 권장 사양에 부합하는 Node.js 실행 파일 경로(`v24.14.0`)를 Windows 경로 백슬래시 이스케이프 규격에 맞추어 `sonarlint.pathToNodeExecutable`에 설정했습니다.
2. **백엔드 소스 코드 상세 한글 주석 작업 (`api/analyze.py`)**:
   - HTTP 통신 핸들러 구조(`BaseHTTPRequestHandler`), CORS 헤더 구성 메커니즘, `.env` 파일 로컬 동적 파싱 로직을 초보자도 쉽게 읽을 수 있도록 친절히 설명했습니다.
   - 외부 라이브러리(`requests` 등) 없이 파이썬 기본 라이브러리인 `urllib.request`만을 이용해 Gemini API에 멀티모달 이미지/텍스트 페이로드를 전송하고 응답을 받는 동작 원리를 기술했습니다.
   - OpenAI SDK GPT-4o-mini Vision 분석 호출 바인딩, 그리고 API 연동 장애 발생 시 작동하는 규칙 기반 대체 엔진(Fallback/Demo) 매커니즘을 상세히 기술했습니다.
3. **프론트엔드 소스 코드 상세 한글 주석 작업 (`js/main.js`)**:
   - 상태 관리 객체(`state`), DOM 엘리먼트 쿼리 역할, 로컬스토리지를 연동한 라이트/다크 테마 기억 기능의 역할을 상세하게 기술했습니다.
   - HTML5 `FileReader` 및 `Canvas` API를 활용하여 유저가 올리거나 사전 등록된 이미지 URL을 비동기적으로 Base64 문자열로 렌더링하고 압축 변환하는 로직을 해설했습니다.
   - 비동기 `fetch` 호출 시 네트워크 장애 및 타임아웃에 대비하기 위해 `AbortController`를 30초 타이머와 함께 바인딩하여 안전하게 Fallback 모드로 스위칭하는 예외 처리 흐름을 설명했습니다.
   - 분석 결과 데이터 가독성 렌더링, LocalStorage를 이용해 최근 10개까지 감정 기록을 안전하게 관리하는 CRUD 기능(개별 삭제, 전체 삭제 포함)을 주석화했습니다.
   - 스크롤을 감지하는 네비게이션 스파이(Scroll Spy), FAQ 아코디언, Toast 알림창 빌더, 그리고 XSS 웹 보안 방어를 위한 HTML 엔티티 치환 헬퍼(`escapeHtml`)의 역할을 구체적으로 명시했습니다.

---

## 👥 팀원 및 저작권 정보
- **프로젝트명**: PawEmotion AI (hj202608m3)
- **개발**: Vanilla Frontend & Vercel Python Serverless
- **라이선스**: MIT License
