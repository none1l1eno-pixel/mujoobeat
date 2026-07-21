/**
 * 미니 DAW: 멀티트랙 타임라인 상태 + 재생 (plan.md 5장 P1).
 * 퀀타이즈(강도/그리드, 원본 보존 — 12장 v0.3.4 확정).
 * Phase 3.5: 모든 변경은 {kind, ...} 형태의 op로도 표현되어 onLocalOp로 흘려보내고,
 * applyRemoteOp으로 다른 클라이언트의 op를 받아 그대로 반영한다 — 실시간 동시편집의
 * 로컬 상태 절반. 트랙 id는 여러 클라이언트가 동시에 만들어도 안 겹치도록 UUID.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { midiToNoteName, triggerDrum, MELODIC_INSTRUMENTS } from './instruments';

const genId = () => (crypto.randomUUID ? crypto.randomUUID() : `track-${Date.now()}-${Math.random()}`);

const MELODIC_LABELS = Object.fromEntries(MELODIC_INSTRUMENTS.map((m) => [m.id, m.label]));

function cloneNotes(notes) {
  return notes.map((n) => ({ ...n }));
}

function trackSpan(track) {
  const localEnd = track.notes.reduce((max, n) => Math.max(max, n.start + n.dur), 0);
  return { start: track.offsetBeats, end: track.offsetBeats + localEnd };
}

export function useArrangement(instRef, bpm, onLocalOp) {
  const [tracks, setTracks] = useState([]);
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [playing, setPlaying] = useState(false);
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;

  const tracksRef = useRef(tracks);
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);

  const onLocalOpRef = useRef(onLocalOp);
  onLocalOpRef.current = onLocalOp;
  const emit = useCallback((op) => onLocalOpRef.current?.(op), []);

  /** 프로젝트를 서버에서 처음 불러올 때 통째로 갈아끼운다 (op 브로드캐스트 없음). */
  const loadSnapshot = useCallback((newTracks) => {
    setTracks(newTracks.map((t) => ({ ...t, notes: cloneNotes(t.notes), originalNotes: cloneNotes(t.originalNotes ?? t.notes) })));
    setSelectedTrackId(null);
  }, []);

  const addTrack = useCallback((take) => {
    const baseLabel = take.label ?? (take.kind === 'drum' ? '드럼' : (MELODIC_LABELS[take.instrument] ?? take.instrument));
    const sameKindCount = tracksRef.current.filter((t) => t.instrument === take.instrument).length + 1;
    const track = {
      id: genId(),
      label: take.label ? baseLabel : `${baseLabel} ${sameKindCount}`,
      kind: take.kind,
      instrument: take.instrument,
      offsetBeats: take.offsetBeats ?? 0,
      notes: cloneNotes(take.notes),
      originalNotes: cloneNotes(take.notes),
      volume: 1,
      muted: false,
      solo: false,
    };
    setTracks((prev) => [...prev, track]);
    setSelectedTrackId(track.id);
    emit({ kind: 'add_track', track });
  }, [emit]);

  const updateTrack = useCallback((id, patch) => {
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    emit({ kind: 'update_track', id, patch });
  }, [emit]);

  const deleteTrack = useCallback((id) => {
    setTracks((prev) => prev.filter((t) => t.id !== id));
    setSelectedTrackId((cur) => (cur === id ? null : cur));
    emit({ kind: 'delete_track', id });
  }, [emit]);

  const duplicateTrack = useCallback((id) => {
    const src = tracksRef.current.find((t) => t.id === id);
    if (!src) return;
    const copy = {
      ...src,
      id: genId(),
      label: `${src.label} 복사본`,
      notes: cloneNotes(src.notes),
      originalNotes: cloneNotes(src.originalNotes),
    };
    setTracks((prev) => [...prev, copy]);
    setSelectedTrackId(copy.id);
    emit({ kind: 'add_track', track: copy });
  }, [emit]);

  const moveTrack = useCallback((id, newOffsetBeats) => {
    const offsetBeats = Math.max(0, newOffsetBeats);
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, offsetBeats } : t)));
    emit({ kind: 'update_track', id, patch: { offsetBeats } });
  }, [emit]);

  /** globalSplitBeat 위치에서 트랙을 두 개로 자른다. */
  const splitTrack = useCallback((id, globalSplitBeat) => {
    const src = tracksRef.current.find((t) => t.id === id);
    if (!src) return;
    const localSplit = globalSplitBeat - src.offsetBeats;
    const before = src.notes
      .filter((n) => n.start < localSplit)
      .map((n) => ({ ...n, dur: Math.min(n.dur, localSplit - n.start) }));
    const after = src.notes
      .filter((n) => n.start >= localSplit)
      .map((n) => ({ ...n, start: n.start - localSplit }));
    if (before.length === 0 || after.length === 0) return; // 자를 게 없으면 무시

    const trackBefore = { ...src, id: genId(), label: `${src.label}-A`, notes: before, originalNotes: before };
    const trackAfter = {
      ...src, id: genId(), label: `${src.label}-B`,
      offsetBeats: src.offsetBeats + localSplit, notes: after, originalNotes: after,
    };
    setTracks((prev) => prev.flatMap((t) => (t.id === id ? [trackBefore, trackAfter] : [t])));
    setSelectedTrackId(trackBefore.id);
    emit({ kind: 'split_track', id, trackBefore, trackAfter });
  }, [emit]);

  const quantizeApply = useCallback((id, newNotes) => {
    const notes = cloneNotes(newNotes);
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, notes } : t)));
    emit({ kind: 'update_track', id, patch: { notes } });
  }, [emit]);

  const quantizeRevert = useCallback((id) => {
    const src = tracksRef.current.find((t) => t.id === id);
    if (!src) return;
    const notes = cloneNotes(src.originalNotes);
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, notes } : t)));
    emit({ kind: 'update_track', id, patch: { notes } });
  }, [emit]);

  /** 다른 클라이언트가 보낸 op를 그대로 반영한다 (재브로드캐스트 없음). */
  const applyRemoteOp = useCallback((op) => {
    switch (op.kind) {
      case 'add_track':
        setTracks((prev) => (prev.some((t) => t.id === op.track.id) ? prev : [...prev, op.track]));
        break;
      case 'update_track':
        setTracks((prev) => prev.map((t) => (t.id === op.id ? { ...t, ...op.patch } : t)));
        break;
      case 'delete_track':
        setTracks((prev) => prev.filter((t) => t.id !== op.id));
        setSelectedTrackId((cur) => (cur === op.id ? null : cur));
        break;
      case 'split_track':
        setTracks((prev) => prev.flatMap((t) => (t.id === op.id ? [op.trackBefore, op.trackAfter] : [t])));
        break;
      default:
        break;
    }
  }, []);

  const triggerNote = useCallback((track, note, time) => {
    const inst = instRef.current;
    if (!inst) return;
    if (track.kind === 'drum') {
      if (inst.drums) triggerDrum(inst.drums, note.sound, time, track.volume * (note.velocity ?? 1));
    } else {
      const sampler = inst.melodic?.[track.instrument];
      if (sampler) {
        const spb = 60 / bpmRef.current;
        sampler.triggerAttackRelease(midiToNoteName(note.pitch), note.dur * spb * 0.95, time, track.volume);
      }
    }
  }, [instRef]);

  const stopAll = useCallback(() => {
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    Tone.Transport.position = 0;
    setPlaying(false);
  }, []);

  /** 전체 트랙을 뮤트/솔로 규칙에 따라 함께 재생한다. */
  const playAll = useCallback(() => {
    if (tracks.length === 0) return;
    stopAll();
    Tone.Transport.bpm.value = bpmRef.current;
    const spb = 60 / bpmRef.current;

    const hasSolo = tracks.some((t) => t.solo);
    const audible = tracks.filter((t) => (hasSolo ? t.solo : !t.muted));

    let maxBeat = 1;
    audible.forEach((track) => {
      track.notes.forEach((n) => {
        const globalStart = track.offsetBeats + n.start;
        maxBeat = Math.max(maxBeat, globalStart + n.dur);
        Tone.Transport.schedule((time) => triggerNote(track, n, time), globalStart * spb);
      });
    });

    const barCount = Math.ceil(maxBeat / 4);
    Tone.Transport.schedule(() => {
      stopAll();
    }, barCount * 4 * spb);

    setPlaying(true);
    Tone.Transport.start();
  }, [tracks, stopAll, triggerNote]);

  /** 퀀타이즈 미리듣기: 상태를 건드리지 않고 previewNotes만 단독 재생한다. */
  const playPreview = useCallback((track, previewNotes) => {
    stopAll();
    Tone.Transport.bpm.value = bpmRef.current;
    const spb = 60 / bpmRef.current;
    let maxBeat = 1;
    previewNotes.forEach((n) => {
      maxBeat = Math.max(maxBeat, n.start + n.dur);
      Tone.Transport.schedule((time) => triggerNote(track, n, time), n.start * spb);
    });
    const barCount = Math.ceil(maxBeat / 4);
    Tone.Transport.schedule(() => stopAll(), barCount * 4 * spb);
    setPlaying(true);
    Tone.Transport.start();
  }, [stopAll, triggerNote]);

  return {
    tracks, selectedTrackId, setSelectedTrackId, playing,
    addTrack, updateTrack, deleteTrack, duplicateTrack, moveTrack, splitTrack,
    quantizeApply, quantizeRevert,
    playAll, playPreview, stopAll,
    trackSpan, loadSnapshot, applyRemoteOp,
  };
}
