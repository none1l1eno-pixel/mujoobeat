"""
AI 격려 코멘트 (plan.md 5장 P3, C안 확정: 점수 없이 잘한 점+개선 팁).
곡 데이터를 텍스트로 요약해 LLM(로컬 Ollama의 llama3.1:8b)에 보내고 결과를 그대로
돌려준다 — Django는 "LLM API 중계"만 하고 음악적 판단은 하지 않는다(9.1절 원칙).
"""
import os

import requests

OLLAMA_BASE_URL = os.environ.get('OLLAMA_BASE_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.environ.get('OLLAMA_MODEL', 'llama3.1:8b')

NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
KEY_NAMES = {'major': '장조', 'minor': '단조'}


def _pitch_name(pitch):
    return f'{NOTE_NAMES[pitch % 12]}{pitch // 12 - 1}'


def summarize_project(project):
    tracks = (project.data or {}).get('tracks', [])
    lines = [
        f'제목: {project.title}',
        f'BPM: {project.bpm}',
    ]
    if project.key_tonic is not None and project.key_mode:
        lines.append(f'조성: {NOTE_NAMES[project.key_tonic]} {KEY_NAMES.get(project.key_mode, project.key_mode)}')
    if not tracks:
        lines.append('트랙: 아직 없음')
        return '\n'.join(lines)

    lines.append(f'트랙 수: {len(tracks)}개')
    for t in tracks:
        notes = t.get('notes', [])
        if t.get('kind') == 'drum':
            sounds = {}
            for n in notes:
                sounds[n.get('sound', '?')] = sounds.get(n.get('sound', '?'), 0) + 1
            detail = ', '.join(f'{k} {v}회' for k, v in sounds.items())
            lines.append(f"- [드럼] {t.get('label', '')}: 히트 {len(notes)}개 ({detail})")
        else:
            pitches = [n['pitch'] for n in notes if 'pitch' in n]
            if pitches:
                span = f'{_pitch_name(min(pitches))}~{_pitch_name(max(pitches))}'
            else:
                span = '없음'
            lines.append(f"- [{t.get('instrument', '?')}] {t.get('label', '')}: 노트 {len(notes)}개, 음역 {span}")

    return '\n'.join(lines)


def generate_comment(project):
    summary = summarize_project(project)
    prompt = (
        '당신은 초보자에게 친절한 작곡 코치입니다. 아래는 사용자가 웹에서 가상 악기로 '
        '연주하고 AI 반주를 붙여 만든 곡 정보입니다. 점수나 평가 등급은 절대 매기지 말고, '
        '"잘한 점" 1~2개와 "구체적인 개선 팁" 1~2개를 한국어로 짧고 다정하게 말해주세요. '
        '전문 음악 용어는 최소화하고 4~6문장 이내로 답하세요.\n\n'
        f'곡 정보:\n{summary}\n\n답변:'
    )

    try:
        res = requests.post(
            f'{OLLAMA_BASE_URL}/api/generate',
            json={'model': OLLAMA_MODEL, 'prompt': prompt, 'stream': False},
            timeout=60,
        )
        res.raise_for_status()
        return res.json().get('response', '').strip()
    except requests.RequestException as exc:
        raise RuntimeError(f'LLM 서버 호출 실패: {exc}') from exc
