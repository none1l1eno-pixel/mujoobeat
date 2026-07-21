import { useEffect, useMemo, useRef, useState } from 'react';
import { GRID_OPTIONS, STRENGTH_OPTIONS, computeQuantized } from '../audio/quantize';
import DrumSequencer from './DrumSequencer';

const PX_PER_BEAT = 32;
const ROW_HEIGHT = 92;
const TAP_THRESHOLD_PX = 4;
const DRUM_ROW_ORDER = ['hihat', 'snare', 'tom', 'kick'];

function trackEndBeat(track) {
  const localEnd = track.notes.reduce((max, n) => Math.max(max, n.start + n.dur), 0);
  return track.offsetBeats + localEnd;
}

function snapValue(value, gridBeats, enabled) {
  if (!enabled) return value;
  return Math.round(value / gridBeats) * gridBeats;
}

/** 블록 안에 표시할 노트 미리보기(멜로디: 음높이별 바 / 드럼: 타격별 행). */
function NoteMarks({ track }) {
  if (track.kind === 'drum') {
    return (
      <div className="note-marks">
        {track.notes.map((n, i) => {
          const row = Math.max(0, DRUM_ROW_ORDER.indexOf(n.sound));
          return (
            <span
              key={i}
              className="note-mark drum"
              style={{
                left: n.start * PX_PER_BEAT,
                top: `${(row / (DRUM_ROW_ORDER.length - 1)) * 80 + 8}%`,
              }}
            />
          );
        })}
      </div>
    );
  }

  const pitches = track.notes.map((n) => n.pitch);
  const minPitch = pitches.length ? Math.min(...pitches) : 60;
  const maxPitch = pitches.length ? Math.max(...pitches) : 60;
  const range = Math.max(1, maxPitch - minPitch);

  return (
    <div className="note-marks">
      {track.notes.map((n, i) => {
        const ratio = (n.pitch - minPitch) / range; // 0=낮은음, 1=높은음
        const topPercent = 88 - ratio * 76; // 높은음이 위로
        return (
          <span
            key={i}
            className="note-mark melodic"
            style={{
              left: n.start * PX_PER_BEAT,
              width: Math.max(3, n.dur * PX_PER_BEAT - 1),
              top: `${topPercent}%`,
            }}
          />
        );
      })}
    </div>
  );
}

export default function Timeline({
  tracks, selectedTrackId, setSelectedTrackId,
  onUpdateTrack, onDeleteTrack, onDuplicateTrack, onMoveTrack, onSplitTrack,
  onQuantizeApply, onQuantizeRevert, onPlayPreview,
  playing, playDisabled, onPlayAll, onStopAll,
}) {
  const [splitPoints, setSplitPoints] = useState({}); // trackId -> beat
  const [grid, setGrid] = useState(GRID_OPTIONS[0].id);
  const [strength, setStrength] = useState(1);
  const [previewNotes, setPreviewNotes] = useState(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const dragRef = useRef(null);

  const selectedTrack = tracks.find((t) => t.id === selectedTrackId) ?? null;

  useEffect(() => { setPreviewNotes(null); }, [selectedTrackId]);

  const totalBeats = useMemo(() => {
    const max = tracks.reduce((m, t) => Math.max(m, trackEndBeat(t)), 0);
    return Math.max(16, Math.ceil((max + 2) / 4) * 4); // 최소 4마디, 여유 2박
  }, [tracks]);

  const gridBeats = GRID_OPTIONS.find((g) => g.id === grid)?.beats ?? 0.5;

  const handlePreview = () => {
    if (!selectedTrack) return;
    const preview = computeQuantized(selectedTrack.notes, gridBeats, strength);
    setPreviewNotes(preview);
    onPlayPreview(selectedTrack, preview);
  };

  const handleApply = () => {
    if (!selectedTrack || !previewNotes) return;
    onQuantizeApply(selectedTrack.id, previewNotes);
    setPreviewNotes(null);
  };

  const handleCancelPreview = () => setPreviewNotes(null);

  const handlePointerDown = (track) => (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const laneRect = e.currentTarget.parentElement.getBoundingClientRect();
    dragRef.current = {
      trackId: track.id,
      startX: e.clientX,
      startOffset: track.offsetBeats,
      laneLeft: laneRect.left,
      moved: false,
    };
  };

  const handlePointerMove = (track) => (e) => {
    const d = dragRef.current;
    if (!d || d.trackId !== track.id) return;
    const deltaPx = e.clientX - d.startX;
    if (Math.abs(deltaPx) > TAP_THRESHOLD_PX) d.moved = true;
    if (d.moved) {
      const deltaBeats = deltaPx / PX_PER_BEAT;
      const rawOffset = d.startOffset + deltaBeats;
      onMoveTrack(track.id, snapValue(rawOffset, gridBeats, snapEnabled));
    }
  };

  const handlePointerUp = (track) => (e) => {
    const d = dragRef.current;
    if (d && d.trackId === track.id && !d.moved) {
      const rawRatio = (e.clientX - d.laneLeft) / PX_PER_BEAT;
      const beat = snapValue(rawRatio, gridBeats, snapEnabled);
      setSplitPoints((prev) => ({ ...prev, [track.id]: Math.max(0, beat) }));
      setSelectedTrackId(track.id);
    }
    dragRef.current = null;
  };

  if (tracks.length === 0) {
    return (
      <section className="timeline empty">
        <p>아직 녹음된 트랙이 없어요. 악기를 골라 녹음하면 여기에 트랙으로 쌓여요.</p>
      </section>
    );
  }

  return (
    <section className="timeline">
      <div className="timeline-toolbar">
        <button onClick={playing ? onStopAll : onPlayAll} disabled={!playing && playDisabled}>
          {playing ? '■ 정지' : '▶ 전체 재생'}
        </button>
        <button
          className={`snap-toggle ${snapEnabled ? 'active' : ''}`}
          onClick={() => setSnapEnabled((v) => !v)}
        >
          스냅 {snapEnabled ? 'ON' : 'OFF'}
        </button>
        <label className="grid-select">
          그리드
          <select value={grid} onChange={(e) => { setGrid(e.target.value); setPreviewNotes(null); }}>
            {GRID_OPTIONS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
        </label>
        <span className="timeline-hint">블록 드래그: 이동 · 탭: 자를 위치 지정</span>
      </div>

      <div className="timeline-body">
        <div className="track-headers">
          <div className="ruler-spacer" style={{ height: 28 }} />
          {tracks.map((t) => (
            <div
              key={t.id}
              className={`track-header ${t.id === selectedTrackId ? 'selected' : ''}`}
              style={{ height: ROW_HEIGHT }}
              onClick={() => setSelectedTrackId(t.id)}
            >
              <div className="track-label">{t.label}</div>
              <div className="track-controls">
                <button
                  className={`mini-toggle ${t.muted ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); onUpdateTrack(t.id, { muted: !t.muted }); }}
                >M</button>
                <button
                  className={`mini-toggle ${t.solo ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); onUpdateTrack(t.id, { solo: !t.solo }); }}
                >S</button>
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={t.volume}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onUpdateTrack(t.id, { volume: Number(e.target.value) })}
                />
              </div>
              <div className="track-actions">
                <button onClick={(e) => { e.stopPropagation(); onDuplicateTrack(t.id); }}>복사</button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const beat = splitPoints[t.id];
                    if (beat !== undefined) onSplitTrack(t.id, t.offsetBeats + beat);
                  }}
                  disabled={splitPoints[t.id] === undefined}
                >자르기</button>
                <button className="danger" onClick={(e) => { e.stopPropagation(); onDeleteTrack(t.id); }}>삭제</button>
              </div>
            </div>
          ))}
        </div>

        <div className="track-lanes">
          <div
            className={`lanes-scroll ${snapEnabled ? 'snap-grid-bg' : ''}`}
            style={{ width: totalBeats * PX_PER_BEAT, '--grid-px': `${gridBeats * PX_PER_BEAT}px` }}
          >
            <div className="ruler" style={{ height: 28 }}>
              {Array.from({ length: totalBeats / 4 + 1 }, (_, bar) => (
                <span key={bar} className="ruler-mark" style={{ left: bar * 4 * PX_PER_BEAT }}>{bar + 1}</span>
              ))}
            </div>
            {tracks.map((t) => {
              const spanBeats = Math.max(0.5, trackEndBeat(t) - t.offsetBeats);
              const split = splitPoints[t.id];
              return (
                <div key={t.id} className="lane" style={{ height: ROW_HEIGHT }}>
                  <div
                    className={`block ${t.id === selectedTrackId ? 'selected' : ''} ${t.kind}`}
                    style={{ left: t.offsetBeats * PX_PER_BEAT, width: spanBeats * PX_PER_BEAT }}
                    onPointerDown={handlePointerDown(t)}
                    onPointerMove={handlePointerMove(t)}
                    onPointerUp={handlePointerUp(t)}
                  >
                    <span className="block-label">{t.label}</span>
                    <NoteMarks track={t} />
                    {split !== undefined && (
                      <span className="split-marker" style={{ left: split * PX_PER_BEAT }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedTrack && selectedTrack.kind === 'drum' && (
        <DrumSequencer
          track={selectedTrack}
          onUpdateTrack={onUpdateTrack}
          onPlayPreview={onPlayPreview}
        />
      )}

      {selectedTrack && (
        <div className="quantize-panel">
          <h3>퀀타이즈 — {selectedTrack.label}</h3>
          <div className="quantize-controls">
            <label>
              강도
              <select value={strength} onChange={(e) => { setStrength(Number(e.target.value)); setPreviewNotes(null); }}>
                {STRENGTH_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
            <span className="quantize-grid-note">그리드는 위 툴바의 "그리드" 선택을 함께 씁니다 ({GRID_OPTIONS.find((g) => g.id === grid)?.label})</span>
          </div>
          <div className="quantize-actions">
            <button onClick={handlePreview} disabled={playDisabled}>미리듣기</button>
            <button onClick={handleApply} disabled={!previewNotes}>적용</button>
            <button onClick={handleCancelPreview} disabled={!previewNotes}>취소</button>
            <button className="ghost" onClick={() => onQuantizeRevert(selectedTrack.id)}>원본으로 되돌리기</button>
          </div>
        </div>
      )}
    </section>
  );
}
