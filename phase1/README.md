# Phase 1 — 가상 악기 + 메트로놈 + 카운트인 녹음

plan.md 10장 로드맵의 "악기" 단계. React(JS, Vite) + Tone.js. 모바일 우선 설계(v0.3.2),
터치로 연주하고 데스크톱에서는 키보드 자판(A~K, 옥타브 이동 시 동일 배열 재사용)도 보조로 지원한다.

## 실행

```bash
npm install
npm run dev
```

## 기능

- **가상 악기**: 피아노 / 기타 / 바이올린 / 색소폰(같은 건반 UI, 옥타브 이동 ◀▶) + 드럼 패드(킥/스네어/하이햇/탐)
- **메트로놈**: 토글 가능, 카운트인 중에는 항상 울림
- **카운트인 녹음**: 4박 카운트인 후 녹음 시작, 노트를 `{pitch, start, dur}` 형태로 캡처 (phase0 엔진과 데이터 포맷 호환)
- **마지막 녹음 재생**: 녹음에 사용한 악기 음색 그대로 재생

## 파일 구성

| 파일 | 역할 |
|---|---|
| `src/audio/instruments.js` | 악기 샘플 로딩(피아노/기타/바이올린/색소폰 지연로딩) + 드럼 신스 |
| `src/audio/keyboardMap.js` | 건반 배열 + 옥타브 이동 계산 + 드럼 패드 매핑 |
| `src/audio/useStudio.js` | 카운트인/녹음/재생 오케스트레이션 (Tone.Transport) |
| `src/components/Piano.jsx` | 터치+마우스+키보드 건반, 옥타브 이동 UI |
| `src/components/DrumPad.jsx` | 터치+마우스+키보드 드럼 패드 |
| `src/components/TopBar.jsx`, `src/App.jsx` | 조립 |

## 라이선스 / 출처

- **Tone.js**: MIT License
- **피아노 샘플**: Salamander Grand Piano by Alexander Holm ([archive.org](https://archive.org/details/SalamanderGrandPianoV3)), CC BY 3.0 — Tone.js가 예제용으로 호스팅하는 사본(`tonejs.github.io/audio/salamander/`) 사용
- **기타/바이올린/색소폰 샘플**: [tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments) (nbrosowsky), 코드는 MIT, 샘플은 CC BY 3.0 — 출처 표기 조건으로 사용
- **드럼**: 신스 기반 자체 구현 (샘플 아님, 타악기 특성상 표준 방식)
