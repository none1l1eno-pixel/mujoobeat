import { useEffect, useState } from 'react';
import { detectKey, keyName, PITCH_NAMES } from '../audio/keyDetection';
import { generateChordProgression } from '../audio/chordGen';
import { generateDrumTrack, determineDensity, STYLE_PRESETS } from '../audio/drumGen';
import { generateMagentaDrumTrack } from '../audio/magentaDrums';

function trackLocalLength(track) {
  return track.notes.reduce((max, n) => Math.max(max, n.start + n.dur), 0);
}

export default function AiPanel({ tracks, addTrack }) {
  const melodicTracks = tracks.filter((t) => t.kind === 'melodic');
  const [sourceId, setSourceId] = useState(melodicTracks[0]?.id ?? '');
  const [style, setStyle] = useState('pop');
  const [keyTonic, setKeyTonic] = useState(0);
  const [keyMode, setKeyMode] = useState('major');
  const [correlation, setCorrelation] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [drumEngineNote, setDrumEngineNote] = useState(null);

  // 소스 트랙 목록이 바뀌었는데 현재 선택이 사라졌으면 첫 트랙으로 보정
  useEffect(() => {
    if (melodicTracks.length === 0) { setSourceId(''); return; }
    if (!melodicTracks.some((t) => t.id === sourceId)) setSourceId(melodicTracks[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks]);

  // 소스가 바뀌면 키를 자동 검출(수동 변경은 이후 그대로 유지)
  useEffect(() => {
    const src = melodicTracks.find((t) => t.id === sourceId);
    if (!src || src.notes.length === 0) return;
    const key = detectKey(src.notes);
    setKeyTonic(key.tonic);
    setKeyMode(key.mode);
    setCorrelation(key.correlation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId]);

  const handleGenerate = async () => {
    const src = melodicTracks.find((t) => t.id === sourceId);
    if (!src) return;
    setGenerating(true);
    setDrumEngineNote(null);
    try {
      const localLen = trackLocalLength(src);
      const numBars = Math.max(1, Math.ceil(localLen / 4));
      const key = { tonic: keyTonic, mode: keyMode };
      const styleIndex = STYLE_PRESETS.findIndex((s) => s.id === style);

      // 코드는 규칙 기반(다이어토닉 진행) 유지 — Magenta엔 "멜로디→코드" 모델이 없어
      // 대신 항상 검출된 키에 맞는 정확한 코드를 보장한다.
      const chords = generateChordProgression(key, numBars, styleIndex);
      const chordNotes = chords.flatMap((c) => c.notes.map((pitch) => ({ pitch, start: c.startBeat, dur: c.durBeats })));

      const density = determineDensity(src.notes, Math.max(localLen, 1));

      // 드럼은 Magenta.js(DrumsRNN)로 생성 — 같은 스타일이어도 매번 다르게 나온다.
      // 모델 로딩 실패(오프라인 등) 시 기존 규칙 기반으로 조용히 폴백.
      let drumHits;
      try {
        drumHits = await generateMagentaDrumTrack(numBars, density, style, 1.1);
      } catch (err) {
        console.warn('드럼 생성 실패, 규칙 기반으로 대체:', err);
        drumHits = generateDrumTrack(numBars, density, style);
        setDrumEngineNote('Magenta 모델을 못 불러와 규칙 기반 패턴으로 (오프라인일 수 있음)');
      }
      const drumNotes = drumHits.map((h) => ({ sound: h.sound, start: h.start, dur: h.dur, velocity: h.velocity }));

      const styleLabel = STYLE_PRESETS.find((s) => s.id === style)?.label ?? style;
      const keyLabel = keyName(key);

      addTrack({
        kind: 'melodic', instrument: 'piano', label: `AI 코드 (${keyLabel})`,
        offsetBeats: src.offsetBeats, notes: chordNotes,
      });
      addTrack({
        kind: 'drum', instrument: 'drum', label: `AI 드럼 (${styleLabel})`,
        offsetBeats: src.offsetBeats, notes: drumNotes,
      });
    } finally {
      setGenerating(false);
    }
  };

  if (melodicTracks.length === 0) {
    return (
      <section className="ai-panel empty">
        <h2>AI 반주 생성</h2>
        <p>먼저 가상 악기로 멜로디를 녹음하세요. 녹음된 트랙을 기반으로 코드/드럼을 만들어요.</p>
      </section>
    );
  }

  return (
    <section className="ai-panel">
      <h2>AI 반주 생성</h2>
      <div className="ai-controls">
        <label>
          멜로디 소스
          <select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
            {melodicTracks.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>

        <label>
          스타일
          <select value={style} onChange={(e) => setStyle(e.target.value)}>
            {STYLE_PRESETS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>

        <label>
          검출된 키 (수동 변경 가능)
          <span className="key-select-group">
            <select value={keyTonic} onChange={(e) => setKeyTonic(Number(e.target.value))}>
              {PITCH_NAMES.map((n, i) => <option key={n} value={i}>{n}</option>)}
            </select>
            <select value={keyMode} onChange={(e) => setKeyMode(e.target.value)}>
              <option value="major">장조</option>
              <option value="minor">단조</option>
            </select>
          </span>
        </label>
        {correlation !== null && (
          <span className="key-confidence">검출 신뢰도(상관계수): {correlation.toFixed(2)}</span>
        )}
      </div>

      <button className="ai-generate" onClick={handleGenerate} disabled={generating}>
        {generating ? '생성 중...' : 'AI 반주 생성'}
      </button>
      {drumEngineNote && <p className="ai-engine-note">{drumEngineNote}</p>}
    </section>
  );
}
