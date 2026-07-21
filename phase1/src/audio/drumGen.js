/**
 * 규칙 기반 드럼 패턴 생성 (plan.md P0-1, 5장 스타일 프리셋).
 * 마디 4개마다 필인을 넣어 "최소 2개 섹션 변화" 기준(4장 2-c)을 만족시킨다.
 * 노트 밀도로 하이햇 서브디비전(8분/16분)을 결정한다.
 * 스타일 프리셋(팝/락/발라드/로파이)은 패턴 + 벨로시티(다이내믹)를 교체한다 —
 * 별도 샘플 음색 세트 대신 기존 신스 드럼의 다이내믹/밀도로 색깔을 낸다.
 */

const STEPS_PER_BAR = 16;

export function determineDensity(notes, totalBeats) {
  const density = notes.length / totalBeats;
  return density >= 1.2 ? 'busy' : 'sparse';
}

export const STYLE_PRESETS = [
  { id: 'pop', label: '팝' },
  { id: 'rock', label: '락' },
  { id: 'ballad', label: '발라드' },
  { id: 'lofi', label: '로파이' },
];

function popPattern(hihatStep, isFill) {
  if (!isFill) {
    const hits = [
      { sound: 'kick', step: 0, velocity: 0.9 },
      { sound: 'kick', step: 8, velocity: 0.85 },
      { sound: 'snare', step: 4, velocity: 1 },
      { sound: 'snare', step: 12, velocity: 1 },
    ];
    for (let s = 0; s < STEPS_PER_BAR; s += hihatStep) hits.push({ sound: 'hihat', step: s, velocity: 0.6 });
    return hits;
  }
  const hits = [
    { sound: 'kick', step: 0, velocity: 0.9 }, { sound: 'snare', step: 4, velocity: 1 },
    { sound: 'kick', step: 8, velocity: 0.85 }, { sound: 'snare', step: 10, velocity: 0.8 },
    { sound: 'snare', step: 12, velocity: 0.85 }, { sound: 'snare', step: 13, velocity: 0.9 },
    { sound: 'snare', step: 14, velocity: 0.95 }, { sound: 'snare', step: 15, velocity: 1 },
  ];
  for (let s = 0; s < STEPS_PER_BAR; s += 2) hits.push({ sound: 'hihat', step: s, velocity: 0.6 });
  return hits;
}

function rockPattern(hihatStep, isFill) {
  if (!isFill) {
    const hits = [
      { sound: 'kick', step: 0, velocity: 1 },
      { sound: 'kick', step: 6, velocity: 0.8 },
      { sound: 'kick', step: 8, velocity: 1 },
      { sound: 'kick', step: 10, velocity: 0.75 },
      { sound: 'snare', step: 4, velocity: 1 },
      { sound: 'snare', step: 12, velocity: 1 },
    ];
    for (let s = 0; s < STEPS_PER_BAR; s += Math.min(1, hihatStep)) hits.push({ sound: 'hihat', step: s, velocity: 0.85 });
    return hits;
  }
  const hits = [{ sound: 'kick', step: 0, velocity: 1 }, { sound: 'kick', step: 8, velocity: 1 }];
  for (let s = 8; s < STEPS_PER_BAR; s++) hits.push({ sound: 'snare', step: s, velocity: 0.7 + (s - 8) * 0.04 });
  hits.push({ sound: 'tom', step: 4, velocity: 0.9 });
  return hits;
}

function balladPattern(hihatStep, isFill) {
  if (!isFill) {
    const hits = [
      { sound: 'kick', step: 0, velocity: 0.7 },
      { sound: 'snare', step: 8, velocity: 0.75 },
    ];
    for (let s = 0; s < STEPS_PER_BAR; s += Math.max(hihatStep, 4)) hits.push({ sound: 'hihat', step: s, velocity: 0.4 });
    return hits;
  }
  return [
    { sound: 'kick', step: 0, velocity: 0.7 },
    { sound: 'tom', step: 8, velocity: 0.6 },
    { sound: 'snare', step: 12, velocity: 0.65 },
    { sound: 'snare', step: 14, velocity: 0.75 },
  ];
}

function lofiPattern(hihatStep, isFill) {
  if (!isFill) {
    const hits = [
      { sound: 'kick', step: 0, velocity: 0.6 },
      { sound: 'kick', step: 10, velocity: 0.5 },
      { sound: 'snare', step: 4, velocity: 0.55 },
      { sound: 'snare', step: 12, velocity: 0.55 },
    ];
    for (let s = 0; s < STEPS_PER_BAR; s += Math.max(hihatStep, 2)) hits.push({ sound: 'hihat', step: s, velocity: 0.3 });
    return hits;
  }
  return [
    { sound: 'kick', step: 0, velocity: 0.6 },
    { sound: 'snare', step: 12, velocity: 0.55 },
    { sound: 'snare', step: 14, velocity: 0.5 },
  ];
}

const PATTERN_BY_STYLE = { pop: popPattern, rock: rockPattern, ballad: balladPattern, lofi: lofiPattern };

/** @returns {{sound:string,bar:number,step:number,velocity:number,start:number,dur:number}[]} */
export function generateDrumTrack(numBars, density = 'sparse', style = 'pop') {
  const hihatStep = density === 'busy' ? 1 : 2; // 1=16분, 2=8분
  const patternFn = PATTERN_BY_STYLE[style] ?? popPattern;
  const hits = [];

  for (let bar = 0; bar < numBars; bar++) {
    const isFill = bar % 4 === 3; // 4마디마다 필인 (섹션 변화)
    const barHits = patternFn(hihatStep, isFill);
    barHits.forEach((h) => {
      hits.push({
        sound: h.sound,
        bar,
        step: h.step,
        velocity: h.velocity,
        start: bar * 4 + h.step / 4,
        dur: 0.1,
      });
    });
  }
  return hits;
}
