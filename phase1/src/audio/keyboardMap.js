/**
 * 컴퓨터 키보드 → 가상 악기 매핑.
 * 피아노류: 흰건반(a s d f g h j k) + 검은건반(w e   t y u), 옥타브 기준(semitone 0=근음).
 * 옥타브 이동 버튼으로 근음(BASE_ROOT_MIDI + octaveOffset*12)을 바꿔 넓은 음역을 커버한다.
 */
export const BASE_ROOT_MIDI = 60; // C4, octaveOffset === 0 일 때 근음
export const OCTAVE_OFFSET_MIN = -2;
export const OCTAVE_OFFSET_MAX = 2;

const PIANO_KEY_TEMPLATE = [
  { semitone: 0, key: 'a', black: false },
  { semitone: 1, key: 'w', black: true },
  { semitone: 2, key: 's', black: false },
  { semitone: 3, key: 'e', black: true },
  { semitone: 4, key: 'd', black: false },
  { semitone: 5, key: 'f', black: false },
  { semitone: 6, key: 't', black: true },
  { semitone: 7, key: 'g', black: false },
  { semitone: 8, key: 'y', black: true },
  { semitone: 9, key: 'h', black: false },
  { semitone: 10, key: 'u', black: true },
  { semitone: 11, key: 'j', black: false },
  { semitone: 12, key: 'k', black: false },
];

/**
 * 물리적 키(e.code)로 매칭한다 — e.key는 Shift/CapsLock에 따라 'a'/'A'로
 * 바뀌어서, keydown 때와 keyup 때 값이 달라지면 눌림 상태가 풀리지 않고
 * "끼는" 버그가 생긴다(간헐적으로 특정 키가 안 먹히는 원인). e.code는
 * 물리 키 위치라 모디파이어와 무관하게 항상 동일하다.
 */
export function keyToCode(letter) {
  return `Key${letter.toUpperCase()}`;
}

export function getPianoKeys(octaveOffset = 0) {
  const root = BASE_ROOT_MIDI + octaveOffset * 12;
  return PIANO_KEY_TEMPLATE.map((k) => ({ ...k, pitch: root + k.semitone, code: keyToCode(k.key) }));
}

export function rootNoteLabel(octaveOffset = 0) {
  return `C${4 + octaveOffset}`;
}

export const DRUM_KEY_MAP = {
  KeyA: 'kick', KeyS: 'snare', KeyD: 'hihat', KeyF: 'tom',
};

export const DRUM_PADS = [
  { sound: 'kick', key: 'a', label: '킥' },
  { sound: 'snare', key: 's', label: '스네어' },
  { sound: 'hihat', key: 'd', label: '하이햇' },
  { sound: 'tom', key: 'f', label: '탐' },
];
