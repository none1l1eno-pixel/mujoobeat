# 🎵 AI 합주 스튜디오 (가칭)

악기를 몰라도 가상 악기로 멜로디를 치면 AI가 반주와 박자를 붙여주는 웹 기반 작곡 놀이터.
기획 배경/의사결정은 [plan.md](./plan.md) 참고 (버전 이력 포함).

## 구성

| 디렉터리 | 내용 | 상태 |
|---|---|---|
| [`phase0/`](./phase0) | AI 반주 엔진 단독 검증용 (UI 없음, 순수 JS + Tone.js) | 완료 |
| [`phase1/`](./phase1) | 실제 서비스 프론트엔드 (React + Vite). 가상 악기, 미니 DAW, AI 반주 생성, 로그인/프로젝트 관리, 실시간 협업까지 전부 여기 | Phase 1~3.5 구현됨 |
| [`backend/`](./backend) | Django + DRF + Channels + PostgreSQL. 회원가입/로그인, 프로젝트 저장, 실시간 동시편집 WebSocket | Phase 3.5 구현됨 |

`phase0`은 초기 엔진 검증 산출물이라 독립 실행되고, 실서비스는 `phase1`(프론트) + `backend`(백엔드) 조합으로 돌아간다.

## 실행 (phase1 + backend, 로컬 개발)

### 1. 백엔드

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

docker compose up -d          # PostgreSQL 컨테이너
cp .env.example .env          # 필요시 값 수정

python manage.py migrate
python manage.py runserver 8000
```

`http://localhost:8000` 에서 REST API(`/api/auth/...`, `/api/projects/...`)와
WebSocket(`/ws/projects/<id>/`)이 함께 뜬다 (Channels + Daphne).

### 2. 프론트엔드

```bash
cd phase1
npm install
npm run dev
```

`http://localhost:5173`(또는 표시된 포트) 접속 → 회원가입 → 프로젝트 생성 → 스튜디오 진입.

기본적으로 프론트는 백엔드를 `http://localhost:8000`으로 바라본다. 다른 주소를 쓰려면
`phase1/.env`에 `VITE_API_BASE`, `VITE_WS_BASE`를 설정.

### 3. Phase 0 엔진만 따로 보고 싶을 때

```bash
cd phase0
python3 -m http.server 8080   # 또는 docker compose up --build
```

`phase0/README.md` 참고.

## 주요 기능 (구현 완료분)

- **가상 악기**: 피아노/기타/바이올린/색소폰(터치+키보드, 옥타브 이동) + 드럼 패드
- **녹음**: 메트로놈 카운트인 → 멀티트랙 녹음
- **미니 DAW**: 타임라인(블록 이동/자르기/복사/삭제), 트랙 볼륨/뮤트/솔로, 퀀타이즈(그리드 스냅, 원본 보존)
- **AI 반주**: 키 검출(수동 보정 가능) → 스타일 프리셋(팝/락/발라드/로파이)별 코드+드럼 자동 생성, 16스텝 시퀀서로 재편집
- **계정/저장**: 이메일 회원가입·로그인(JWT), 프로젝트 저장/불러오기
- **협업**: 프로젝트 초대(협업자 추가), 공개/비공개 전환, **실시간 동시편집**(WebSocket — 한쪽이 녹음/편집하면 같은 프로젝트를 연 다른 사용자 화면에 즉시 반영)

## 아직 없는 것

- WAV 내보내기, AI 격려 코멘트(LLM 중계), 허밍 입력, 배포 파이프라인 — plan.md 10장 로드맵의 Phase 4/5 범위
- 접속자 프레즌스 목록이 완전하지 않음(나중에 합류한 사람만 반영) — 기능 자체엔 영향 없는 소소한 흠
