/**
 * Krumhansl-Schmuckler 키 검출 (plan.md 6장, 9.2절).
 * 노트의 duration-weighted 피치클래스 분포를 24개(장조12+단조12) 프로파일과
 * 상관계수 비교해 최고값을 조성으로 채택한다.
 */

export const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

function rotate(profile, tonic) {
  // index p(피치클래스) → profile[(p - tonic + 12) % 12]
  return Array.from({ length: 12 }, (_, p) => profile[(p - tonic + 12) % 12]);
}

function pearsonCorrelation(a, b) {
  const n = a.length;
  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, denA = 0, denB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  return num / Math.sqrt(denA * denB);
}

export function pitchClassWeights(notes) {
  const weights = new Array(12).fill(0);
  for (const n of notes) {
    weights[((n.pitch % 12) + 12) % 12] += n.dur;
  }
  return weights;
}

/** @returns {{tonic:number, mode:'major'|'minor', correlation:number}} */
export function detectKey(notes) {
  const weights = pitchClassWeights(notes);
  let best = null;
  for (let tonic = 0; tonic < 12; tonic++) {
    const corrMajor = pearsonCorrelation(weights, rotate(MAJOR_PROFILE, tonic));
    const corrMinor = pearsonCorrelation(weights, rotate(MINOR_PROFILE, tonic));
    if (!best || corrMajor > best.correlation) best = { tonic, mode: 'major', correlation: corrMajor };
    if (!best || corrMinor > best.correlation) best = { tonic, mode: 'minor', correlation: corrMinor };
  }
  return best;
}

export function keyName(key) {
  return `${PITCH_NAMES[key.tonic]} ${key.mode === 'major' ? '장조' : '단조'}`;
}
