/**
 * Tone.js 재생 엔진. plan.md 9.2절 "신스 음색 금지" 원칙에 따라
 * 피아노(멜로디+코드)는 실제 샘플(Salamander) 사용. 드럼은 신스 기반
 * (킥/스네어/하이햇은 원래 신시사이즈가 표준이라 "미디 벨소리" 문제와 무관).
 */

export function midiToNoteName(midi) {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  return `${names[midi % 12]}${octave}`;
}

export async function setupInstruments(Tone) {
  const piano = new Tone.Sampler({
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
    release: 1,
    baseUrl: 'https://tonejs.github.io/audio/salamander/',
  }).toDestination();

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

  await Tone.loaded();
  return { piano, kick, snare, hihat };
}

/**
 * 멜로디+코드+드럼을 Tone.Transport에 스케줄링하고 재생을 시작한다.
 * @returns {number} 총 재생 길이(초)
 */
export function schedulePlayback(Tone, inst, melody, chords, drumHits, numBars) {
  Tone.Transport.stop();
  Tone.Transport.position = 0;
  Tone.Transport.cancel(0);
  Tone.Transport.bpm.value = melody.bpm;

  const secPerBeat = 60 / melody.bpm;

  melody.notes.forEach((n) => {
    const t = n.start * secPerBeat;
    const dur = n.dur * secPerBeat * 0.95;
    Tone.Transport.schedule((time) => {
      inst.piano.triggerAttackRelease(midiToNoteName(n.pitch), dur, time);
    }, t);
  });

  chords.forEach((c) => {
    const t = c.startBeat * secPerBeat;
    const dur = c.durBeats * secPerBeat * 0.95;
    Tone.Transport.schedule((time) => {
      c.notes.forEach((midi) => {
        inst.piano.triggerAttackRelease(midiToNoteName(midi), dur, time, 0.5);
      });
    }, t);
  });

  const sixteenth = secPerBeat / 4;
  drumHits.forEach((h) => {
    const t = (h.bar * 16 + h.step) * sixteenth;
    Tone.Transport.schedule((time) => {
      if (h.sound === 'kick') inst.kick.triggerAttackRelease('C1', '8n', time);
      else if (h.sound === 'snare') inst.snare.triggerAttackRelease('16n', time);
      else inst.hihat.triggerAttackRelease('C6', '32n', time, 0.6);
    }, t);
  });

  Tone.Transport.start();
  return numBars * 4 * secPerBeat + 1;
}

export function stopPlayback(Tone) {
  Tone.Transport.stop();
  Tone.Transport.cancel(0);
}
