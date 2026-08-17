/**
 * ==============================================================================
 * PawEmotion AI - 프론트엔드 메인 실행 로직 (Javascript)
 * ==============================================================================
 * 기능 정의: 이미지 파일 인코딩(Base64), 서버 API 비동기 연동(fetch), 다크 모드, 
 *          로컬스토리지 기반 이전 분석 기록 영구 저장, 토스트 알림 메시지 출력 등.
 */

// document.addEventListener('DOMContentLoaded', ...):
// 웹 브라우저가 HTML 코드를 위에서부터 아래로 다 해석하여 화면의 뼈대(DOM)를 온전히 완성했을 때 비로소 실행되도록 하는 안전 장치입니다.
// 이렇게 감싸주어야만 HTML 태그가 브라우저 메모리에 올라오기도 전에 JS가 실행되어 오류가 나는 현상을 방지합니다.
document.addEventListener('DOMContentLoaded', () => {
  
  // ==========================================================================
  // 1. 전역 상태 관리 객체 (State Management)
  // ==========================================================================
  // 웹사이트가 켜져 있는 동안 수시로 변경되는 실시간 변수나 임시 데이터들을 한곳에 묶어서 관리하는 곳입니다.
  const state = {
    selectedImageData: null, // 사용자가 드롭하거나 선택한 이미지 파일의 Base64(텍스트 형태) 데이터 스트링
    selectedImageName: '',    // 선택한 이미지의 파일 이름
    isAnalyzing: false,       // 현재 AI 분석 통신이 실행 중인지 나타내는 상태 변수 (중복 분석 버튼 클릭 방지용)
    // 로컬 스토리지에 저장되어 있는 최근 기록을 문자열에서 배열로 역직렬화(JSON.parse)해 가져옵니다. 기록이 없으면 빈 배열([])로 셋팅합니다.
    history: JSON.parse(localStorage.getItem('pawemotion_history') || '[]')
  };

  // ==========================================================================
  // 2. DOM 요소 선택 (DOM Elements Selection)
  // ==========================================================================
  // HTML 코드에 적혀 있는 고유 ID나 Class 값을 기준으로 자바스크립트 변수로 지정하여, 동적 제어가 가능하도록 만듭니다.

  // [테마 모드 및 상단 메뉴 관련 태그들]
  const themeToggleBtn = document.getElementById('themeToggleBtn'); // 다크모드 변환 토글 버튼
  const themeIcon = document.getElementById('themeIcon');           // 버튼 내 🌙/☀️ 아이콘 표시 태그
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');   // 모바일 화면용 햄버거(☰) 메뉴 버튼
  const navMenu = document.getElementById('navMenu');               // 네비게이션 메뉴 컨테이너
  const navLinks = document.querySelectorAll('.nav-link');          // 모든 네비게이션 메뉴 링크들 (배열 형태)

  // [이미지 수집 및 미리보기 관련 태그들]
  const dropzone = document.getElementById('dropzone');                     // 사진 드래그&드롭 및 파일 로드 영역
  const fileInput = document.getElementById('fileInput');                   // 화면에는 숨겨놓은 실제 파일 선택 창(<input type="file">)
  const previewContainer = document.getElementById('previewContainer');     // 업로드 완료된 프리뷰 이미지 틀
  const previewImage = document.getElementById('previewImage');             // 미리보기 화면의 <img> 태그
  const btnRemoveImage = document.getElementById('btnRemoveImage');         // 프리뷰 우측 상단 ✕ 이미지 삭제 버튼
  const sampleBtns = document.querySelectorAll('.sample-btn');              // 미리 준비된 견종별 샘플 버튼 리스트

  // [입력 폼 메타데이터 관련 태그들]
  const dogBreedInput = document.getElementById('dogBreed');                // 견종 텍스트 인풋창
  const dogAgeInput = document.getElementById('dogAge');                    // 나이 텍스트 인풋창
  const dogSituationInput = document.getElementById('dogSituation');        // 상황 텍스트 인풋창
  const chipBtns = document.querySelectorAll('.chip-btn');                  // 간편 상황 기입용 해시태그 칩 버튼 목록
  const btnAnalyze = document.getElementById('btnAnalyze');                 // AI 분석 시작 버튼

  // [분석 결과 패널 상태 관리 태그들]
  const resultPlaceholder = document.getElementById('resultPlaceholder');   // 사진을 넣기 전 기본 노출 화면
  const loadingState = document.getElementById('loadingState');             // AI 분석 통신 대기용 로딩 스피너 박스
  const resultContent = document.getElementById('resultContent');           // 분석 완료 시 활성화되는 결과 정보 패널
  const resultCard = document.getElementById('resultCard');                 // 결과창 전체 카드 영역

  // [상세 결과 데이터 인젝션 타깃 태그들]
  const resEmoji = document.getElementById('resEmoji');                     // 감정 대표 이모지 표시
  const resEmotion = document.getElementById('resEmotion');                 // 분석된 감정 한글 이름
  const resEmotionEn = document.getElementById('resEmotionEn');             // 감정 영어 이름
  const resConfidence = document.getElementById('resConfidence');           // 신뢰도 점수 텍스트
  const resConfidenceBar = document.getElementById('resConfidenceBar');     // 신뢰도 게이지 바 내부 채우기막대
  const resSummary = document.getElementById('resSummary');                 // AI 감정 진단 한줄 총평
  const resCuesGrid = document.getElementById('resCuesGrid');               // 신체 4개 부위별 분석 내용 삽입 공간
  const resRecommendations = document.getElementById('resRecommendations'); // 보호자 추천 가이드 목록 타겟
  const resPrecautions = document.getElementById('resPrecautions');         // 주의사항 목록 타겟
  const resSourceInfo = document.getElementById('resSourceInfo');           // 구동된 AI 엔진 출처 표시판

  // [기록 및 추가 액션 관련 태그들]
  const btnCopyResult = document.getElementById('btnCopyResult');           // 결과 요약 텍스트 클립보드 복사 버튼
  const btnReset = document.getElementById('btnReset');                     // 결과 초기화(새로 시작) 버튼
  const historyGrid = document.getElementById('historyGrid');               // 이력 카드 목록 그리드 컨테이너
  const historyCount = document.getElementById('historyCount');             // 이력 건수 표시 텍스트
  const btnClearHistory = document.getElementById('btnClearHistory');       // 이력 전체 영구 삭제 버튼

  // 가장 마지막으로 성공한 AI 결과 데이터를 메모리에 잡아둘 변수
  let latestAnalysisResult = null;

  // ==========================================================================
  // 3. 다크/라이트 테마 제어 (Theme Mode Controller)
  // ==========================================================================
  // 사용자의 이전 다크모드 선택 정보를 로컬 브라우저 저장소에서 읽어와 적용합니다.
  const initTheme = () => {
    // 저장된 테마 상태가 없으면 기본으로 'light'(라이트 모드)를 사용합니다.
    const savedTheme = localStorage.getItem('pawemotion_theme') || 'light';
    // html 태그에 data-theme="dark" 형식으로 속성을 추가해 CSS의 색상 변수(:root)들이 반응하게 만듭니다.
    document.documentElement.dataset.theme = savedTheme;
    // 테마에 알맞은 해/달 이모티콘을 매핑합니다.
    themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
  };

  // 상단 테마 전환 버튼 클릭 시의 동작 설정
  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.dataset.theme;
    // 현재 모드와 상반되는 테마로 스위칭합니다.
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = newTheme;
    // 브라우저 캐시(LocalStorage)에 기록하여 페이지를 새로고침하거나 재방문해도 상태가 복원되도록 합니다.
    localStorage.setItem('pawemotion_theme', newTheme);
    themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    // 화면에 성공 알림 메시지 팝업을 출력합니다.
    showToast(`${newTheme === 'dark' ? '다크' : '라이트'} 모드로 전환되었습니다.`, 'info');
  });

  // 페이지 실행 직후 초기 테마 실행 함수 작동
  initTheme();

  // ==========================================================================
  // 4. 네비게이션 및 모바일 전용 햄버거 메뉴 작동 설정
  // ==========================================================================
  // 화면 너비가 좁아졌을 때 모바일 메뉴 버튼(☰)을 누르면 상단 메뉴 바가 아래로 슬라이딩되어 노출됩니다.
  mobileMenuBtn.addEventListener('click', () => {
    navMenu.classList.toggle('show');
    // 펼쳐졌을 경우 아이콘을 닫기 마크(✕)로 변환하고, 닫히면 다시 햄버거(☰)로 복원합니다.
    mobileMenuBtn.textContent = navMenu.classList.contains('show') ? '✕' : '☰';
  });

  // 메뉴 리스트 내 항목을 누르면 모바일 슬라이딩 바를 닫아주고 활성화 하이라이트(active) 클래스를 변경합니다.
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('show');
      mobileMenuBtn.textContent = '☰';
      // 모든 메뉴의 active 표시를 해제하고, 내가 누른 탭에만 active 줄을 긋습니다.
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });

  // [Scroll Spy 기능 정의]
  // 마우스로 페이지를 위아래로 스크롤할 때, 현재 눈앞에 보고 있는 섹션 위치를 실시간 감지하여
  // 상단 내비게이션 활성화 탭을 자동으로 그 위치에 맞추어 이동시켜 줍니다.
  window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section');
    const scrollPos = window.scrollY + 120; // 120px 정도의 상단 메뉴 여유분을 계산에 더해 반응 속도를 최적화합니다.

    sections.forEach(section => {
      const top = section.offsetTop; // 섹션의 시작 Y축 높이값
      const height = section.offsetHeight; // 섹션 전체 세로 길이
      const id = section.getAttribute('id'); // 섹션 고유 ID

      // 내 화면의 중심 스크롤 높이가 섹션 범위 내에 속해 있을 때
      if (scrollPos >= top && scrollPos < top + height) {
        navLinks.forEach(l => {
          l.classList.remove('active');
          if (l.getAttribute('href') === `#${id}`) {
            l.classList.add('active');
          }
        });
      }
    });
  });

  // ==========================================================================
  // 5. 사진 업로드 및 드래그 앤 드롭 제어 (File Drag & Drop)
  // ==========================================================================
  
  // 점선 상자(Dropzone)를 클릭하면 숨겨놓은 진짜 파일 선택 인풋창(fileInput)이 대신 클릭되어 
  // 내 컴퓨터의 사진 탐색기 창이 켜지도록 설계했습니다.
  dropzone.addEventListener('click', () => fileInput.click());

  // [드래그 앤 드롭 기본 브라우저 버그 방어 조치]
  // 브라우저에 마우스로 사진을 드래그해서 올려두었을 때, 브라우저가 화면 전체를 사진 뷰어로 열어버리는
  // 귀찮은 기본 속성을 예방(preventDefault)하고, 점선 상자 위에 닿았을 때 하이라이트 CSS 스타일 테두리(.dragover)를 활성화합니다.
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    });
  });

  // 드래그하던 마우스 포인터가 영역 바깥으로 벗어났을 때 테두리 하이라이트 스타일을 다시 해제합니다.
  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    });
  });

  // 점선 박스 위에 마우스로 사진을 떨어뜨렸을(Drop) 때 동작
  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      handleFile(files[0]); // 첫 번째로 감지된 파일을 넘겨 유효성 검사 진행
    }
  });

  // 파일 탐색기를 통해 사진 파일을 정상 클릭해서 열었을 때 감지하여 처리
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  // [업로드 파일 크기 및 포맷 검증과 로딩 비동기 함수]
  const handleFile = (file) => {
    // 1) 비정상 파일(텍스트 파일 등) 차단
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('JPG, PNG, WEBP 형식의 이미지 파일만 업로드할 수 있습니다.', 'error');
      return;
    }

    // 2) 고용량 파일 차단 (서버 메모리 과부하 및 타임아웃 예방을 위해 5MB 이하만 허가)
    if (file.size > 5 * 1024 * 1024) {
      showToast('파일 크기는 5MB 이하만 지원됩니다.', 'error');
      return;
    }

    // 3) HTML5 FileReader 비동기 로더 객체 생성
    // 컴퓨터의 무거운 물리 파일을 읽는 동안 자바스크립트가 일시 중단되지 않도록 백그라운드 스레드에서 비동기로 파일 읽기를 조율합니다.
    const reader = new FileReader();
    
    // 파일 읽기 처리가 100% 완료되었을 때 실행할 콜백 리스너(onload) 정의
    reader.onload = (e) => {
      state.selectedImageData = e.target.result; // 변환 완료된 이미지의 Base64(텍스트 이미지 데이터) 저장
      state.selectedImageName = file.name;
      
      displayImagePreview(state.selectedImageData); // 이미지 프리뷰 활성화
      
      // 사진이 완전히 바뀌었으므로 기존에 눌려 있던 샘플 강아지 버튼이나 메타 입력 정보들을 말끔히 비워 폼을 초기화합니다.
      sampleBtns.forEach(b => b.classList.remove('selected'));
      chipBtns.forEach(c => c.classList.remove('active'));
      dogBreedInput.value = '';
      dogAgeInput.value = '';
      dogSituationInput.value = '';
      
      showToast('사진이 등록되었습니다. 추가 정보를 확인하고 분석을 시작하세요!', 'success');
    };
    // 이미지를 Base64 데이터 스트링 포맷(data:image/jpeg;base64,...)으로 변환해 읽기를 지시합니다.
    reader.readAsDataURL(file);
  };

  // 점선 상자를 가려주고, 실제 가져온 이미지를 프리뷰 틀 안에 밀어 넣어 화면에 표시합니다.
  const displayImagePreview = (src) => {
    previewImage.src = src;
    previewContainer.style.display = 'block';
    dropzone.style.display = 'none';
  };

  // 등록된 프리뷰 사진 우측 상단 ✕ 버튼 클릭 시 입력 폼 초기화 동작
  btnRemoveImage.addEventListener('click', (e) => {
    // e.stopPropagation(): 지우기 버튼을 누르는 순간 
    // 부모 격인 Dropzone 클릭 이벤트가 함께 중복 실행되어 파일 탐색기가 다시 열리는 전파 버그를 차단합니다.
    e.stopPropagation();
    state.selectedImageData = null;
    state.selectedImageName = '';
    fileInput.value = ''; // 내부 input 캐시 삭제
    previewContainer.style.display = 'none';
    dropzone.style.display = 'block';
    sampleBtns.forEach(b => b.classList.remove('selected'));
    showToast('사진이 제거되었습니다.', 'info');
  });

  // ==========================================================================
  // 6. 원클릭 샘플 강아지 사전 입력 템플릿 (Sample presets auto-fill)
  // ==========================================================================
  const samplePresets = {
    happy: {
      image: 'images/sample_happy.jpg',
      breed: '골든 리트리버',
      age: '2살',
      situation: '거실에서 장난감으로 신나게 놀이 후 휴식 중 🎾'
    },
    alert: {
      image: 'images/sample_alert.jpg',
      breed: '시바견',
      age: '3살',
      situation: '산책 중 낯선 사람과 다른 반려견을 발견하고 주시 중 🦮'
    },
    relaxed: {
      image: 'images/sample_relaxed.jpg',
      breed: '말티즈',
      age: '4살',
      situation: '포근한 극세사 러그 위에서 편안하게 휴식 및 낮잠 중 🛋️'
    }
  };

  // 각각의 샘플 버튼을 눌렀을 때, 외부 서버 파일 경로로부터 이미지를 가상 캔버스로 읽어들여 
  // Base64 포맷으로 자동 변환해 인코딩하고, 견종/나이/상황을 한 번에 자동으로 써주는 편리한 폼 입력 매핑 로직입니다.
  sampleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.sample;
      const preset = samplePresets[type];
      if (!preset) return;

      sampleBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected'); // 선택된 버튼 테두리 강조 CSS 적용

      // 외부 이미지를 자바스크립트 내 가상 이미지 객체로 메모리에 생성
      const img = new Image();
      // crossOrigin: 외부 호스트 이미지 자원에 CORS 우회 허용 정책을 맵핑하여 보안 오류를 방지합니다.
      img.crossOrigin = 'Anonymous';
      
      // 이미지 전송 로드가 끝났을 때의 동작 지정
      img.onload = () => {
        // 화면에는 그리지 않는 가상의 HTML5 Canvas(도화지)를 동적으로 생성합니다.
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        // 가상 도화지 위에 이미지를 그대로 1:1 복사해서 복제하여 그려 넣습니다.
        ctx.drawImage(img, 0, 0);
        // 그려진 도화지 전체 픽셀 정보를 85% 압축률을 적용한 JPEG Base64 문자열로 최종 인코딩하여 출력합니다.
        state.selectedImageData = canvas.toDataURL('image/jpeg', 0.85);
        state.selectedImageName = `${preset.breed} (샘플)`;
        displayImagePreview(state.selectedImageData); // 프리뷰 출력
      };
      // 이미지 소스 주소를 연결하여 이미지를 다운로드 받아오도록 방아쇠(Trigger)를 당깁니다.
      img.src = preset.image;

      // 텍스트 인풋창에 견종, 나이, 상황 문구를 자동 세팅합니다.
      dogBreedInput.value = preset.breed;
      dogAgeInput.value = preset.age;
      dogSituationInput.value = preset.situation;

      showToast(`'${preset.breed}' 샘플 데이터가 로드되었습니다.`, 'success');
    });
  });

  // 상황 해시태그 칩 버튼을 눌렀을 때의 동작 설정
  chipBtns.forEach(chip => {
    chip.addEventListener('click', () => {
      // 칩에 등록된 상황 문구를 상황설명 입력창에 그대로 주입합니다.
      dogSituationInput.value = chip.dataset.situation;
      chipBtns.forEach(c => c.classList.remove('active'));
      chip.classList.add('active'); // 선택 하이라이트 색상 부여
    });
  });

  // ==========================================================================
  // 7. AI 분석 실행 처리 (API Async Interaction)
  // ==========================================================================
  
  // '분석 시작하기' 버튼을 눌렀을 때 실행되는 핵심 비동기 메인 연동 함수입니다.
  btnAnalyze.addEventListener('click', async () => {
    // 중복 연산 방지: 현재 AI 호출 작업이 진행 중이면, 사용자가 마우스 클릭을 난타하더라도 중복 호출을 즉각 차단합니다.
    if (state.isAnalyzing) return;

    // 예외 검증: 사용자가 사진을 아직 등록하지 않은 경우 알림을 주고 해당 위치로 스크롤링합니다.
    if (!state.selectedImageData) {
      showToast('반려견 사진을 먼저 업로드하거나 샘플 사진을 선택해주세요.', 'warning');
      dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' }); // 부드러운 스크롤 작동
      dropzone.classList.add('dragover'); // 테두리 흔들기 효과 유도
      setTimeout(() => dropzone.classList.remove('dragover'), 1000);
      return;
    }

    // 입력 창의 내용에서 좌우 빈 칸을 다 깎아내고 변수에 매핑합니다.
    const breed = dogBreedInput.value.trim() || '미확인 품종';
    const age = dogAgeInput.value.trim() || '미확인';
    const situation = dogSituationInput.value.trim() || '일상 상태';

    // 로딩 패널 활성화 (로딩 스피너 작동)
    setLoadingState(true);

    // 백엔드 API에 넘겨줄 표준 규격 데이터 가방(JSON Body Payload) 빌드
    const payload = {
      image: state.selectedImageData, // 이미지 Base64 텍스트
      breed: breed,
      age: age,
      situation: situation
    };

    try {
      // [보안 및 예외 예방: 30초 무응답 강제 강제 종료 처리 (AbortController)]
      // 서버 장애나 와이파이 단절 등으로 요청이 무한 대기에 빠질 때, 브라우저 소켓을 30초 후 안전 강제 중지시키는 컨트롤러입니다.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30초 제한 시간 가동

      let response;
      let data;

      try {
        // 비동기 fetch API를 통해 서버리스 API 엔드포인트('/api/analyze')에 HTTP POST 요청 송신
        response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload), // JSON 규격 문자열로 직렬화하여 패키징
          signal: controller.signal // Abort 신호 등록
        });

        // 응답이 정상 시점에 도착하면 앞서 세팅해 둔 30초 폭탄 타이머를 해제합니다.
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`API 응답 오류 (상태 코드: ${response.status})`);
        }

        // 응답 본문 텍스트를 JSON 형태의 객체로 비동기 파싱
        data = await response.json();
      } catch (fetchErr) {
        console.error('Backend API connection failed:', fetchErr);
        
        // 에러 원인을 파악하여 유저 친화적인 해설 메시지로 필터링하여 사용자에게 보여줍니다.
        let errorMsg = 'AI API 서버에 연결할 수 없습니다.';
        if (fetchErr.name === 'AbortError') {
          errorMsg = 'AI 분석 요청이 시간 초과(30초)되었습니다. 네트워크 연결을 확인하고 다시 시도해주세요.';
        } else if (!navigator.onLine) {
          errorMsg = '인터넷 연결이 끊어져 있습니다. 네트워크 연결을 확인해주세요.';
        } else {
          errorMsg = 'AI API 서버에 연결할 수 없습니다. 잠시 후 다시 시도하거나, 배포 환경의 API 설정을 확인해주세요.';
        }
        throw new Error(errorMsg);
      }

      // 받아온 결과 객체를 임시 보관함에 기록
      latestAnalysisResult = data;
      // 화면에 AI 결과 컴포넌트를 그리고 수치 매핑 실행
      renderAnalysisResult(data);
      // 로컬스토리지 디스크에 분석 로그 누적 영구 저장 (최대 10개)
      saveToHistory(data, state.selectedImageData);
      showToast('AI 감정 분석이 성공적으로 완료되었습니다!', 'success');

    } catch (err) {
      console.error('Analysis error:', err);
      showToast(`분석 중 오류가 발생했습니다: ${err.message}`, 'error');
      setLoadingState(false);
      resultPlaceholder.style.display = 'block'; // 실패 시 대기 대화상자로 복귀
    } finally {
      // 로딩 상태 비활성화
      setLoadingState(false);
    }
  });

  // 로딩 화면의 노출 여부와 버튼 작동 비활성화를 실시간 세팅하는 함수
  const setLoadingState = (isLoading) => {
    state.isAnalyzing = isLoading;
    btnAnalyze.disabled = isLoading; // 진행 중엔 버튼 클릭 차단
    btnAnalyze.innerHTML = isLoading
      ? `<span>⏳ AI 심층 분석 중...</span>`
      : `<span>🔍 AI 감정 분석 시작하기</span>`;

    if (isLoading) {
      resultPlaceholder.style.display = 'none';
      resultContent.style.display = 'none';
      loadingState.style.display = 'block'; // 로딩 기어 활성화
      // 분석 결과 표시판 쪽으로 화면 스크롤을 부드럽게 가져갑니다.
      resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      loadingState.style.display = 'none';
    }
  };

  // ==========================================================================
  // 8. 분석 결과 렌더링 및 UI 매핑 (Render Analysis Result)
  // ==========================================================================
  const renderAnalysisResult = (data) => {
    resultPlaceholder.style.display = 'none';
    loadingState.style.display = 'none';
    resultContent.style.display = 'block'; // 결과창 활성화

    // 1) 기본 텍스트 및 이모지 매핑
    resEmoji.textContent = data.emoji || '😊';
    resEmotion.textContent = data.emotion || '행복';
    resEmotionEn.textContent = data.emotion_en || 'HAPPY';
    resConfidence.textContent = `${data.confidence || 90}%`;
    resSummary.textContent = `"${data.summary || '반려견의 긍정적인 신체 언어가 관찰되었습니다.'}"`;

    // 2) 신뢰도 게이지 애니메이션 효과 부여
    // 0%에서 시작해서 서서히 끝 수치로 게이지 막대가 올라가 눈을 즐겁게 하는 시각 효과입니다.
    resConfidenceBar.style.width = '0%';
    setTimeout(() => {
      resConfidenceBar.style.width = `${data.confidence || 90}%`;
    }, 100);

    // 3) 눈, 귀, 입, 자세 4개 파트의 카밍 시그널(Cues) 렌더링
    resCuesGrid.innerHTML = ''; // 기존에 그려진 그리드 청소
    if (data.cues && Array.isArray(data.cues)) {
      data.cues.forEach(cue => {
        const cueCard = document.createElement('div');
        cueCard.className = 'cue-card';
        // escapeHtml: XSS 스크립트 해킹 공격 방어
        cueCard.innerHTML = `
          <div class="cue-title">
            <span>🔎</span> ${escapeHtml(cue.part)}
          </div>
          <div class="cue-desc">${escapeHtml(cue.observation)}</div>
        `;
        resCuesGrid.appendChild(cueCard);
      });
    }

    // 4) 추천 조치 사항 렌더링
    resRecommendations.innerHTML = '';
    if (data.recommendations && Array.isArray(data.recommendations)) {
      data.recommendations.forEach(rec => {
        const li = document.createElement('li');
        li.className = 'action-item';
        li.innerHTML = `<span class="check-icon">✓</span> <span>${escapeHtml(rec)}</span>`;
        resRecommendations.appendChild(li);
      });
    }

    // 5) 주의 예방 조치 사항 렌더링
    resPrecautions.innerHTML = '';
    if (data.precautions && Array.isArray(data.precautions)) {
      data.precautions.forEach(prec => {
        const li = document.createElement('li');
        li.className = 'precaution-item';
        li.innerHTML = `<span class="warn-icon">⚠️</span> <span>${escapeHtml(prec)}</span>`;
        resPrecautions.appendChild(li);
      });
    }

    // 6) AI 소스 출처 라벨링
    resSourceInfo.textContent = data.source ? `분석 출처: ${data.source}` : 'PawEmotion AI 동물행동학 분석 모델';
  };

  // ==========================================================================
  // 9. 결과 요약 텍스트 클립보드 복사 (Copy Result Utility)
  // ==========================================================================
  btnCopyResult.addEventListener('click', () => {
    if (!latestAnalysisResult) return;

    // 카카오톡이나 인스타그램 공유 시 가시성 높게 읽히도록 긴 글 요약 빌드
    const text = `[PawEmotion AI 분석 결과]
🐾 반려견: ${dogBreedInput.value || '반려견'} (${dogAgeInput.value || '나이 미지정'})
✨ 감정 상태: ${latestAnalysisResult.emoji} ${latestAnalysisResult.emotion} (${latestAnalysisResult.confidence}% 신뢰도)
📝 요약: ${latestAnalysisResult.summary}

💡 권장 행동:
${(latestAnalysisResult.recommendations || []).map(r => '- ' + r).join('\n')}

⚠️ 주의사항:
${(latestAnalysisResult.precautions || []).map(p => '- ' + p).join('\n')}

서비스 링크: https://hj202608m3-1-mtbbcbty8-haru2014s-projects.vercel.app`;

    // 최신 웹 브라우저가 지원하는 navigator.clipboard API를 이용해 클립보드에 주입
    navigator.clipboard.writeText(text).then(() => {
      showToast('분석 결과 요약이 클립보드에 복사되었습니다! 📋', 'success');
    }).catch(() => {
      showToast('클립보드 복사에 실패했습니다.', 'error');
    });
  });

  // ==========================================================================
  // 10. 스튜디오 초기화 버튼 작동 (Reset UI)
  // ==========================================================================
  btnReset.addEventListener('click', () => {
    btnRemoveImage.click(); // 이미지 삭제 내부 작동 트리거
    dogBreedInput.value = '';
    dogAgeInput.value = '';
    dogSituationInput.value = '집에서 휴식 중';
    chipBtns.forEach(c => c.classList.remove('active'));
    resultContent.style.display = 'none'; // 결과 출력창 숨김
    resultPlaceholder.style.display = 'block'; // 분석 대기 패널로 롤백
    showToast('새로운 사진을 등록해 주세요.', 'info');
    dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' }); // 다시 입력 섹션으로 자동 스크롤
  });

  // ==========================================================================
  // 11. 로컬 저장소 이력 기록 및 렌더링 (LocalStorage History Manager)
  // ==========================================================================
  
  // 브라우저 캐시에 새로운 분석 로그를 밀어 넣고 10개 제한을 조율합니다.
  const saveToHistory = (result, imageData) => {
    const item = {
      id: Date.now(), // 고유 식별키 구분을 위한 타임스탬프
      // 로컬 화면에 가독성 높게 표시할 한글 형식 날짜 텍스트 가공
      date: new Date().toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      emotion: result.emotion,
      emoji: result.emoji,
      confidence: result.confidence,
      breed: dogBreedInput.value || '미확인 품종',
      thumbnail: imageData // 프리뷰용으로 압축된 Base64 문자열
    };

    // 기록 배열 맨 첫 줄(0번 인덱스)에 새 원소 삽입
    state.history.unshift(item);

    // 기록이 너무 많아져 브라우저 디스크 용량을 낭비하지 않도록 최대 보존 개수를 10개로 차단합니다.
    if (state.history.length > 10) {
      state.history.pop(); // 10개를 넘으면 가장 오래된 마지막 인덱스 버림
    }

    // 로컬스토리지 영구 기록 (배열을 통째로 문자열로 포장하는 JSON.stringify 실행)
    localStorage.setItem('pawemotion_history', JSON.stringify(state.history));
    renderHistory(); // 화면 갱신
  };

  // 로컬 저장소에 적혀 있는 배열을 읽어와 기록 목록 카드를 동적으로 렌더링하는 함수
  const renderHistory = () => {
    const history = state.history;
    historyCount.textContent = `총 ${history.length}건의 기록`;

    // 저장된 과거 이력이 전혀 없을 경우의 플레이스홀더 출력
    if (history.length === 0) {
      btnClearHistory.style.display = 'none';
      historyGrid.innerHTML = `
        <div class="history-empty">
          아직 분석된 기록이 없습니다. 사진을 업로드하여 첫 번째 감정 분석을 시작해보세요! 🐾
        </div>
      `;
      return;
    }

    // 기록이 존재하면 삭제 버튼 활성화
    btnClearHistory.style.display = 'inline-block';
    historyGrid.innerHTML = ''; // 그리드 정화

    // 기록 루프를 돌며 미니 정보 카드 요소들을 하나씩 주입
    history.forEach(item => {
      const card = document.createElement('div');
      card.className = 'history-card';
      card.innerHTML = `
        <img src="${item.thumbnail}" alt="${escapeHtml(item.breed)}" class="history-thumb">
        <div class="history-details">
          <div class="history-title">${item.emoji} ${escapeHtml(item.emotion)} (${item.confidence}%)</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary);">${escapeHtml(item.breed)}</div>
          <div class="history-time">${item.date}</div>
        </div>
        <!-- 개별 기록의 ✕ 를 누르면 해당하는 카드만 목록에서 잘려나갑니다. -->
        <button class="history-delete-btn" data-id="${item.id}" title="이 기록 삭제">✕</button>
      `;
      historyGrid.appendChild(card);
    });

    // 개별 기록 지우기(✕) 마크에 대한 이벤트 핸들러 세팅
    document.querySelectorAll('.history-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        // e.stopPropagation(): 카드가 클릭된 것으로 다른 함수가 중복 반응하지 않게 버블링 방어
        e.stopPropagation();
        const id = Number.parseInt(btn.dataset.id, 10);
        // 내가 누른 ✕ 의 ID값만 쏙 빼놓은 알짜 배열로 재정리(filter)합니다.
        state.history = state.history.filter(h => h.id !== id);
        localStorage.setItem('pawemotion_history', JSON.stringify(state.history));
        renderHistory(); // 화면 갱신
        showToast('해당 분석 기록이 삭제되었습니다.', 'info');
      });
    });
  };

  // 최근 분석 기록 전체 삭제 버튼 클릭 시 동작
  btnClearHistory.addEventListener('click', () => {
    if (confirm('저장된 모든 분석 기록을 삭제하시겠습니까?')) {
      state.history = [];
      localStorage.removeItem('pawemotion_history'); // 디스크 완전 삭제
      renderHistory();
      showToast('모든 분석 기록이 삭제되었습니다.', 'info');
    }
  });

  // 최초 페이지 로딩 완료 직후 기록 1회 즉시 조회 렌더링
  renderHistory();

  // ==========================================================================
  // 12. 감정 도감 카테고리 필터링 탭 (Encyclopedia Filter Tabs)
  // ==========================================================================
  const filterTabs = document.querySelectorAll('.filter-tab-btn');
  const guideCards = document.querySelectorAll('.guide-card');

  filterTabs.forEach(tab => {
    // 탭들을 클릭했을 때 동작
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active'); // 클릭한 필터 탭 하이라이트

      const filter = tab.dataset.filter; // 필터 카테고리 키값 가져오기

      guideCards.forEach(card => {
        const cat = card.dataset.category;
        // 전체보기('all')로 필터를 지정했거나, 카드의 속성이 클릭한 필터 속성과 같으면
        // flex 레이아웃으로 출력하고, 어긋나면 display: none으로 가려버립니다.
        if (filter === 'all' || cat === filter) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // ==========================================================================
  // 13. 자주 묻는 질문(FAQ) 아코디언 컴포넌트 제어
  // ==========================================================================
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      // 아코디언의 약속: 하나의 질문이 열리면, 열려 있던 기존의 다른 질문 항목들은 차분히 접어 숨깁니다.
      faqItems.forEach(i => i.classList.remove('active'));
      if (!isActive) {
        item.classList.add('active'); // 닫혀 있던 카드였으면 열어주기
      }
    });
  });

  // ==========================================================================
  // 14. 토스트 알림창 빌더 유틸리티 (Toast Notification Builder)
  // ==========================================================================
  function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`; // CSS 스타일링을 위한 동적 클래스 바인딩

    // 팝업 종류에 가장 적절하게 반응하는 이모지 분기문
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast); // 알림창 하단에 줄줄이 누적 삽입

    // 알림이 떠오르고 3.5초간 노출한 후, 서서히 투명해지면서 오른쪽 화면 밖으로 슬라이드 아웃시키는 페이드 효과입니다.
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease'; // 부드러운 전이 동작
      
      // 애니메이션이 완전히 끝나 보이지 않게 되는 300ms 후에 DOM 트리에서 노드를 영구 탈거(remove)합니다.
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

});

// ==========================================================================
// 15. 보안 XSS 방어: HTML 특수 기호 치환 필터 (HTML Sanitizer)
// ==========================================================================
// 해커가 인풋창에 악성 스크립트 코드(`<script>...</script>`)를 심어 우리 웹페이지에 임베딩하는 
// XSS(Cross-Site Scripting) 공격을 완벽히 봉쇄하기 위해, 
// 태그 부등호(<, >) 기호들을 문자 텍스트(HTML Entity) 형식으로 전치시키는 보완 필수 특수 필터입니다.
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
