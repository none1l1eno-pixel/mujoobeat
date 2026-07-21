/**
 * 규칙 기반 드럼 패턴 생성 (plan.md P0-1, 9.2절).
 * 마디 4개마다 필인을 넣어 "최소 2개 섹션 변화" 기준(4장 2-c)을 만족시킨다.
 * 노트 밀도로 하이햇 서브디비전(8분/16분)을 결정한다.
 */

const STEPS_PER_BAR = 16;

export function determineDensity(notes, totalBeats) {
  const density = notes.length / totalBeats;
  return density >= 1.2 ? 'busy' : 'sparse';
}

export function generateDrumTrack(numBars, density = 'sparse') {
  const hihatStep = density === 'busy' ? 1 : 2; // 1=16분, 2=8분
  const hits = [];

  for (let bar = 0; bar < numBars; bar++) {
    const isFill = bar % 4 === 3; // 4마디마다 필인 (섹션 변화)

    if (!isFill) {
      hits.push({ sound: 'kick', bar, step: 0 });
      hits.push({ sound: 'kick', bar, step: 8 });
      hits.push({ sound: 'snare', bar, step: 4 });
      hits.push({ sound: 'snare', bar, step: 12 });
      for (let s = 0; s < STEPS_PER_BAR; s += hihatStep) {
        hits.push({ sound: 'hihat', bar, step: s });
      }
    } else {
      hits.push({ sound: 'kick', bar, step: 0 });
      hits.push({ sound: 'snare', bar, step: 4 });
      hits.push({ sound: 'kick', bar, step: 8 });
      hits.push({ sound: 'snare', bar, step: 10 });
      hits.push({ sound: 'snare', bar, step: 12 });
      hits.push({ sound: 'snare', bar, step: 13 });
      hits.push({ sound: 'snare', bar, step: 14 });
      hits.push({ sound: 'snare', bar, step: 15 });
      for (let s = 0; s < STEPS_PER_BAR; s += 2) {
        hits.push({ sound: 'hihat', bar, step: s });
      }
    }
  }
  return hits;
}
