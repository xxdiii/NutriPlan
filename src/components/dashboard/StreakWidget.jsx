import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Trophy, Zap, ChevronRight, X } from 'lucide-react';
import { getStreakData, STREAK_MILESTONES } from '../../services/streakService';

// ── Animated fire SVG ─────────────────────────────────────────────────────────
const FlameIcon = ({ size = 32, active = true }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <defs>
      <radialGradient id="flameGrad" cx="50%" cy="80%" r="70%">
        <stop offset="0%" stopColor="#fde68a" />
        <stop offset="40%" stopColor="#f97316" />
        <stop offset="100%" stopColor="#dc2626" stopOpacity="0.8" />
      </radialGradient>
    </defs>
    <path
      d="M16 2C16 2 10 9 10 14C10 17.3 12.7 20 16 20C19.3 20 22 17.3 22 14C22 11 19 7 19 7C19 7 18 12 15 12C15 12 18 8 16 2Z"
      fill={active ? 'url(#flameGrad)' : '#6b7280'}
      style={{ transformOrigin: '16px 20px', animation: active ? 'flame-flicker 1.4s ease-in-out infinite alternate' : 'none' }}
    />
    <path
      d="M16 20C14.1 20 12.5 21.1 11.6 22.7C11.2 22.2 11 21.6 11 21C11 21 9 22 9 25C9 28.3 12.1 31 16 31C19.9 31 23 28.3 23 25C23 22 21 20.5 20 20.2C19.5 21.3 18.5 22 17.3 22C16.7 22 16.2 21.7 16 21.3C16 21.3 16 20 16 20Z"
      fill={active ? 'url(#flameGrad)' : '#6b7280'}
    />
    <style>{`
      @keyframes flame-flicker {
        0%   { transform: scaleX(1)    scaleY(1)    rotate(-1deg); }
        33%  { transform: scaleX(0.96) scaleY(1.04) rotate(1deg); }
        66%  { transform: scaleX(1.04) scaleY(0.97) rotate(-0.5deg); }
        100% { transform: scaleX(0.98) scaleY(1.02) rotate(1.5deg); }
      }
    `}</style>
  </svg>
);

// ── Milestone Badge ───────────────────────────────────────────────────────────
const MilestoneBadge = ({ milestone, earned, isDark }) => (
  <div
    title={`${milestone.label}: ${milestone.description}`}
    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all
      ${earned
        ? isDark ? 'bg-amber-900/30 ring-1 ring-amber-600/40' : 'bg-amber-50 ring-1 ring-amber-300'
        : isDark ? 'bg-gray-800 opacity-40' : 'bg-gray-100 opacity-40'
      }`}
  >
    <span className="text-xl leading-none">{earned ? milestone.emoji : '🔒'}</span>
    <span className={`text-[10px] font-semibold text-center leading-tight ${earned
      ? isDark ? 'text-amber-400' : 'text-amber-700'
      : isDark ? 'text-gray-600' : 'text-gray-400'
    }`}>{milestone.days}d</span>
  </div>
);

// ── Milestones Modal ──────────────────────────────────────────────────────────
const MilestonesModal = ({ streakData, onClose, isDark }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
    <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden
      ${isDark ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>

      {/* Header */}
      <div className={`px-6 py-5 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FlameIcon size={28} active={streakData.currentStreak > 0} />
            <div>
              <h2 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Your Streak Journey
              </h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {streakData.earnedMilestones.length} of {STREAK_MILESTONES.length} milestones earned
              </p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className={`grid grid-cols-2 divide-x ${isDark ? 'divide-gray-700 bg-gray-800/40' : 'divide-gray-100 bg-gray-50'}`}>
        <div className="p-4 text-center">
          <div className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {streakData.currentStreak}
          </div>
          <div className={`text-xs font-semibold uppercase tracking-wide mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Current Streak</div>
        </div>
        <div className="p-4 text-center">
          <div className={`text-3xl font-black tracking-tight ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
            {streakData.longestStreak}
          </div>
          <div className={`text-xs font-semibold uppercase tracking-wide mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Longest Streak</div>
        </div>
      </div>

      {/* Milestones list */}
      <div className="px-6 py-4 max-h-96 overflow-y-auto space-y-3">
        {STREAK_MILESTONES.map((m) => {
          const earned = streakData.currentStreak >= m.days;
          const isCurrent = streakData.nextMilestone?.days === m.days;
          const daysLeft = m.days - streakData.currentStreak;

          return (
            <div
              key={m.days}
              className={`flex items-center gap-4 p-3 rounded-xl transition-all
                ${earned
                  ? isDark ? 'bg-amber-900/20 border border-amber-700/30' : 'bg-amber-50 border border-amber-200'
                  : isCurrent
                    ? isDark ? 'bg-emerald-900/20 border border-emerald-700/30' : 'bg-emerald-50 border border-emerald-200'
                    : isDark ? 'bg-gray-800/50 border border-gray-700/50 opacity-50' : 'bg-gray-50 border border-gray-100 opacity-50'
                }`}
            >
              <span className="text-2xl">{earned ? m.emoji : '🔒'}</span>
              <div className="flex-1 min-w-0">
                <div className={`font-bold text-sm ${earned
                  ? isDark ? 'text-amber-300' : 'text-amber-800'
                  : isCurrent ? isDark ? 'text-emerald-300' : 'text-emerald-800'
                  : isDark ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  {m.label}
                  <span className={`ml-2 text-xs font-normal ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {m.days} days
                  </span>
                </div>
                <div className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {earned ? m.description : isCurrent ? `${daysLeft} more day${daysLeft !== 1 ? 's' : ''} to unlock!` : `Reach ${m.days} days`}
                </div>
              </div>
              {earned && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>Earned</span>}
              {isCurrent && !earned && (
                <div className="w-14">
                  <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${(streakData.currentStreak / m.days) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

// ── Main StreakWidget ─────────────────────────────────────────────────────────
const StreakWidget = ({ compact = false }) => {
  const { isDark } = useTheme();
  const [streakData, setStreakData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newMilestone, setNewMilestone] = useState(null);

  const refresh = useCallback(() => {
    const data = getStreakData();
    setStreakData(prev => {
      // Detect a newly crossed milestone to show a celebration banner
      if (prev && data.currentStreak > prev.currentStreak) {
        const justEarned = STREAK_MILESTONES.find(
          m => m.days === data.currentStreak && data.currentStreak > prev.currentStreak
        );
        if (justEarned) setNewMilestone(justEarned);
      }
      return data;
    });
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('meal-compliance-update', refresh);
    return () => window.removeEventListener('meal-compliance-update', refresh);
  }, [refresh]);

  if (!streakData) return null;

  const { currentStreak, longestStreak, earnedMilestones, nextMilestone } = streakData;
  const progressToNext = nextMilestone ? (currentStreak / nextMilestone.days) * 100 : 100;

  // ── Compact (dashboard card) mode ─────────────────────────────────────────
  if (compact) {
    return (
      <div style={{ padding: '1.5rem' }} className="h-full flex flex-col">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>Streak</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FlameIcon size={22} active={currentStreak > 0} />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-3xl)', letterSpacing: '-0.04em', color: 'var(--color-text-primary)', lineHeight: 1 }}>
                {currentStreak}
              </span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-xl)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                {currentStreak === 1 ? 'day' : 'days'}
              </span>
            </div>
            {nextMilestone && (
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-xs)', color: 'var(--color-brand)', fontWeight: 600 }}>
                {nextMilestone.days - currentStreak} days to {nextMilestone.emoji} {nextMilestone.label}
              </span>
            )}
            {earnedMilestones.length > 0 && !nextMilestone && (
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-xs)', color: 'oklch(68% 0.15 52)', fontWeight: 600 }}>
                🏆 All milestones earned!
              </span>
            )}
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{ padding: '0.4rem', background: 'var(--color-brand-muted)', borderRadius: '0.625rem', border: 'none', cursor: 'pointer' }}
            title="View all milestones"
          >
            <Trophy style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-brand)' }} />
          </button>
        </div>

        {/* Progress bar to next milestone */}
        {nextMilestone && (
          <div style={{ marginTop: 'auto' }}>
            <div style={{ height: '6px', background: isDark ? 'oklch(28% 0.03 152)' : 'oklch(88% 0.018 152)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{
                width: `${progressToNext}%`,
                height: '100%',
                background: 'var(--color-brand)',
                borderRadius: '999px',
                transition: 'width 1s cubic-bezier(0.16,1,0.3,1)'
              }} />
            </div>
          </div>
        )}

        {showModal && (
          <MilestonesModal streakData={streakData} onClose={() => setShowModal(false)} isDark={isDark} />
        )}
      </div>
    );
  }

  // ── Full (standalone) mode ─────────────────────────────────────────────────
  return (
    <div className={`rounded-2xl overflow-hidden shadow-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
      {/* New milestone celebration */}
      {newMilestone && (
        <div className={`flex items-center gap-3 px-5 py-3 border-b text-sm font-medium
          ${isDark ? 'bg-amber-900/30 border-amber-700/40 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          <span className="text-xl">{newMilestone.emoji}</span>
          <span>New milestone: <strong>{newMilestone.label}</strong> — {newMilestone.description}</span>
          <button onClick={() => setNewMilestone(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <FlameIcon size={36} active={currentStreak > 0} />
          <div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Your Streak</h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {currentStreak > 0 ? 'Keep it going!' : 'Eat a meal today to start!'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className={`flex items-center gap-1 text-sm font-medium ${isDark ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-700'}`}
        >
          All Badges <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Big stats */}
      <div className="grid grid-cols-2 gap-4 px-6 pb-5">
        <div className={`rounded-xl p-4 text-center ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
          <div className={`text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {currentStreak}
          </div>
          <div className={`text-xs font-semibold uppercase tracking-wide mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Current</div>
        </div>
        <div className={`rounded-xl p-4 text-center ${isDark ? 'bg-amber-900/20 border border-amber-700/30' : 'bg-amber-50 border border-amber-200'}`}>
          <div className={`text-4xl font-black tracking-tight ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
            {longestStreak}
          </div>
          <div className={`text-xs font-semibold uppercase tracking-wide mt-1 ${isDark ? 'text-amber-500' : 'text-amber-600'}`}>Best</div>
        </div>
      </div>

      {/* Next milestone progress */}
      {nextMilestone && (
        <div className="px-6 pb-5">
          <div className="flex justify-between text-xs mb-1.5">
            <span className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Next: {nextMilestone.emoji} {nextMilestone.label} ({nextMilestone.days} days)
            </span>
            <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              {nextMilestone.days - currentStreak} to go
            </span>
          </div>
          <div className={`h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700"
              style={{ width: `${progressToNext}%` }}
            />
          </div>
        </div>
      )}

      {/* Recent milestone badges (last 5 earned) */}
      {earnedMilestones.length > 0 && (
        <div className={`px-6 pb-5 border-t pt-4 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className={`text-xs font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Earned Badges
          </div>
          <div className="flex gap-2 flex-wrap">
            {STREAK_MILESTONES.map(m => (
              <MilestoneBadge
                key={m.days}
                milestone={m}
                earned={currentStreak >= m.days}
                isDark={isDark}
              />
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <MilestonesModal streakData={streakData} onClose={() => setShowModal(false)} isDark={isDark} />
      )}
    </div>
  );
};

export default StreakWidget;
