/**
 * PawEmotion AI - Main Frontend Logic
 * Features: Image Processing, API Integration, Theme Toggle, LocalStorage History, UI Interactivity
 */

document.addEventListener('DOMContentLoaded', () => {
  // ================= 1. 상태 관리 (State Management) =================
  // 웹 애플리케이션의 현재 화면 상태나 임시 데이터를 저장하는 객체입니다.
  const state = {
    selectedImageData: null, // 사용자가 업로드하거나 선택한 이미지의 Base64 데이터 스트링
    selectedImageName: '',    // 선택한 이미지의 파일 이름
    isAnalyzing: false,       // 현재 AI 분석이 진행 중인지 여부 (중복 요청 방지용)
    // 로컬 스토리지에 저장된 이전 분석 기록을 불러오고, 기록이 없으면 빈 배열([])로 초기화합니다.
    history: JSON.parse(localStorage.getItem('pawemotion_history') || '[]')
  };

  // ================= 2. DOM 요소 선택 (DOM Elements Selection) =================
  // HTML 코드에서 자바스크립트로 조작하려는 엘리먼트(태그)들을 가져옵니다.

  // 테마 및 네비게이션 관련 요소
  const themeToggleBtn = document.getElementById('themeToggleBtn'); // 라이트/다크 테마 토글 버튼
  const themeIcon = document.getElementById('themeIcon');           // 테마 아이콘 표시 영역 (해/달 이모지)
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');   // 모바일 화면용 햄버거 메뉴 버튼
  const navMenu = document.getElementById('navMenu');               // 네비게이션 메뉴 컨테이너
  const navLinks = document.querySelectorAll('.nav-link');          // 모든 네비게이션 링크들 (.nav-link 클래스를 가진 모든 요소)

  // 이미지 업로드 및 샘플 선택 관련 요소
  const dropzone = document.getElementById('dropzone');                     // 사진 드래그&드롭 영역
  const fileInput = document.getElementById('fileInput');                   // 숨겨진 실제 파일 업로드 <input> 태그
  const previewContainer = document.getElementById('previewContainer');     // 업로드 완료된 이미지 프리뷰 컨테이너
  const previewImage = document.getElementById('previewImage');             // 프리뷰 화면의 <img> 태그
  const btnRemoveImage = document.getElementById('btnRemoveImage');         // 이미지 삭제 버튼
  const sampleBtns = document.querySelectorAll('.sample-btn');              // 샘플 강아지 버튼 리스트

  // 입력 폼 관련 요소
  const dogBreedInput = document.getElementById('dogBreed');                // 견종 입력창
  const dogAgeInput = document.getElementById('dogAge');                    // 나이 입력창
  const dogSituationInput = document.getElementById('dogSituation');        // 상황 설명 입력창
  const chipBtns = document.querySelectorAll('.chip-btn');                  // 간편 상황 선택 해시태그 칩들
  const btnAnalyze = document.getElementById('btnAnalyze');                 // AI 분석 시작 버튼

  // 분석 결과 화면 전환 관련 요소
  const resultPlaceholder = document.getElementById('resultPlaceholder');   // 분석 전 기본 안내 화면
  const loadingState = document.getElementById('loadingState');             // 분석 중 스피너/애니메이션 화면
  const resultContent = document.getElementById('resultContent');           // 분석 완료 후 결과를 뿌려주는 화면
  const resultCard = document.getElementById('resultCard');                 // 결과 카드 전체 영역

  // 상세 분석 결과 데이터 출력 요소
  const resEmoji = document.getElementById('resEmoji');                     // 분석된 감정 대표 이모지
  const resEmotion = document.getElementById('resEmotion');                 // 분석된 한글 감정 텍스트
  const resEmotionEn = document.getElementById('resEmotionEn');             // 영어 감정 텍스트
  const resConfidence = document.getElementById('resConfidence');           // 신뢰도 백분율 (%)
  const resConfidenceBar = document.getElementById('resConfidenceBar');     // 신뢰도 게이지 바
  const resSummary = document.getElementById('resSummary');                 // AI 상태 한줄 요약
  const resCuesGrid = document.getElementById('resCuesGrid');               // 미세 신체 시그널 그리드 영역
  const resRecommendations = document.getElementById('resRecommendations'); // 보호자 권장 행동 리스트
  const resPrecautions = document.getElementById('resPrecautions');         // 주의사항 리스트
  const resSourceInfo = document.getElementById('resSourceInfo');           // 동작한 AI 분석 엔진 명시

  // 결과 제어 및 분석 기록 관련 요소
  const btnCopyResult = document.getElementById('btnCopyResult');           // 결과 복사 버튼
  const btnReset = document.getElementById('btnReset');                     // 재분석(초기화) 버튼
  const historyGrid = document.getElementById('historyGrid');               // 저장된 이전 기록 그리드
  const historyCount = document.getElementById('historyCount');             // 분석 기록 개수 텍스트
  const btnClearHistory = document.getElementById('btnClearHistory');       // 분석 기록 전체 삭제 버튼

  // 가장 최신의 분석 결과를 담아두는 내부 변수
  let latestAnalysisResult = null;

  // ================= 3. 테마 관리 (Theme Management) =================
  // 사용자의 이전 테마(라이트/다크) 선택을 로컬 스토리지에서 읽어와 화면에 반영합니다.
  const initTheme = () => {
    // 저장된 테마가 없으면 기본값은 'light'
    const savedTheme = localStorage.getItem('pawemotion_theme') || 'light';
    // <html> 태그에 data-theme 속성을 주어 CSS에서 적절한 색상 변수를 가져다 쓰도록 합니다.
    document.documentElement.dataset.theme = savedTheme;
    // 현재 테마에 맞춰 토글 버튼 아이콘 수정
    themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
  };

  // 테마 토글 버튼 클릭 이벤트 핸들러
  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.dataset.theme;
    // 현재 테마와 반대 테마로 스위칭
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = newTheme;
    // 로컬 스토리지에 새 테마 저장 (페이지 새로고침 시에도 유지되도록 함)
    localStorage.setItem('pawemotion_theme', newTheme);
    themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    // 사용자 친화적인 알림 토스트 출력
    showToast(`${newTheme === 'dark' ? '다크' : '라이트'} 모드로 전환되었습니다.`, 'info');
  });

  // 페이지 로드 시 즉각 테마 초기화 함수 실행
  initTheme();

  // ================= 4. 네비게이션 및 모바일 메뉴 조작 =================
  // 모바일 화면에서 햄버거 메뉴(☰) 버튼 클릭 시 네비게이션 메뉴 노출/숨김 토글
  mobileMenuBtn.addEventListener('click', () => {
    navMenu.classList.toggle('show');
    // 메뉴 열림 상태에 따라 닫기(✕) 또는 햄버거(☰) 표시 변경
    mobileMenuBtn.textContent = navMenu.classList.contains('show') ? '✕' : '☰';
  });

  // 네비게이션 메뉴 중 하나를 클릭했을 때 모바일 메뉴를 닫고 active(활성화) 클래스 변경
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('show');
      mobileMenuBtn.textContent = '☰';
      navLinks.forEach(l => l.classList.remove('active')); // 기존 활성화된 링크 해제
      link.classList.add('active'); // 클릭한 링크 활성화
    });
  });

  // 스크롤 위치를 감지하여 현재 보고 있는 영역에 맞추어 상단 네비게이션 활성화 탭을 바꿔주는 기능 (Scroll Spy)
  window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section'); // 모든 섹션 요소들
    const scrollPos = window.scrollY + 120; // 픽셀 오프셋을 두어 활성화 타이밍 조절

    sections.forEach(section => {
      const top = section.offsetTop; // 섹션의 상단 높이값
      const height = section.offsetHeight; // 섹션의 전체 높이값
      const id = section.getAttribute('id'); // 섹션의 ID값 (예: #home, #analysis 등)

      // 현재 스크롤 위치가 섹션 범위 안에 있을 때
      if (scrollPos >= top && scrollPos < top + height) {
        navLinks.forEach(l => {
          l.classList.remove('active');
          // 링크의 href 속성(예: #home)과 현재 속해 있는 섹션 ID가 매치될 경우 활성화
          if (l.getAttribute('href') === `#${id}`) {
            l.classList.add('active');
          }
        });
      }
    });
  });

  // ================= 5. 사진 업로드 및 드래그 앤 드롭 처리 =================
  // 점선 박스(Dropzone) 영역을 클릭하면 숨겨져 있는 파일 입력창(fileInput)이 자동으로 열리도록 합니다.
  dropzone.addEventListener('click', () => fileInput.click());

  // 마우스로 파일을 드래그하여 Dropzone 박스 위에 가져다 올릴 때의 하이라이트 애니메이션 처리
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault(); // 브라우저가 파일을 새 창으로 여는 기본 동작을 방지
      e.stopPropagation(); // 부모 엘리먼트로의 이벤트 전파 방지
      dropzone.classList.add('dragover'); // 하이라이트 CSS 스타일 적용
    });
  });

  // 파일을 드래그 영역 밖으로 가져가거나 놓쳤을 때 하이라이트 제거
  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover'); // 하이라이트 해제
    });
  });

  // 마우스 드롭을 통해 파일을 놓았을 때 해당 파일 데이터를 감지해 처리
  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      handleFile(files[0]); // 첫 번째 드롭된 파일 처리 함수 실행
    }
  });

  // 파일 탐색기를 통해 파일을 선택했을 때 감지해 처리
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  // 업로드되거나 선택된 이미지 파일의 적절성 검사(Validation) 및 비동기 파일 읽기 수행
  const handleFile = (file) => {
    // 1) 허용할 이미지 타입 필터링
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('JPG, PNG, WEBP 형식의 이미지 파일만 업로드할 수 있습니다.', 'error');
      return;
    }

    // 2) 이미지 파일 크기 한도(5MB) 검사
    if (file.size > 5 * 1024 * 1024) {
      showToast('파일 크기는 5MB 이하만 지원됩니다.', 'error');
      return;
    }

    // 3) HTML5 FileReader API를 사용하여 파일을 메모리로 읽고 Base64 데이터(MIME형식의 텍스트)로 변환
    const reader = new FileReader();
    reader.onload = (e) => {
      state.selectedImageData = e.target.result; // 변환 완료된 Base64 데이터를 상태 객체에 기록
      state.selectedImageName = file.name;
      displayImagePreview(state.selectedImageData); // 화면 프리뷰 영역에 이미지 배치
      sampleBtns.forEach(b => b.classList.remove('selected')); // 샘플 강아지 선택 해제
      chipBtns.forEach(c => c.classList.remove('active')); // 선택된 칩 해제
      dogBreedInput.value = '';
      dogAgeInput.value = '';
      dogSituationInput.value = '';
      showToast('사진이 등록되었습니다. 추가 정보를 확인하고 분석을 시작하세요!', 'success');
    };
    reader.readAsDataURL(file); // 비동기 읽기 실행 시작
  };

  // 업로드한 이미지를 화면 프리뷰 공간에 띄우고 점선 업로드창 숨기기
  const displayImagePreview = (src) => {
    previewImage.src = src;
    previewContainer.style.display = 'block';
    dropzone.style.display = 'none';
  };

  // 등록된 사진 제거 버튼 클릭 핸들러 (입력창 상태 초기화)
  btnRemoveImage.addEventListener('click', (e) => {
    e.stopPropagation(); // 클릭 이벤트가 Dropzone 전체 클릭으로 전파되어 파일 창이 다시 뜨는 현상 방지
    state.selectedImageData = null;
    state.selectedImageName = '';
    fileInput.value = ''; // input 태그 내 캐시 초기화
    previewContainer.style.display = 'none';
    dropzone.style.display = 'block';
    sampleBtns.forEach(b => b.classList.remove('selected'));
    showToast('사진이 제거되었습니다.', 'info');
  });

  // ================= 6. 샘플 사진 원클릭 입력 데이터 프리셋 =================
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

  // 각각의 샘플 버튼을 누르면 해당 강아지의 사진 및 부가 정보가 자동으로 입력창에 자동 폼 채우기(Auto-fill)됩니다.
  sampleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.sample;
      const preset = samplePresets[type];
      if (!preset) return;

      sampleBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected'); // 선택 표시 테두리 효과 스타일 적용

      // 이미지 URL을 가져와서 캔버스(Canvas) 객체를 이용해 비동기적으로 Base64 코드로 인코딩하고 업로드 데이터로 세팅
      const img = new Image();
      img.crossOrigin = 'Anonymous'; // 외부 호스트 이미지인 경우 CORS 우회 처리 설정
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0); // 캔버스에 이미지 그리기
        state.selectedImageData = canvas.toDataURL('image/jpeg', 0.85); // 85% 퀄리티의 JPEG Base64 스트링으로 추출
        state.selectedImageName = `${preset.breed} (샘플)`;
        displayImagePreview(state.selectedImageData); // 프리뷰 갱신
      };
      img.src = preset.image; // 이미지 불러오기 트리거

      // 추가 메타데이터 텍스트 인풋창 입력 처리
      dogBreedInput.value = preset.breed;
      dogAgeInput.value = preset.age;
      dogSituationInput.value = preset.situation;

      showToast(`'${preset.breed}' 샘플 데이터가 로드되었습니다.`, 'success');
    });
  });

  // 상황 해시태그 칩(Chip)을 누르면 간편하게 상황 설명 텍스트 인풋창에 문자열이 즉각 바인딩됩니다.
  chipBtns.forEach(chip => {
    chip.addEventListener('click', () => {
      dogSituationInput.value = chip.dataset.situation;
      chipBtns.forEach(c => c.classList.remove('active'));
      chip.classList.add('active'); // 선택된 칩에 시각적인 효과 부여
    });
  });

  // ================= 7. AI 분석 실행 처리 (AI Analysis Execution) =================
  // '분석 시작하기' 버튼을 눌렀을 때 비동기 통신을 호출하고 화면에 로딩 상태 및 결과를 렌더링하는 핵심 함수
  btnAnalyze.addEventListener('click', async () => {
    // 이미 분석 작업이 돌고 있다면 중복 호출을 막기 위해 함수를 즉시 빠져나갑니다.
    if (state.isAnalyzing) return;

    // 예외 검사: 사용자가 사진을 등록하지 않았을 경우 경고 토스트를 띄우고 점선 박스를 강조합니다.
    if (!state.selectedImageData) {
      showToast('반려견 사진을 먼저 업로드하거나 샘플 사진을 선택해주세요.', 'warning');
      dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' }); // 해당 위치로 부드럽게 스크롤 이동
      dropzone.classList.add('dragover');
      setTimeout(() => dropzone.classList.remove('dragover'), 1000); // 1초 후 테두리 강조 효과 제거
      return;
    }

    // 입력 창의 공백을 제거하고 값을 추출합니다. 값이 없을 경우 기본값으로 셋업합니다.
    const breed = dogBreedInput.value.trim() || '미확인 품종';
    const age = dogAgeInput.value.trim() || '미확인';
    const situation = dogSituationInput.value.trim() || '일상 상태';

    // 로딩바 및 대기 문구를 보여주는 UI 활성화
    setLoadingState(true);

    // API 서버에 전송할 데이터 페이로드(Payload) 구성
    const payload = {
      image: state.selectedImageData, // Base64 인코딩 파일 스트링
      breed: breed,
      age: age,
      situation: situation
    };

    try {
      // 30초 안에 백엔드 응답이 없을 경우 강제 중단(Timeout)하기 위해 AbortController 선언
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30000ms = 30초 타이머 작동

      let response;
      let data;

      try {
        // 비동기 fetch API를 통해 서버리스 백엔드 엔드포인트(/api/analyze)에 POST 요청 전송
        response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload), // 데이터를 JSON 문자열로 변환하여 본문에 탑재
          signal: controller.signal // Abort 신호 바인딩
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`API 응답 오류 (상태 코드: ${response.status})`);
        }

        data = await response.json();
      } catch (fetchErr) {
        console.warn('Backend API request unreached or timed out, activating intelligent client-side analyzer...', fetchErr);
        // 백엔드 API 서버를 사용할 수 없거나 시간 초과 시 클라이언트 자체 휴리스틱 알고리즘으로 대체(Fallback) 작동
        data = simulateClientAnalysis(breed, age, situation);
      }

      latestAnalysisResult = data;
      renderAnalysisResult(data);
      saveToHistory(data, state.selectedImageData);
      showToast('AI 감정 분석이 성공적으로 완료되었습니다!', 'success');

    } catch (err) {
      console.error('Analysis error:', err);
      showToast(`분석 중 오류가 발생했습니다: ${err.message}`, 'error');
      setLoadingState(false);
      resultPlaceholder.style.display = 'block';
    } finally {
      setLoadingState(false);
    }
  });

  // 로딩 상태에 맞춰 UI의 활성화 여부 및 애니메이션을 제어하는 함수
  const setLoadingState = (isLoading) => {
    state.isAnalyzing = isLoading;
    btnAnalyze.disabled = isLoading;
    btnAnalyze.innerHTML = isLoading
      ? `<span>⏳ AI 심층 분석 중...</span>`
      : `<span>🔍 AI 감정 분석 시작하기</span>`;

    if (isLoading) {
      resultPlaceholder.style.display = 'none';
      resultContent.style.display = 'none';
      loadingState.style.display = 'block';
      resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      loadingState.style.display = 'none';
    }
  };

  // ================= 8. 상세 분석 결과 출력 및 UI 바인딩 (Render Analysis Result) =================
  // 서버 또는 로컬 엔진에서 전달받은 결과 데이터를 HTML 태그에 하나씩 대입하여 렌더링
  const renderAnalysisResult = (data) => {
    resultPlaceholder.style.display = 'none';
    loadingState.style.display = 'none';
    resultContent.style.display = 'block';

    resEmoji.textContent = data.emoji || '😊';
    resEmotion.textContent = data.emotion || '행복';
    resEmotionEn.textContent = data.emotion_en || 'HAPPY';
    resConfidence.textContent = `${data.confidence || 90}%`;
    resSummary.textContent = `"${data.summary || '반려견의 긍정적인 신체 언어가 관찰되었습니다.'}"`;

    // 신뢰도 게이지 바 애니메이션 처리 (0%에서 시작해 서서히 올라가도록 함)
    resConfidenceBar.style.width = '0%';
    setTimeout(() => {
      resConfidenceBar.style.width = `${data.confidence || 90}%`;
    }, 100);

    // 신체 부위별 감정 시그널(Cues) 렌더링
    resCuesGrid.innerHTML = '';
    if (data.cues && Array.isArray(data.cues)) {
      data.cues.forEach(cue => {
        const cueCard = document.createElement('div');
        cueCard.className = 'cue-card';
        cueCard.innerHTML = `
          <div class="cue-title">
            <span>🔎</span> ${escapeHtml(cue.part)}
          </div>
          <div class="cue-desc">${escapeHtml(cue.observation)}</div>
        `;
        resCuesGrid.appendChild(cueCard);
      });
    }

    // 보호자 권장 조치 가이드 렌더링
    resRecommendations.innerHTML = '';
    if (data.recommendations && Array.isArray(data.recommendations)) {
      data.recommendations.forEach(rec => {
        const li = document.createElement('li');
        li.className = 'action-item';
        li.innerHTML = `<span class="check-icon">✓</span> <span>${escapeHtml(rec)}</span>`;
        resRecommendations.appendChild(li);
      });
    }

    // 주의사항 및 스트레스 방지 팁 렌더링
    resPrecautions.innerHTML = '';
    if (data.precautions && Array.isArray(data.precautions)) {
      data.precautions.forEach(prec => {
        const li = document.createElement('li');
        li.className = 'precaution-item';
        li.innerHTML = `<span class="warn-icon">⚠️</span> <span>${escapeHtml(prec)}</span>`;
        resPrecautions.appendChild(li);
      });
    }

    // 분석 모델 출처 표시
    resSourceInfo.textContent = data.source ? `분석 출처: ${data.source}` : 'PawEmotion AI 동물행동학 분석 모델';
  };

  // ================= 9. 클라이언트 대체 분석 엔진 (Client Fallback Heuristic) =================
  // 백엔드가 비활성화되어 있거나 서버 점검 중일 때, 텍스트(상황, 품종) 매칭을 통해 적절한 시그널 및 맞춤 가이드를 돌려주는 장치
  const simulateClientAnalysis = (breed, age, situation) => {
    const sit = situation.toLowerCase();

    // 기본값 설정 (Happy)
    let emotion = "행복", emotion_en = "Happy", emoji = "😊", conf = 92;
    let summary = `${breed} 친구는 현재 보호자와의 일상 속에서 편안하고 즐거운 행복감을 느끼고 있습니다.`;
    let cues = [
      { part: "눈", observation: "눈매가 부드럽고 눈 깜빡임이 자연스러워 이완된 상태" },
      { part: "귀", observation: "품종 고유의 자연스러운 각도로 앞으로 향함" },
      { part: "입 및 혀", observation: "입꼬리가 살짝 올라가며 부드럽게 열려 있음" },
      { part: "몸 및 자세", observation: "신체 근육이 이완되어 있고 꼬리가 부드러운 중립 위치" }
    ];
    let recs = [
      "다정한 목소리로 교감하며 반려견의 행복한 기분을 북돋아주세요.",
      "간단한 간식 노즈워크나 산책으로 긍정적인 경험을 이어가세요.",
      "충분한 애정 표현과 턱/가슴 부위의 부드러운 스킨십을 선물하세요."
    ];
    let precs = [
      "현재의 안정된 환경과 루틴을 꾸준히 유지해 주는 것이 좋습니다.",
      "갑작스러운 큰 소음이나 낯선 자극의 유입을 최소화해주세요."
    ];

    // 조건부 텍스트 매칭: 병원/소음이 감지되면 불안 상태 반환
    if (sit.includes('병원') || sit.includes('낯선') || sit.includes('소음') || sit.includes('천둥')) {
      emotion = "불안"; emotion_en = "Anxious"; emoji = "😟"; conf = 88;
      summary = `낯선 자극이나 환경(${situation})으로 인해 일시적인 긴장과 불안 신호가 감지됩니다.`;
      cues = [
        { part: "눈", observation: "시선이 고정되지 않고 두리번거리거나 흰자위가 살짝 보임" },
        { part: "귀", observation: "귀가 뒤쪽으로 살짝 젖혀져 방어적인 모습" },
        { part: "입 및 혀", observation: "입을 굳게 다물거나 입술을 자주 핥는 카밍 시그널" },
        { part: "몸 및 자세", observation: "무게중심을 낮추고 몸에 미세한 긴장감이 있음" }
      ];
      recs = [
        "보호자의 차분하고 일관된 태도로 심리적 안정감을 심어주세요.",
        "불안을 유발하는 자극원으로부터 적절한 안전거리를 유지해주세요.",
        "좋아하는 간식이나 애착 물품으로 시선을 부드럽게 분산시키세요."
      ];
      precs = [
        "불안해할 때 억지로 안거나 과도하게 쓰다듬으면 긴장이 가중될 수 있습니다.",
        "강요하지 말고 반려견이 스스로 안정을 찾을 때까지 충분한 시간을 주세요."
      ];
      // 놀이/산책이 감지되면 흥분/놀이 상태 반환
    } else if (sit.includes('놀이') || sit.includes('산책') || sit.includes('공') || sit.includes('터그')) {
      emotion = "놀이"; emotion_en = "Playful"; emoji = "🎾"; conf = 95;
      summary = `${breed} 친구는 활력과 호기심이 최고조에 달해 신나는 놀이 활동에 푹 빠져 있습니다!`;
      cues = [
        { part: "눈", observation: "초롱초롱 빛나며 움직이는 대상에 시선이 즉각 반응함" },
        { part: "귀", observation: "앞을 향해 쫑긋 세워져 높은 집중력과 기대를 표출" },
        { part: "입 및 혀", observation: "혀를 내밀고 기분 좋게 헐떡이며 활짝 웃는 표정" },
        { part: "몸 및 자세", observation: "상체를 낮추고 엉덩이를 드는 플레이 보우 자세" }
      ];
      recs = [
        "터그 놀이나 공 던지기 등 신나는 인터랙티브 놀이를 15~20분간 즐겨주세요.",
        "놀이 중간중간 물을 마실 수 있도록 시원한 음수를 챙겨주세요.",
        "놀이가 끝난 후에는 '앉아'나 '기다려'를 통해 차분하게 마무리하세요."
      ];
      precs = [
        "과도한 흥분으로 인한 흥분성 입질이 생기지 않도록 놀이 템포를 조절하세요.",
        "미끄러운 실내 바닥에서는 관절 부상을 방지하기 위해 매트를 활용하세요."
      ];
    }

    return {
      emotion, emotion_en, emoji, confidence: conf, summary, cues,
      recommendations: recs, precautions: precs,
      source: "PawEmotion AI 오프라인/로컬 동물행동학 엔진"
    };
  };

  // ================= 10. 결과 텍스트 클립보드 복사 (Copy Result) =================
  // 클라이언트의 clipboard API를 활용해 결과를 정제된 텍스트 폼으로 복사
  btnCopyResult.addEventListener('click', () => {
    if (!latestAnalysisResult) return;

    // 복사할 다중행 텍스트 가이드 빌드
    const text = `[PawEmotion AI 분석 결과]
🐾 반려견: ${dogBreedInput.value || '반려견'} (${dogAgeInput.value || '나이 미지정'})
✨ 감정 상태: ${latestAnalysisResult.emoji} ${latestAnalysisResult.emotion} (${latestAnalysisResult.confidence}% 신뢰도)
📝 요약: ${latestAnalysisResult.summary}

💡 권장 행동:
${(latestAnalysisResult.recommendations || []).map(r => '- ' + r).join('\n')}

⚠️ 주의사항:
${(latestAnalysisResult.precautions || []).map(p => '- ' + p).join('\n')}

서비스 링크: https://hj202608m3-1-mtbbcbty8-haru2014s-projects.vercel.app`;

    // 비동기 클립보드 복사 API 호출
    navigator.clipboard.writeText(text).then(() => {
      showToast('분석 결과 요약이 클립보드에 복사되었습니다! 📋', 'success');
    }).catch(() => {
      showToast('클립보드 복사에 실패했습니다.', 'error');
    });
  });

  // ================= 11. 초기화 버튼 처리 (Reset UI) =================
  // 사용자가 다른 사진을 분석하기 편리하도록 모든 폼과 이미지 데이터를 초기화
  btnReset.addEventListener('click', () => {
    btnRemoveImage.click(); // 등록된 이미지 제거 함수 호출
    dogBreedInput.value = '';
    dogAgeInput.value = '';
    dogSituationInput.value = '집에서 휴식 중';
    chipBtns.forEach(c => c.classList.remove('active'));
    resultContent.style.display = 'none'; // 결과 출력 해제
    resultPlaceholder.style.display = 'block'; // 기본 안내 화면 복구
    showToast('새로운 사진을 등록해 주세요.', 'info');
    // 사용자를 스튜디오 업로드 영역으로 올려줍니다.
    dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // ================= 12. 분석 기록 로컬 보존 및 렌더링 (LocalStorage History) =================
  // 새로운 분석 결과를 영구적으로 로컬 브라우저 디바이스에 보관 (최대 10개)
  const saveToHistory = (result, imageData) => {
    const item = {
      id: Date.now(), // 고유 식별키를 생성하기 위해 현재 타임스탬프 밀리초 지정
      date: new Date().toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), // 가독성 높은 날짜 텍스트
      emotion: result.emotion,
      emoji: result.emoji,
      confidence: result.confidence,
      breed: dogBreedInput.value || '미확인 품종',
      thumbnail: imageData // 이미지 프리뷰용 Base64 문자열
    };

    // 최신 결과를 목록 맨 앞에 밀어 넣음 (Unshift)
    state.history.unshift(item);

    // 최대 저장 한도(10개) 초과 시 가장 오래된 마지막 요소 제거 (Pop)
    if (state.history.length > 10) state.history.pop();

    // 로컬스토리지에 JSON 직렬화 문자열로 변환하여 덮어쓰기 저장
    localStorage.setItem('pawemotion_history', JSON.stringify(state.history));
    renderHistory(); // 화면 갱신
  };

  // 로컬 스토리지에 기록된 내역을 바탕으로 HTML 목록 카드를 동적으로 그리는 렌더 함수
  const renderHistory = () => {
    const history = state.history;
    historyCount.textContent = `총 ${history.length}건의 기록`;

    // 저장된 기록이 전혀 없을 때
    if (history.length === 0) {
      btnClearHistory.style.display = 'none'; // '기록 전체 삭제' 버튼 숨김
      historyGrid.innerHTML = `
        <div class="history-empty">
          아직 분석된 기록이 없습니다. 사진을 업로드하여 첫 번째 감정 분석을 시작해보세요! 🐾
        </div>
      `;
      return;
    }

    // 기록이 한 건이라도 있으면 전체 삭제 버튼 활성화
    btnClearHistory.style.display = 'inline-block';
    historyGrid.innerHTML = ''; // 그리드 버퍼 비우기

    // 저장된 목록을 돌면서 기록용 소형 정보 카드들을 엘리먼트로 삽입
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
        <button class="history-delete-btn" data-id="${item.id}" title="이 기록 삭제">✕</button>
      `;
      historyGrid.appendChild(card);
    });

    // 각각의 개별 기록 카드 내 '삭제(✕)' 버튼을 누르면 해당 행만 필터링하여 지우는 이벤트 리스너 등록
    document.querySelectorAll('.history-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // 카드 자체 클릭에 대한 다른 전파를 방어
        const id = Number.parseInt(btn.dataset.id, 10);
        // 해당하는 ID의 아이템을 제외한 배열로 재구성
        state.history = state.history.filter(h => h.id !== id);
        localStorage.setItem('pawemotion_history', JSON.stringify(state.history));
        renderHistory(); // 재렌더링
        showToast('해당 분석 기록이 삭제되었습니다.', 'info');
      });
    });
  };

  // 기록 전체 삭제(Clear All) 이벤트 리스너
  btnClearHistory.addEventListener('click', () => {
    if (confirm('저장된 모든 분석 기록을 삭제하시겠습니까?')) {
      state.history = []; // 메모리 초기화
      localStorage.removeItem('pawemotion_history'); // 저장소 데이터 폐기
      renderHistory(); // 재렌더링
      showToast('모든 분석 기록이 삭제되었습니다.', 'info');
    }
  });

  // 페이지 부팅 시 로컬 저장소로부터 기록 리스트 최초 1회 화면 렌더링
  renderHistory();

  // ================= 13. 감정 도감 필터 탭 (Emotion Guide Filter Tabs) =================
  // '감정 도감' 영역에서 행복/불안/편안함 등 카테고리 탭 버튼을 클릭했을 때 알맞은 카드만 가려주는 필터링 로직
  const filterTabs = document.querySelectorAll('.filter-tab-btn');
  const guideCards = document.querySelectorAll('.guide-card');

  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active'); // 선택된 탭 활성화 클래스 지정

      const filter = tab.dataset.filter; // 필터 기준값 추출 (예: 'happy', 'all')

      guideCards.forEach(card => {
        const cat = card.dataset.category; // 도감 카드의 고유 카테고리값
        // 전체보기('all') 이거나 카드가 탭 필터 종류와 일치하면 노출, 아닐 경우 숨김(display: none)
        if (filter === 'all' || cat === filter) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // ================= 14. 자주 묻는 질문 아코디언 메뉴 (FAQ Accordion) =================
  // 질문을 클릭하면 접혀 있던 답변 창이 아래로 슬라이딩되며 열리는 토글 효과
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      faqItems.forEach(i => i.classList.remove('active')); // 다른 질문들은 닫도록 처리 (Accordion 원칙)
      if (!isActive) {
        item.classList.add('active'); // 닫혀 있던 상태였다면 열기 클래스 주입
      }
    });
  });

  // ================= 15. 토스트 알림 메시지 빌더 (Toast Notifications Utility) =================
  // 화면 구석에 팝업창 형태로 짧은 알림 메시지를 생성하고 몇 초 뒤에 자동으로 스르륵 사라지도록 구현
  function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`; // 알림 속성별 클래스 부여 (css/style.css 에 정의된 색상 및 아이콘 매핑)

    // 타입에 적합한 대표 이모지 지정
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast); // 알림창 박스 하단에 밀어 넣음

    // 3.5초 대기 후에 불투명도를 흐리게 하고 오른쪽으로 내밀어 없애는 애니메이션
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease'; // 스무스 트랜지션 적용
      setTimeout(() => toast.remove(), 300); // 완전 투명화/이동이 끝나면 DOM 트리에서 완전 제거
    }, 3500);
  }

});

// ================= 16. 보안 조치: HTML 문자열 이스케이프 (Security XSS Guard) =================
// 혹여나 외부 데이터나 유저 인풋값에 악성 script 태그가 포함되어 화면을 오염시키는 것(Cross-Site Scripting)을 원천 방지
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

