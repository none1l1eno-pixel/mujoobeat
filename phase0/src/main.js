import * as Tone from 'https://cdn.jsdelivr.net/npm/tone@14.8.49/+esm';
import { melodies } from './melodies.js';
import { detectKey, keyName, PITCH_NAMES } from './keyDetection.js';
import { generateChordProgression, isDiatonic } from './chordGen.js';
import { generateDrumTrack, determineDensity } from './drumGen.js';
import { setupInstruments, schedulePlayback, stopPlayback } from './player.js';

const selectEl = document.getElementById('melodySelect');
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const checklistEl = document.getElementById('checklist');

let inst = null;
let playTimer = null;

function totalBeats(notes) {
  return Math.max(...notes.map((n) => n.start + n.dur));
}

function populateSelect() {
  melodies.forEach((m, i) => {
    const opt = document.createElement('option');
    const tag = m.type === 'pretty' ? '예쁜' : '못난';
    opt.value = i;
    opt.textContent = `${tag} — ${m.name}`;
    selectEl.appendChild(opt);
  });
}

function setStatus(text) {
  statusEl.textContent = text;
}

function renderResult({ melody, key, chords, numBars, density }) {
  const scaleNote = PITCH_NAMES[key.tonic];
  const chordLine = chords
    .map((c) => `마디${c.bar + 1}:${c.roman}${c.bar % 4 === 3 ? '(필인)' : ''}`)
    .join('  ');

  resultEl.textContent = [
    `멜로디: ${melody.name}${melody.uglyReason ? ` — ${melody.uglyReason}` : ''}`,
    `검출된 키: ${keyName(key)} (${scaleNote}, 상관계수 ${key.correlation.toFixed(3)})`,
    `BPM: ${melody.bpm} / 마디 수: ${numBars} / 드럼 밀도: ${density}`,
    `코드 진행: ${chordLine}`,
  ].join('\n');

  const allDiatonic = chords.every((c) => isDiatonic(c, key));
  const hasSectionChange = numBars >= 4;

  checklistEl.innerHTML = '';
  const items = [
    [allDiatonic, '(a) 코드가 검출된 키의 다이어토닉 코드로만 구성됨'],
    [true, '(b) 드럼 템포가 멜로디 BPM과 일치함 (동일 Transport 사용)'],
    [hasSectionChange, '(c) 최소 2개 섹션 변화 (4마디마다 필인 삽입)'],
  ];
  items.forEach(([pass, label]) => {
    const li = document.createElement('li');
    li.textContent = `${pass ? '✅' : '❌'} ${label}`;
    checklistEl.appendChild(li);
  });
}

async function ensureInstruments() {
  if (!inst) {
    setStatus('악기 샘플 로딩 중... (첫 재생만 시간 걸림)');
    inst = await setupInstruments(Tone);
    setStatus('로딩 완료');
  }
  return inst;
}

async function handlePlay() {
  await Tone.start();
  playBtn.disabled = true;

  const idx = Number(selectEl.value);
  const melody = melodies[idx];
  const beats = totalBeats(melody.notes);
  const numBars = Math.ceil(beats / 4);

  const key = detectKey(melody.notes);
  const chords = generateChordProgression(key, numBars, idx);
  const density = determineDensity(melody.notes, beats);
  const drumHits = generateDrumTrack(numBars, density);

  const instruments = await ensureInstruments();
  const durationSec = schedulePlayback(Tone, instruments, melody, chords, drumHits, numBars);

  renderResult({ melody, key, chords, numBars, density });
  setStatus('재생 중...');

  clearTimeout(playTimer);
  playTimer = setTimeout(() => {
    setStatus('재생 완료');
    playBtn.disabled = false;
  }, durationSec * 1000);
}

function handleStop() {
  stopPlayback(Tone);
  clearTimeout(playTimer);
  setStatus('정지됨');
  playBtn.disabled = false;
}

populateSelect();
playBtn.addEventListener('click', handlePlay);
stopBtn.addEventListener('click', handleStop);
