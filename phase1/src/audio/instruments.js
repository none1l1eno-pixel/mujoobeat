/**
 * 가상 악기 사운드 소스. plan.md 9.2절 원칙 유지: 신스 음색 금지, 전부 샘플 기반.
 * 피아노: Tone.js 공식 데모(Salamander). 기타/바이올린/색소폰: tonejs-instruments
 * (nbrosowsky, CC BY 3.0 — README.md 라이선스 표기 참고). 드럼은 타악기 특성상 신스 표준.
 */
import * as Tone from 'tone';

const MELODIC_CONFIG = {
  piano: {
    baseUrl: 'https://tonejs.github.io/audio/salamander/',
    urls: {
      A0: 'A0.mp3', C1: 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3',
      A1: 'A1.mp3', C2: 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3',
      A2: 'A2.mp3', C3: 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3',
      A3: 'A3.mp3', C4: 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3',
      A4: 'A4.mp3', C5: 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3',
      A5: 'A5.mp3', C6: 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3',
      A6: 'A6.mp3', C7: 'C7.mp3', 'D#7': 'Ds7.mp3', 'F#7': 'Fs7.mp3',
      A7: 'A7.mp3', C8: 'C8.mp3',
    },
  },
  guitar: {
    baseUrl: 'https://nbrosowsky.github.io/tonejs-instruments/samples/guitar-acoustic/',
    urls: {
      A2: 'A2.mp3', C3: 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3',
      A3: 'A3.mp3', C4: 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3',
    },
  },
  violin: {
    baseUrl: 'https://nbrosowsky.github.io/tonejs-instruments/samples/violin/',
    urls: {
      G3: 'G3.mp3', C4: 'C4.mp3', E4: 'E4.mp3', G4: 'G4.mp3',
      C5: 'C5.mp3', E5: 'E5.mp3', G5: 'G5.mp3', C6: 'C6.mp3',
      E6: 'E6.mp3', G6: 'G6.mp3', A6: 'A6.mp3', C7: 'C7.mp3',
    },
  },
  saxophone: {
    baseUrl: 'https://nbrosowsky.github.io/tonejs-instruments/samples/saxophone/',
    urls: {
      'C#3': 'Cs3.mp3', E3: 'E3.mp3', G3: 'G3.mp3', 'A#3': 'As3.mp3',
      'C#4': 'Cs4.mp3', E4: 'E4.mp3', G4: 'G4.mp3', 'A#4': 'As4.mp3',
      'C#5': 'Cs5.mp3',
    },
  },
};

export const MELODIC_INSTRUMENTS = [
  { id: 'piano', label: '가상 피아노' },
  { id: 'guitar', label: '기타' },
  { id: 'violin', label: '바이올린' },
  { id: 'saxophone', label: '색소폰' },
];

export function midiToNoteName(midi) {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  return `${names[midi % 12]}${octave}`;
}

const melodicCache = {};
let drumCache = null;

/**
 * 샘플러를 새로 만들기만 하고 로딩은 기다리지 않는다. WAV 내보내기(exportWav.js)에서
 * Tone.Offline 콜백 안 오프라인 컨텍스트용으로 재사용 — 노드는 컨텍스트 종속이라
 * 온라인 캐시(melodicCache)를 그대로 못 쓰고 다시 만들어야 한다(URL은 브라우저 HTTP
 * 캐시에 걸려 있어 실제로는 빠르다).
 */
export function createMelodicSampler(id) {
  const cfg = MELODIC_CONFIG[id];
  if (!cfg) throw new Error(`unknown melodic instrument: ${id}`);
  return new Tone.Sampler({ urls: cfg.urls, baseUrl: cfg.baseUrl, release: 1 }).toDestination();
}

/** 선율 악기(피아노/기타/바이올린/색소폰) 샘플러를 지연 로딩 + 캐시한다. */
export async function loadMelodicInstrument(id) {
  if (melodicCache[id]) return melodicCache[id];
  const sampler = createMelodicSampler(id);
  await Tone.loaded();
  melodicCache[id] = sampler;
  return sampler;
}

/** 드럼 킷(킥/스네어/하이햇/탐)과 메트로놈 클릭을 새로 만든다 — 캐시 안 함(오프라인 렌더용). */
export function createDrumKit() {
  const kick = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 6,
    envelope: { attack: 0.001, decay: 0.3, sustain: 0 },
  }).toDestination();
  kick.volume.value = -4;

  const snare = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.15, sustain: 0 },
  }).toDestination();
  snare.volume.value = -8;

  const hihat = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.08, release: 0.01 },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 4000,
    octaves: 1.5,
  }).toDestination();
  hihat.volume.value = -18;

  const tom = new Tone.MembraneSynth({
    pitchDecay: 0.08,
    octaves: 4,
    envelope: { attack: 0.001, decay: 0.4, sustain: 0 },
  }).toDestination();
  tom.volume.value = -6;

  const click = new Tone.MembraneSynth({
    pitchDecay: 0.01,
    octaves: 2,
    envelope: { attack: 0.001, decay: 0.05, sustain: 0 },
  }).toDestination();
  click.volume.value = -10;

  return { kick, snare, hihat, tom, click };
}

export async function loadDrumKit() {
  if (drumCache) return drumCache;
  drumCache = createDrumKit();
  return drumCache;
}

export const DRUM_SOUNDS = {
  kick: { label: '킥', note: 'C1' },
  snare: { label: '스네어', note: null },
  hihat: { label: '하이햇', note: 'C6' },
  tom: { label: '탐', note: 'A1' },
};

export function triggerDrum(inst, sound, time, velocityScale = 1) {
  const t = time ?? Tone.now();
  if (sound === 'kick') inst.kick.triggerAttackRelease('C1', '8n', t, velocityScale);
  else if (sound === 'snare') inst.snare.triggerAttackRelease('16n', t, velocityScale);
  else if (sound === 'hihat') inst.hihat.triggerAttackRelease('C6', '32n', t, 0.6 * velocityScale);
  else if (sound === 'tom') inst.tom.triggerAttackRelease('A1', '8n', t, velocityScale);
}
