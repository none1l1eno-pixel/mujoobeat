/**
 * 퀀타이즈: plan.md 5장 P1 — 강도(50%/100%) + 그리드(1/8, 1/16) 조절, 원본은 항상 보존.
 * 노트 시작 시각만 그리드에 스냅한다(길이는 그대로 둬서 연주 뉘앙스를 남김).
 */

export const GRID_OPTIONS = [
  { id: '1/8', label: '1/8', beats: 0.5 },
  { id: '1/16', label: '1/16', beats: 0.25 },
];

export const STRENGTH_OPTIONS = [
  { id: 0.5, label: '50%' },
  { id: 1, label: '100%' },
];

export function computeQuantized(notes, gridBeats, strength) {
  return notes.map((n) => {
    const snapped = Math.round(n.start / gridBeats) * gridBeats;
    const newStart = n.start + (snapped - n.start) * strength;
    return { ...n, start: Math.max(0, newStart) };
  });
}
