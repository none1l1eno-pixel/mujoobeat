import { useMemo, useState } from 'react';

const STEPS = 16;
const ROWS = [
  { sound: 'hihat', label: '하이햇' },
  { sound: 'snare', label: '스네어' },
  { sound: 'tom', label: '탐' },
  { sound: 'kick', label: '킥' },
];

export default function DrumSequencer({ track, onUpdateTrack, onPlayPreview }) {
  const numBars = useMemo(() => {
    const localEnd = track.notes.reduce((m, n) => Math.max(m, n.start + n.dur), 0);
    return Math.max(1, Math.ceil(localEnd / 4));
  }, [track.notes]);

  const [barIndex, setBarIndex] = useState(0);
  const bar = Math.min(barIndex, numBars - 1);

  const isActive = (sound, step) => {
    const target = bar * 4 + step / 4;
    return track.notes.some((n) => n.sound === sound && Math.abs(n.start - target) < 0.01);
  };

  const toggleStep = (sound, step) => {
    const target = bar * 4 + step / 4;
    const exists = track.notes.some((n) => n.sound === sound && Math.abs(n.start - target) < 0.01);
    const notes = exists
      ? track.notes.filter((n) => !(n.sound === sound && Math.abs(n.start - target) < 0.01))
      : [...track.notes, { sound, start: target, dur: 0.1, velocity: 1 }];
    onUpdateTrack(track.id, { notes });
  };

  return (
    <div className="drum-sequencer">
      <div className="sequencer-header">
        <h3>16스텝 드럼 시퀀서 — {track.label}</h3>
        <div className="bar-pager">
          <button disabled={bar === 0} onClick={() => setBarIndex((b) => Math.max(0, b - 1))}>◀</button>
          <span>마디 {bar + 1} / {numBars}</span>
          <button disabled={bar >= numBars - 1} onClick={() => setBarIndex((b) => Math.min(numBars - 1, b + 1))}>▶</button>
        </div>
        <button className="ghost" onClick={() => onPlayPreview(track, track.notes)}>▶ 트랙 재생</button>
      </div>

      <div className="sequencer-grid">
        {ROWS.map((row) => (
          <div key={row.sound} className="sequencer-row">
            <span className="row-label">{row.label}</span>
            <div className="steps">
              {Array.from({ length: STEPS }, (_, step) => (
                <button
                  key={step}
                  className={`step ${isActive(row.sound, step) ? 'on' : ''} ${step % 4 === 0 ? 'beat-start' : ''}`}
                  onClick={() => toggleStep(row.sound, step)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
