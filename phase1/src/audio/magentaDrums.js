/**
 * Magenta.js(DrumsRNN) 기반 드럼 생성 — plan.md 9.2절 "2단계 Magenta.js" 도입.
 * 기존 drumGen.js(규칙 기반 고정 템플릿)는 스타일이 같으면 항상 같은 패턴이 나오는
 * 한계가 있었다. DrumsRNN은 짧은 시드에서 확률적으로 이어 생성하므로 같은 스타일/
 * 밀도를 넣어도 매번 다른 패턴이 나온다. 전부 브라우저(TF.js)에서 동작 — "소리는
 * 브라우저" 원칙 유지, 서버 왕복 없음.
 */
const CHECKPOINT = 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/drum_kit_rnn';
const STEPS_PER_BAR = 16;

// @magenta/music(TF.js 포함)는 번들이 커서(3MB+) 실제로 AI 생성을 누를 때만
// 동적으로 불러온다 — 모바일 우선 앱에서 초기 로딩에 영향 안 주려고.
let rnnPromise = null;
function getModel() {
  if (!rnnPromise) {
    rnnPromise = import('@magenta/music/es6').then((mm) => {
      const rnn = new mm.MusicRNN(CHECKPOINT);
      return rnn.initialize().then(() => rnn);
    });
  }
  return rnnPromise;
}

// Magenta drum_kit_rnn 출력 피치 → 우리 4종 사운드로 근사 매핑
const PITCH_TO_SOUND = {
  35: 'kick', 36: 'kick',
  37: 'snare', 38: 'snare', 39: 'snare', 40: 'snare',
  42: 'hihat', 44: 'hihat', 46: 'hihat',
  41: 'tom', 43: 'tom', 45: 'tom', 47: 'tom', 48: 'tom', 50: 'tom',
  49: 'hihat', 51: 'hihat', 52: 'hihat', 53: 'hihat', 55: 'hihat', 57: 'hihat', 59: 'hihat',
};

const SEED_STEPS = 4; // 딱 한 박(프라임)만 — 시드가 길면 그만큼 RNN이 생성할 자리가 줄어든다

/**
 * 스타일별 "한 박" 프라임 — 여기서부터 RNN이 확률적으로 이어 붙인다.
 * 시드를 1마디 통째로 고정하면 짧은 멜로디(1마디)에서는 결과가 전부 시드로만
 * 채워져 항상 똑같이 나오는 문제가 있었다 — 그래서 최소한으로만 프라임한다.
 */
function buildSeed(style, density) {
  const notes = [];
  const push = (pitch, step) => notes.push({ pitch, quantizedStartStep: step, quantizedEndStep: step + 1, isDrum: true, program: 0 });

  push(36, 0); // 킥으로 다운비트만 프라임
  if (style === 'rock' || density === 'busy') push(42, 2); // 락/촘촘한 밀도면 하이햇도 살짝

  return {
    notes,
    quantizationInfo: { stepsPerQuarter: 4 },
    totalQuantizedSteps: SEED_STEPS,
  };
}

/**
 * @param {number} numBars
 * @param {'sparse'|'busy'} density
 * @param {'pop'|'rock'|'ballad'|'lofi'} style
 * @param {number} temperature 높을수록 더 무작위/실험적 (기본 1.1)
 */
export async function generateMagentaDrumTrack(numBars, density = 'sparse', style = 'pop', temperature = 1.1) {
  const model = await getModel();
  const seed = buildSeed(style, density);
  const remainingSteps = Math.max(SEED_STEPS, numBars * STEPS_PER_BAR - seed.totalQuantizedSteps);

  const continuation = await model.continueSequence(seed, remainingSteps, temperature);

  const seedHits = seed.notes.map((n) => ({ pitch: n.pitch, step: n.quantizedStartStep }));
  const contHits = continuation.notes.map((n) => ({ pitch: n.pitch, step: n.quantizedStartStep }));

  // continueSequence는 시드 이후부터 이어지는 절대 스텝을 돌려준다고 가정하되,
  // 혹시 0부터 다시 시작하는 구현이면 시드 길이만큼 밀어준다 (둘 다 안전하게 처리).
  const contStartsFromZero = contHits.every((h) => h.step < remainingSteps) && contHits.some((h) => h.step === 0);
  const offset = contStartsFromZero ? seed.totalQuantizedSteps : 0;

  const allHits = [
    ...seedHits,
    ...contHits.map((h) => ({ pitch: h.pitch, step: h.step + offset })),
  ];

  const totalSteps = numBars * STEPS_PER_BAR;
  const seen = new Set(); // 같은 스텝에 여러 피치가 같은 사운드(예: 하이햇 계열)로 몰리는 경우 중복 제거
  return allHits
    .filter((h) => h.step < totalSteps)
    .map((h) => {
      const bar = Math.floor(h.step / STEPS_PER_BAR);
      const stepInBar = h.step % STEPS_PER_BAR;
      const sound = PITCH_TO_SOUND[h.pitch] ?? 'hihat';
      return {
        sound,
        bar,
        step: stepInBar,
        velocity: sound === 'kick' ? 0.9 : sound === 'snare' ? 1 : 0.6,
        start: bar * 4 + stepInBar / 4,
        dur: 0.1,
      };
    })
    .filter((hit) => {
      const key = `${hit.sound}|${hit.start}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
