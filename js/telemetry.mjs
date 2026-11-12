// Vendor-independent game lifecycle. Production forwards these events directly to GA;
// this module never calls the private visitor service or sends player names.
export function createTelemetry({ send, now = () => performance.now(), visible = () => !document.hidden && document.hasFocus() }) {
  let attempt = null, previous = 0;
  const counts = new Map();
  const emit = (event, properties = {}) => {
    try { send(event, { ...(attempt ? { mode: attempt.mode, difficulty: attempt.difficulty, attempt_number: attempt.number } : {}), ...properties }); } catch { /* Analytics cannot stop a game. */ }
  };
  function tick() {
    const time = now(), delta = Math.max(0, Math.min(2, (time - previous) / 1000)); previous = time;
    if (!attempt || attempt.finished || !visible()) return;
    attempt.active += delta;
    for (const milestone of [10, 30, 60, 120, 300]) {
      if (attempt.active >= milestone && !attempt.milestones.has(milestone)) {
        attempt.milestones.add(milestone);
        emit(milestone === 10 ? 'game_engaged' : 'game_progress', { stage: attempt.stage || 'written', milestone_seconds: milestone, active_seconds: Math.round(attempt.active) });
      }
    }
  }
  function endStage(success, stats = {}) {
    if (!attempt?.stage) return;
    tick(); emit('level_end', { level_name: attempt.stage, success, ...stats }); attempt.stage = null;
  }
  function abandon(reason = 'page_exit') {
    if (!attempt || attempt.finished) return;
    tick(); emit('game_abandoned', { stage: attempt.stage || 'between_stages', exit_reason: reason, active_seconds: Math.round(attempt.active) }); attempt.finished = true;
  }
  return {
    emit, tick,
    start(mode, difficulty = 'normal') {
      if (attempt && !attempt.finished) abandon('new_attempt');
      const key = mode + ':' + difficulty, number = (counts.get(key) || 0) + 1; counts.set(key, number);
      attempt = { mode, difficulty, number, active: 0, stage: null, finished: false, milestones: new Set() }; previous = now();
      emit('game_started'); if (number > 1) emit('game_retried');
    },
    stage(name) { if (!attempt || attempt.finished) return; attempt.stage = name; emit('level_start', { level_name: name }); },
    endStage,
    finish(event, stats = {}) {
      if (!attempt || attempt.finished) return;
      tick(); const result = { active_seconds: Math.round(attempt.active), ...stats };
      emit(event, result); emit('game_finished', result);
      if (event === 'exam_completed' && stats.outcome === 'pass') {
        emit('license_earned', result); emit('unlock_achievement', { achievement_id: stats.grade === 'full' ? 'full_licence' : 'partial_licence' });
      }
      if (event === 'challenge_completed') emit('post_score', { score: Math.round(stats.duration_seconds * 10) / 10, level: attempt.difficulty === 'hard' ? 2 : 1, character: 'umbrella' });
      attempt.finished = true;
    },
    abandon
  };
}

export const telemetry = createTelemetry({ send: (event, properties) => window.dispatchEvent(new CustomEvent('whatif:game', { detail: { event, properties } })) });
