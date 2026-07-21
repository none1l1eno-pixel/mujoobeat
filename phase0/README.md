# Phase 0 — 반주/박자 엔진 검증

plan.md 10장 로드맵의 "심장 검증" 단계. UI/React/Django 없이, 하드코딩 멜로디 →
키 검출 → 규칙 기반 코드/드럼 생성 → Tone.js 재생까지만 확인한다.

## 실행

### 로컬 정적 서버

ES 모듈이라 `file://`로 직접 열면 CORS에 막힌다. 로컬 서버로 열 것.

```bash
cd phase0
python3 -m http.server 8080
# 또는
npx serve .
```

브라우저에서 `http://localhost:8080` 접속.

### Docker

```bash
cd phase0
docker compose up --build
```

`http://localhost:8080` 접속.

## 사용법

1. 드롭다운에서 테스트 멜로디 선택 (예쁜 3개 + 못난 3개)
2. "▶ 재생" 클릭 → 검출된 키, 코드 진행, 기술 기준 체크리스트 표시 + 소리 재생
3. plan.md 4장 기준으로 블라인드 테스트 진행 (평가자 5명, 못난 멜로디 결과도 포함해서 판정)

## 파일 구성

| 파일 | 역할 |
|---|---|
| `src/melodies.js` | 테스트 멜로디셋 (예쁜 3 + 못난 3) |
| `src/keyDetection.js` | Krumhansl-Schmuckler 키 검출 |
| `src/chordGen.js` | 다이어토닉 코드 진행 생성 |
| `src/drumGen.js` | 규칙 기반 드럼 패턴 + 필인 |
| `src/player.js` | Tone.js 악기 세팅 + 재생 스케줄링 |
| `src/main.js` | UI 연결, 위 모듈들 조립 |

## 판정

- **통과** → Phase 1(가상 악기) 진행
- **실패** → 음색/패턴 개선 반복, 2주 내 미통과 시 접근법 재설계(Magenta 조기 도입 검토)

## 라이선스 / 출처

- **Tone.js**: MIT License
- **피아노 샘플**: Salamander Grand Piano by Alexander Holm ([archive.org](https://archive.org/details/SalamanderGrandPianoV3)), CC BY 3.0. Tone.js가 예제용으로 호스팅하는 사본(`tonejs.github.io/audio/salamander/`)을 사용함
- 멜로디·코드 진행: 직접 작성한 예시 데이터, 저작권 문제 없음
