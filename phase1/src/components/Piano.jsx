import { useEffect, useMemo, useRef, useState } from 'react';
import { getPianoKeys, rootNoteLabel, OCTAVE_OFFSET_MIN, OCTAVE_OFFSET_MAX } from '../audio/keyboardMap';

export default function Piano({ onNoteOn, onNoteOff }) {
  const [active, setActive] = useState(() => new Set());
  const [octaveOffset, setOctaveOffset] = useState(0);
  const heldKeysRef = useRef(new Set()); // 키 반복입력(auto-repeat) 방지

  const pianoKeys = useMemo(() => getPianoKeys(octaveOffset), [octaveOffset]);
  const keymapRef = useRef({});
  keymapRef.current = useMemo(
    () => Object.fromEntries(pianoKeys.map((k) => [k.code, k.pitch])),
    [pianoKeys],
  );

  const press = (pitch) => {
    setActive((prev) => new Set(prev).add(pitch));
    onNoteOn(pitch);
  };
  const release = (pitch) => {
    setActive((prev) => {
      const next = new Set(prev);
      next.delete(pitch);
      return next;
    });
    onNoteOff(pitch);
  };

  // 터치(멀티터치 화음)와 마우스를 함께 지원. touchstart에서 preventDefault로
  // 합성 마우스 이벤트(중복 note-on)와 스크롤/확대 제스처를 막는다.
  const touchHandlers = (pitch) => ({
    onTouchStart: (e) => { e.preventDefault(); press(pitch); },
    onTouchEnd: (e) => { e.preventDefault(); release(pitch); },
    onTouchCancel: (e) => { e.preventDefault(); release(pitch); },
    onMouseDown: () => press(pitch),
    onMouseUp: () => release(pitch),
    onMouseLeave: () => active.has(pitch) && release(pitch),
  });

  useEffect(() => {
    // e.code(물리 키 위치)로 매칭 — e.key는 Shift/CapsLock에 따라 keydown 때와
    // keyup 때 값이 달라질 수 있어("a"↔"A") 놓친 keyup 취급이 되어 키가 "끼는"
    // 간헐적 버그의 원인이었다.
    const handleKeyDown = (e) => {
      const pitch = keymapRef.current[e.code];
      if (pitch === undefined || heldKeysRef.current.has(e.code)) return;
      heldKeysRef.current.add(e.code);
      press(pitch);
    };
    const handleKeyUp = (e) => {
      const pitch = keymapRef.current[e.code];
      if (pitch === undefined) return;
      heldKeysRef.current.delete(e.code);
      release(pitch);
    };
    // 창 자체가 OS 포커스를 잃으면(alt+tab 등) keyup이 아예 안 올 수 있어 눌린 채로
    // "끼는" 노트가 생긴다 — 그때만 강제로 뗀다. document.visibilitychange는 쓰지
    // 않는다 — 탭이 잠깐 백그라운드로만 밀려도(알림, 다른 창 클릭 등) hidden이
    // 찍혀서 정상 연주 중에도 노트가 툭툭 끊기는 회귀가 있었다.
    const releaseAllHeld = () => {
      heldKeysRef.current.forEach((code) => {
        const pitch = keymapRef.current[code];
        if (pitch !== undefined) release(pitch);
      });
      heldKeysRef.current.clear();
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', releaseAllHeld);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', releaseAllHeld);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const whiteKeys = pianoKeys.filter((k) => !k.black);
  const whiteWidth = 100 / whiteKeys.length;

  return (
    <div className="piano-wrap">
      <div className="octave-shift">
        <button
          type="button"
          disabled={octaveOffset <= OCTAVE_OFFSET_MIN}
          onClick={() => setOctaveOffset((o) => Math.max(OCTAVE_OFFSET_MIN, o - 1))}
        >
          ◀ 옥타브
        </button>
        <span className="octave-label">{rootNoteLabel(octaveOffset)}</span>
        <button
          type="button"
          disabled={octaveOffset >= OCTAVE_OFFSET_MAX}
          onClick={() => setOctaveOffset((o) => Math.min(OCTAVE_OFFSET_MAX, o + 1))}
        >
          옥타브 ▶
        </button>
      </div>

      <div className="piano">
        {pianoKeys.map((k, i) => {
          if (!k.black) {
            const whiteIndex = whiteKeys.findIndex((w) => w.pitch === k.pitch);
            return (
              <div
                key={k.pitch}
                className={`piano-key white ${active.has(k.pitch) ? 'active' : ''}`}
                style={{ left: `${whiteIndex * whiteWidth}%`, width: `${whiteWidth}%` }}
                {...touchHandlers(k.pitch)}
              >
                <span className="key-label">{k.key}</span>
              </div>
            );
          }
          // 검은건반: 직전 흰건반 기준 오른쪽에 걸치도록 배치
          const prevWhiteIndex = whiteKeys.findIndex((w) => w.pitch === pianoKeys[i - 1].pitch);
          const left = (prevWhiteIndex + 1) * whiteWidth - (whiteWidth * 0.3);
          return (
            <div
              key={k.pitch}
              className={`piano-key black ${active.has(k.pitch) ? 'active' : ''}`}
              style={{ left: `${left}%`, width: `${whiteWidth * 0.6}%` }}
              {...touchHandlers(k.pitch)}
            >
              <span className="key-label">{k.key}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
