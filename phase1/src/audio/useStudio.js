/**
 * Phase 1 라이브 연주 + 녹음 엔진.
 * - 4박 카운트인 → 녹음 (선율악기 노트 또는 드럼 히트 캡처, plan.md 7장 플로우)
 * - 메트로놈 토글 (카운트인은 항상 울림, 토글은 녹음 중 지속 클릭 여부)
 * - 완료된 테이크는 onTakeRecorded 콜백으로 넘김 (트랙 목록 관리는 useArrangement가 담당)
 * 타이밍은 정확도를 위해 React state가 아닌 ref + Tone.Transport로 관리한다.
 */
import { useCallback, useRef, useState } from 'react';
import * as Tone from 'tone';
import { midiToNoteName } from './instruments';

const COUNT_IN_BEATS = 4;

export function useStudio(instRef, activeMelodicRef, onTakeRecorded) {
  const [bpm, setBpm] = useState(90);
  const [metronomeOn, setMetronomeOn] = useState(true);
  const [status, setStatus] = useState('idle'); // idle | countin | recording
  const [countInBeat, setCountInBeat] = useState(0);

  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;
  const metronomeOnRef = useRef(metronomeOn);
  metronomeOnRef.current = metronomeOn;

  const statusRef = useRef('idle');
  const pendingNotesRef = useRef(new Map()); // pitch -> startBeat (멜로디 노트만 held 추적)
  const capturedRef = useRef([]);
  const recordStartSecRef = useRef(0);
  const recordBeatCounterRef = useRef(0);
  const recordingMetaRef = useRef({ kind: 'melodic', instrument: 'piano' });

  const secPerBeat = useCallback(() => 60 / bpmRef.current, []);

  const clickTick = useCallback((time, beatIndexInBar, isCountIn) => {
    const inst = instRef.current;
    if (!inst?.drums) return;
    if (isCountIn || metronomeOnRef.current) {
      const pitch = beatIndexInBar === 0 ? 'C3' : 'G2';
      inst.drums.click.triggerAttackRelease(pitch, '16n', time);
    }
  }, [instRef]);

  const teardownTransport = useCallback(() => {
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    Tone.Transport.position = 0;
  }, []);

  /** @param {{kind:'melodic'|'drum', instrument:string}} meta */
  const startRecording = useCallback((meta) => {
    const inst = instRef.current;
    if (!inst || statusRef.current !== 'idle') return;

    recordingMetaRef.current = meta;
    teardownTransport();
    Tone.Transport.bpm.value = bpmRef.current;
    const spb = secPerBeat();

    statusRef.current = 'countin';
    setStatus('countin');
    setCountInBeat(0);
    pendingNotesRef.current = new Map();
    capturedRef.current = [];

    for (let b = 0; b < COUNT_IN_BEATS; b++) {
      Tone.Transport.schedule((time) => {
        clickTick(time, b % 4, true);
        Tone.Draw.schedule(() => setCountInBeat(b + 1), time);
      }, b * spb);
    }

    // recordStartSecRef는 Transport 상대시간(seconds)이어야 noteOn/noteOff의
    // Tone.Transport.seconds 기준과 일치한다. 콜백 인자 time(오디오컨텍스트 절대시간)을
    // 쓰면 안 됨 — 클럭이 달라서 노트 시작시간이 음수로 튐.
    recordStartSecRef.current = COUNT_IN_BEATS * spb;
    Tone.Transport.schedule((time) => {
      statusRef.current = 'recording';
      Tone.Draw.schedule(() => setStatus('recording'), time);
    }, COUNT_IN_BEATS * spb);

    // 녹음 중 지속 메트로놈 (카운트인 이후 계속, 4박마다 반복 스케줄)
    recordBeatCounterRef.current = 0;
    Tone.Transport.scheduleRepeat((time) => {
      const beatInBar = recordBeatCounterRef.current % 4;
      clickTick(time, beatInBar, false);
      recordBeatCounterRef.current += 1;
    }, spb, COUNT_IN_BEATS * spb);

    Tone.Transport.start();
  }, [instRef, clickTick, secPerBeat, teardownTransport]);

  const stopRecording = useCallback(() => {
    if (statusRef.current !== 'recording' && statusRef.current !== 'countin') return;
    const spb = secPerBeat();
    const nowSec = Tone.Transport.seconds;

    // 아직 떼지 않은 멜로디 노트는 현재 시점에서 강제로 닫는다
    for (const [pitch, startBeat] of pendingNotesRef.current.entries()) {
      const elapsedBeat = (nowSec - recordStartSecRef.current) / spb;
      capturedRef.current.push({ pitch, start: startBeat, dur: Math.max(0.1, elapsedBeat - startBeat) });
    }
    pendingNotesRef.current = new Map();

    teardownTransport();
    statusRef.current = 'idle';
    setStatus('idle');
    setCountInBeat(0);

    const notes = capturedRef.current.slice().sort((a, b) => a.start - b.start);
    if (notes.length > 0) {
      const { kind, instrument } = recordingMetaRef.current;
      onTakeRecorded({ kind, instrument, bpm: bpmRef.current, notes });
    }
  }, [secPerBeat, teardownTransport, onTakeRecorded]);

  const noteOn = useCallback((pitch) => {
    const sampler = instRef.current?.melodic?.[activeMelodicRef.current];
    if (!sampler) return;
    sampler.triggerAttack(midiToNoteName(pitch));

    if (statusRef.current === 'recording') {
      const spb = secPerBeat();
      const elapsedBeat = (Tone.Transport.seconds - recordStartSecRef.current) / spb;
      pendingNotesRef.current.set(pitch, elapsedBeat);
    }
  }, [instRef, activeMelodicRef, secPerBeat]);

  const noteOff = useCallback((pitch) => {
    const sampler = instRef.current?.melodic?.[activeMelodicRef.current];
    if (!sampler) return;
    sampler.triggerRelease(midiToNoteName(pitch));

    if (statusRef.current === 'recording' && pendingNotesRef.current.has(pitch)) {
      const spb = secPerBeat();
      const startBeat = pendingNotesRef.current.get(pitch);
      const elapsedBeat = (Tone.Transport.seconds - recordStartSecRef.current) / spb;
      pendingNotesRef.current.delete(pitch);
      capturedRef.current.push({ pitch, start: startBeat, dur: Math.max(0.1, elapsedBeat - startBeat) });
    }
  }, [instRef, activeMelodicRef, secPerBeat]);

  /** 드럼은 순간 타격이라 on/off 구분 없이 캡처만 한다 (재생은 App이 별도로 즉시 트리거). */
  const drumHit = useCallback((sound) => {
    if (statusRef.current !== 'recording') return;
    const spb = secPerBeat();
    const elapsedBeat = (Tone.Transport.seconds - recordStartSecRef.current) / spb;
    capturedRef.current.push({ sound, start: elapsedBeat, dur: 0.1 });
  }, [secPerBeat]);

  return {
    bpm, setBpm,
    metronomeOn, setMetronomeOn,
    status, countInBeat,
    startRecording, stopRecording,
    noteOn, noteOff, drumHit,
  };
}
