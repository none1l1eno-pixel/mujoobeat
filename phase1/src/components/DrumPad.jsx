import { useEffect, useRef, useState } from 'react';
import { DRUM_PADS, DRUM_KEY_MAP } from '../audio/keyboardMap';

export default function DrumPad({ onHit }) {
  const [active, setActive] = useState(() => new Set());
  const heldKeysRef = useRef(new Set());

  const hit = (sound) => {
    onHit(sound);
    setActive((prev) => new Set(prev).add(sound));
    setTimeout(() => {
      setActive((prev) => {
        const next = new Set(prev);
        next.delete(sound);
        return next;
      });
    }, 120);
  };

  useEffect(() => {
    // e.code로 매칭 — e.key는 Shift/CapsLock에 따라 keydown/keyup 사이에 값이
    // 달라질 수 있어 heldKeysRef가 안 풀리고 "끼는" 버그의 원인이 된다.
    const handleKeyDown = (e) => {
      const sound = DRUM_KEY_MAP[e.code];
      if (!sound || heldKeysRef.current.has(e.code)) return;
      heldKeysRef.current.add(e.code);
      hit(sound);
    };
    const handleKeyUp = (e) => {
      heldKeysRef.current.delete(e.code);
    };
    const releaseAllHeld = () => heldKeysRef.current.clear();
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

  return (
    <div className="drum-pad">
      {DRUM_PADS.map((p) => (
        <button
          key={p.sound}
          className={`pad ${active.has(p.sound) ? 'active' : ''}`}
          onMouseDown={() => hit(p.sound)}
          onTouchStart={(e) => { e.preventDefault(); hit(p.sound); }}
        >
          <span>{p.label}</span>
          <span className="key-label">{p.key}</span>
        </button>
      ))}
    </div>
  );
}
