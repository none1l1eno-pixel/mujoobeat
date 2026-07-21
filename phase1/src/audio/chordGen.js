/**
 * 규칙 기반 코드 진행 생성 (plan.md P0-2, 9.2절).
 * 검출된 키의 다이어토닉 7화음 중 진행 템플릿(예: I-V-vi-IV)에 따라
 * 마디별 피아노 보이싱(근음+3음+5음)을 만든다.
 */

import { PITCH_NAMES } from './keyDetection.js';

const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
const MAJOR_QUALITY = ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'];
const ROMAN_MAJOR = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];

const MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10];
const MINOR_QUALITY = ['min', 'dim', 'maj', 'min', 'min', 'maj', 'maj'];
const ROMAN_MINOR = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];

// 스케일 디그리 인덱스(0-based) 진행 템플릿
const PROGRESSIONS = {
  major: [
    [0, 4, 5, 3], // I - V - vi - IV
    [0, 5, 3, 4], // I - vi - IV - V
    [5, 3, 0, 4], // vi - IV - I - V
  ],
  minor: [
    [0, 5, 2, 6], // i - VI - III - VII
    [0, 3, 4, 0], // i - iv - v - i
  ],
};

const CHORD_OCTAVE_BASE = 48; // C3, 멜로디보다 낮은 register

function scaleInfo(key) {
  return key.mode === 'major'
    ? { steps: MAJOR_STEPS, quality: MAJOR_QUALITY, romans: ROMAN_MAJOR, progressions: PROGRESSIONS.major }
    : { steps: MINOR_STEPS, quality: MINOR_QUALITY, romans: ROMAN_MINOR, progressions: PROGRESSIONS.minor };
}

export function getScalePitchClasses(key) {
  const { steps } = scaleInfo(key);
  return steps.map((s) => (key.tonic + s) % 12);
}

function triadForDegree(key, degreeIndex) {
  const { steps, quality } = scaleInfo(key);
  const rootPc = (key.tonic + steps[degreeIndex]) % 12;
  const q = quality[degreeIndex];
  const thirdInterval = q === 'maj' ? 4 : 3;
  const fifthInterval = q === 'dim' ? 6 : 7;
  const root = CHORD_OCTAVE_BASE + rootPc;
  return [root, root + thirdInterval, root + fifthInterval];
}

/**
 * @param {{tonic:number, mode:'major'|'minor'}} key
 * @param {number} numBars
 * @param {number} variantIndex 멜로디마다 다른 진행을 쓰기 위한 인덱스
 */
export function generateChordProgression(key, numBars, variantIndex = 0) {
  const { romans, progressions } = scaleInfo(key);
  const template = progressions[variantIndex % progressions.length];
  const chords = [];
  for (let bar = 0; bar < numBars; bar++) {
    const degreeIndex = template[bar % template.length];
    chords.push({
      bar,
      startBeat: bar * 4,
      durBeats: 4,
      roman: romans[degreeIndex],
      notes: triadForDegree(key, degreeIndex),
    });
  }
  return chords;
}

export function chordLabel(chord) {
  return chord.roman;
}

export function isDiatonic(chord, key) {
  const scale = new Set(getScalePitchClasses(key));
  return chord.notes.every((n) => scale.has(((n % 12) + 12) % 12));
}

export { PITCH_NAMES };
