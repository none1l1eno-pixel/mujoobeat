/**
 * WAV 내보내기 (plan.md Phase 4). Tone.Offline으로 전체 편곡을 실시간보다 빠르게
 * 오프라인 렌더링한 뒤 16bit PCM WAV로 인코딩해 다운로드한다. 서버 왕복 없이 전부
 * 브라우저에서 처리 — "소리는 브라우저" 원칙(9.1절) 그대로.
 */
import * as Tone from 'tone';
import { midiToNoteName, triggerDrum, createDrumKit, createMelodicSampler } from './instruments';

const TAIL_SECONDS = 2; // 마지막 노트의 릴리즈 꼬리가 잘리지 않게 여유를 둔다

export async function renderArrangementToWav(tracks, bpm) {
  const hasSolo = tracks.some((t) => t.solo);
  const audible = tracks.filter((t) => (hasSolo ? t.solo : !t.muted));
  if (audible.length === 0) throw new Error('내보낼 트랙이 없어요.');

  const spb = 60 / bpm;
  let maxBeat = 1;
  audible.forEach((track) => {
    track.notes.forEach((n) => {
      maxBeat = Math.max(maxBeat, track.offsetBeats + n.start + n.dur);
    });
  });
  const duration = maxBeat * spb + TAIL_SECONDS;

  const neededMelodic = [...new Set(audible.filter((t) => t.kind !== 'drum').map((t) => t.instrument))];
  const needsDrums = audible.some((t) => t.kind === 'drum');

  const rendered = await Tone.Offline(async ({ transport }) => {
    // 오프라인 컨텍스트 전용 악기 인스턴스 — 온라인 캐시는 다른 AudioContext에 묶여 있어 재사용 불가.
    const melodic = Object.fromEntries(neededMelodic.map((id) => [id, createMelodicSampler(id)]));
    const drums = needsDrums ? createDrumKit() : null;
    await Tone.loaded();

    transport.bpm.value = bpm;
    audible.forEach((track) => {
      track.notes.forEach((n) => {
        const globalStart = track.offsetBeats + n.start;
        transport.schedule((time) => {
          if (track.kind === 'drum') {
            if (drums) triggerDrum(drums, n.sound, time, track.volume * (n.velocity ?? 1));
          } else {
            const sampler = melodic[track.instrument];
            if (sampler) sampler.triggerAttackRelease(midiToNoteName(n.pitch), n.dur * spb * 0.95, time, track.volume);
          }
        }, globalStart * spb);
      });
    });
    transport.start(0);
  }, duration);

  return audioBufferToWavBlob(rendered.get());
}

function audioBufferToWavBlob(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const numFrames = audioBuffer.length;
  const blockAlign = numChannels * 2; // 16bit
  const dataSize = numFrames * blockAlign;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels = [];
  for (let ch = 0; ch < numChannels; ch++) channels.push(audioBuffer.getChannelData(ch));

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
