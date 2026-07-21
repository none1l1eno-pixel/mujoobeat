const STATUS_LABEL = {
  idle: '대기',
  countin: '카운트인',
  recording: '녹음 중',
};

export default function TopBar({
  bpm, setBpm,
  metronomeOn, setMetronomeOn,
  status, countInBeat,
  mode, setMode,
  instrumentOptions,
  instrumentBusy,
  onRecord, onStopRecord,
}) {
  const busy = status !== 'idle';

  return (
    <div className="top-bar">
      <div className="group">
        <label>
          BPM
          <input
            type="number"
            min={40}
            max={200}
            value={bpm}
            disabled={busy}
            onChange={(e) => setBpm(Number(e.target.value) || 90)}
          />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={metronomeOn}
            onChange={(e) => setMetronomeOn(e.target.checked)}
          />
          메트로놈
        </label>
      </div>

      <div className="group">
        {busy ? (
          <button className="danger" onClick={onStopRecord}>■ 녹음 정지</button>
        ) : (
          <button onClick={onRecord} disabled={instrumentBusy}>● 녹음 (카운트인 4박)</button>
        )}
      </div>

      <div className="group">
        <label>
          악기
          <select value={mode} onChange={(e) => setMode(e.target.value)} disabled={busy}>
            {instrumentOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
            <option value="drum">드럼 패드</option>
          </select>
        </label>
      </div>

      <div className="group status">
        <span>{STATUS_LABEL[status]}</span>
        {status === 'countin' && <span className="count-in">{countInBeat}/4</span>}
      </div>
    </div>
  );
}
