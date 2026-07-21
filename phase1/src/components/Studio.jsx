import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { loadDrumKit, loadMelodicInstrument, triggerDrum, MELODIC_INSTRUMENTS } from '../audio/instruments';
import { useStudio } from '../audio/useStudio';
import { useArrangement } from '../audio/useArrangement';
import { useCollabSync } from '../api/useCollabSync';
import { getAiComment, updateProject } from '../api/projects';
import { renderArrangementToWav, downloadBlob } from '../audio/exportWav';
import TopBar from './TopBar';
import Piano from './Piano';
import DrumPad from './DrumPad';
import Timeline from './Timeline';
import AiPanel from './AiPanel';

const MELODIC_IDS = new Set(MELODIC_INSTRUMENTS.map((m) => m.id));
const SNAPSHOT_DEBOUNCE_MS = 2000;

export default function Studio({ project, onBack }) {
  const instRef = useRef({ drums: null, melodic: {} });
  const activeMelodicRef = useRef('piano');
  const arrangementRef = useRef(null);
  const [drumsReady, setDrumsReady] = useState(false);
  const [loadingInstrument, setLoadingInstrument] = useState(null);
  const [mode, setMode] = useState('piano');
  const [online, setOnline] = useState([]); // 현재 방에 접속한 협업자
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved
  const [comment, setComment] = useState(null);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  const handlePresence = useCallback((event, user) => {
    if (!user) return;
    setOnline((prev) => {
      if (event === 'join') return prev.some((u) => u.id === user.id) ? prev : [...prev, user];
      return prev.filter((u) => u.id !== user.id);
    });
  }, []);

  const collab = useCollabSync({
    projectId: project.id,
    enabled: true,
    onRemoteOp: (op) => arrangementRef.current?.applyRemoteOp(op),
    onPresence: handlePresence,
  });

  const studio = useStudio(instRef, activeMelodicRef, (take) => arrangementRef.current?.addTrack(take));
  const arrangement = useArrangement(instRef, studio.bpm, collab.sendOp);
  arrangementRef.current = arrangement;

  // 프로젝트 최초 로드: 저장된 트랙/BPM을 스튜디오에 채워넣는다
  useEffect(() => {
    arrangement.loadSnapshot(project.data?.tracks ?? []);
    studio.setBpm(project.bpm ?? 90);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  // 트랙이 바뀔 때마다(내가 했든 협업자가 했든) 디바운스해서 실시간 채널로 스냅샷 전송
  // → 서버가 그걸 곧바로 영속화(consumers.py _save_snapshot)
  const snapshotTimerRef = useRef(null);
  useEffect(() => {
    if (arrangement.tracks.length === 0) return;
    clearTimeout(snapshotTimerRef.current);
    snapshotTimerRef.current = setTimeout(() => {
      collab.sendSnapshot(arrangement.tracks);
    }, SNAPSHOT_DEBOUNCE_MS);
    return () => clearTimeout(snapshotTimerRef.current);
  }, [arrangement.tracks, collab]);

  useEffect(() => {
    loadDrumKit().then((drums) => {
      instRef.current.drums = drums;
      setDrumsReady(true);
    });
    setLoadingInstrument('piano');
    loadMelodicInstrument('piano').then((sampler) => {
      instRef.current.melodic.piano = sampler;
      setLoadingInstrument((cur) => (cur === 'piano' ? null : cur));
    });
  }, []);

  useEffect(() => {
    if (!MELODIC_IDS.has(mode)) return;
    activeMelodicRef.current = mode;
    if (instRef.current.melodic[mode]) return;
    setLoadingInstrument(mode);
    loadMelodicInstrument(mode).then((sampler) => {
      instRef.current.melodic[mode] = sampler;
      setLoadingInstrument((cur) => (cur === mode ? null : cur));
    });
  }, [mode]);

  useEffect(() => {
    const unlock = () => {
      if (Tone.getContext().state !== 'running') Tone.start();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const handleDrumHit = (sound) => {
    if (!instRef.current.drums) return;
    triggerDrum(instRef.current.drums, sound, Tone.now());
    studio.drumHit(sound);
  };

  const handleRecord = () => {
    studio.startRecording({ kind: mode === 'drum' ? 'drum' : 'melodic', instrument: mode });
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await updateProject(project.id, { bpm: studio.bpm, data: { tracks: arrangement.tracks } });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    } catch {
      setSaveStatus('idle');
    }
  };

  const handleExportWav = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const blob = await renderArrangementToWav(arrangement.tracks, studio.bpm);
      downloadBlob(blob, `${project.title || 'untitled'}.wav`);
    } catch (err) {
      setExportError(err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleGetComment = async () => {
    setCommentLoading(true);
    setCommentError(null);
    setComment(null);
    try {
      await updateProject(project.id, { bpm: studio.bpm, data: { tracks: arrangement.tracks } });
      const res = await getAiComment(project.id);
      setComment(res.comment);
    } catch (err) {
      setCommentError(err.message);
    } finally {
      setCommentLoading(false);
    }
  };

  const activeInstrumentLoaded = MELODIC_IDS.has(mode)
    ? !!instRef.current.melodic[mode]
    : drumsReady;
  const ready = drumsReady && activeInstrumentLoaded;
  const recordingBusy = studio.status !== 'idle';

  return (
    <div className="studio">
      <div className="project-bar">
        <button className="ghost" onClick={onBack}>← 목록</button>
        <h1>{project.title}</h1>
        <span className={`collab-status ${collab.connected ? 'on' : 'off'}`}>
          {collab.connected ? '실시간 연결됨' : '연결 중...'}
        </span>
        {online.length > 0 && (
          <span className="online-avatars" title={online.map((u) => u.display_name || u.email).join(', ')}>
            {online.map((u) => (u.display_name || u.email || '?')[0].toUpperCase()).join(' ')}
          </span>
        )}
        <button
          className="ghost"
          onClick={handleExportWav}
          disabled={exporting || arrangement.tracks.length === 0}
          title="현재 편곡을 WAV 파일로 내보내기"
        >
          {exporting ? '내보내는 중...' : 'WAV 내보내기'}
        </button>
        <button onClick={handleSave} disabled={saveStatus === 'saving'}>
          {saveStatus === 'saving' ? '저장 중...' : saveStatus === 'saved' ? '저장됨 ✓' : '저장'}
        </button>
      </div>
      {exportError && <p className="auth-error">{exportError}</p>}
      <p className="lead">가상 악기 + 미니 DAW + AI 반주/드럼 시퀀서 + 실시간 협업 (plan.md Phase 3.5)</p>

      {!ready && (
        <p className="loading">
          {loadingInstrument ? `${loadingInstrument} 악기 로딩 중...` : '악기 로딩 중...'}
        </p>
      )}

      <TopBar
        bpm={studio.bpm}
        setBpm={studio.setBpm}
        metronomeOn={studio.metronomeOn}
        setMetronomeOn={studio.setMetronomeOn}
        status={studio.status}
        countInBeat={studio.countInBeat}
        mode={mode}
        setMode={setMode}
        instrumentOptions={MELODIC_INSTRUMENTS}
        instrumentBusy={!ready || arrangement.playing}
        onRecord={handleRecord}
        onStopRecord={studio.stopRecording}
      />

      <section className="instrument-area">
        {MELODIC_IDS.has(mode) ? (
          <Piano onNoteOn={studio.noteOn} onNoteOff={studio.noteOff} />
        ) : (
          <DrumPad onHit={handleDrumHit} />
        )}
      </section>

      <AiPanel tracks={arrangement.tracks} addTrack={arrangement.addTrack} />

      <Timeline
        tracks={arrangement.tracks}
        selectedTrackId={arrangement.selectedTrackId}
        setSelectedTrackId={arrangement.setSelectedTrackId}
        onUpdateTrack={arrangement.updateTrack}
        onDeleteTrack={arrangement.deleteTrack}
        onDuplicateTrack={arrangement.duplicateTrack}
        onMoveTrack={arrangement.moveTrack}
        onSplitTrack={arrangement.splitTrack}
        onQuantizeApply={arrangement.quantizeApply}
        onQuantizeRevert={arrangement.quantizeRevert}
        onPlayPreview={arrangement.playPreview}
        playing={arrangement.playing}
        playDisabled={recordingBusy}
        onPlayAll={arrangement.playAll}
        onStopAll={arrangement.stopAll}
      />

      <section className="ai-comment-panel">
        <h2>AI 평가받기</h2>
        <p className="ai-engine-note">LLaMA 3.1 8B가 곡을 보고 점수 없이 잘한 점과 개선 팁을 짧게 알려줘요.</p>
        <button onClick={handleGetComment} disabled={commentLoading || arrangement.tracks.length === 0}>
          {commentLoading ? '평가 받는 중...' : 'AI 평가받기'}
        </button>
        {commentError && <p className="auth-error">{commentError}</p>}
        {comment && <p className="ai-comment-text">{comment}</p>}
      </section>
    </div>
  );
}
