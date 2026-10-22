import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { getHeatmapData } from '../../services/complianceService';

// ── Constants ───────────────────────────────────────────────────────────────
const MEAL_LABELS = ['breakfast', 'lunch', 'snack', 'dinner'];
const DAY_LABELS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Color scales: index = number of meals eaten (0–4)
const LIGHT_COLORS = [
  'oklch(93% 0.012 152)',   // 0 – no data
  'oklch(83% 0.09 152)',    // 1
  'oklch(70% 0.14 152)',    // 2
  'oklch(57% 0.18 152)',    // 3
  'oklch(44% 0.20 152)',    // 4 – fully compliant
];
const DARK_COLORS = [
  'oklch(22% 0.022 152)',   // 0
  'oklch(30% 0.10 152)',    // 1
  'oklch(38% 0.15 152)',    // 2
  'oklch(48% 0.19 152)',    // 3
  'oklch(58% 0.21 152)',    // 4
];

// ── Tooltip ─────────────────────────────────────────────────────────────────
const Tooltip = ({ day, position, isDark }) => {
  if (!day) return null;
  const bg     = isDark ? 'oklch(18% 0.02 152)' : '#fff';
  const border = isDark ? 'oklch(34% 0.04 152)' : 'oklch(86% 0.018 152)';
  const statusColor = (s) =>
    s === 'eaten'   ? 'oklch(52% 0.20 152)' :
    s === 'skipped' ? 'oklch(55% 0.18 28)'  :
                      'oklch(60% 0.018 152)';
  const statusLabel = (s) =>
    s === 'eaten' ? '✓' : s === 'skipped' ? '✕' : '–';

  // Format date nicely
  const d = new Date(day.date + 'T00:00:00');
  const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div style={{
      position:      'fixed',
      left:          position.x + 12,
      top:           position.y - 8,
      zIndex:        9999,
      background:    bg,
      border:        `1px solid ${border}`,
      borderRadius:  '0.75rem',
      padding:       '0.75rem 1rem',
      boxShadow:     '0 8px 28px oklch(0% 0 0 / 0.18)',
      pointerEvents: 'none',
      minWidth:      '160px',
    }}>
      <div style={{
        fontFamily:    'var(--font-ui)',
        fontSize:      '0.75rem',
        fontWeight:    700,
        color:         'var(--color-text-secondary)',
        marginBottom:  '0.5rem',
      }}>{dateStr}</div>

      <div style={{
        fontFamily:   'var(--font-display)',
        fontWeight:   800,
        fontSize:     '1.1rem',
        color:        day.eaten === 4 ? 'oklch(44% 0.20 152)' : 'var(--color-text-primary)',
        marginBottom: '0.5rem',
        letterSpacing:'-0.03em',
      }}>
        {day.eaten}/4 meals
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        {MEAL_LABELS.map(meal => (
          <div key={meal} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{
              fontWeight: 700,
              fontSize:   '0.75rem',
              width:      '1rem',
              textAlign:  'center',
              color:      statusColor(day.meals[meal]),
            }}>
              {statusLabel(day.meals[meal])}
            </span>
            <span style={{
              fontFamily:    'var(--font-ui)',
              fontSize:      '0.72rem',
              color:         'var(--color-text-muted)',
              textTransform: 'capitalize',
            }}>{meal}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────
const ComplianceHeatmap = ({ months = 3 }) => {
  const { isDark } = useTheme();
  const [data, setData]       = useState([]);
  const [tooltip, setTooltip] = useState({ day: null, position: { x: 0, y: 0 } });
  const containerRef          = useRef(null);

  // Load & reload on compliance updates
  useEffect(() => {
    const load = () => setData(getHeatmapData(months));
    load();
    window.addEventListener('meal-compliance-update', load);
    return () => window.removeEventListener('meal-compliance-update', load);
  }, [months]);

  if (data.length === 0) return null;

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const textMuted   = 'var(--color-text-muted)';
  const textPrimary = 'var(--color-text-primary)';

  // ── Group days into weeks (Mon–Sun columns) ──────────────────────────────
  // data always starts on a Monday, so chunk by 7
  const weeks = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  // ── Month labels ─────────────────────────────────────────────────────────
  // Show a label whenever the month changes across week starts
  const monthLabels = weeks.map((week, wi) => {
    const firstDay = new Date(week[0].date + 'T00:00:00');
    const prevWeekFirstDay = wi > 0 ? new Date(weeks[wi - 1][0].date + 'T00:00:00') : null;
    if (!prevWeekFirstDay || firstDay.getMonth() !== prevWeekFirstDay.getMonth()) {
      return firstDay.toLocaleDateString('en-US', { month: 'short' });
    }
    return null;
  });

  // ── Stats summary ────────────────────────────────────────────────────────
  const tracked = data.filter(d => d.total > 0);
  const perfDays = data.filter(d => d.eaten === 4).length;
  const totalEaten = data.reduce((s, d) => s + d.eaten, 0);
  const totalPossible = data.length * 4;
  const overallPct = totalPossible > 0 ? Math.round((totalEaten / totalPossible) * 100) : 0;

  const CELL = 13;   // cell size px
  const GAP  = 3;    // gap px

  const handleMouseEnter = (e, day) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ day, position: { x: rect.right, y: rect.top } });
  };
  const handleMouseLeave = () => setTooltip({ day: null, position: { x: 0, y: 0 } });

  return (
    <div className="card" style={{ padding: '1.75rem' }} ref={containerRef}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)', letterSpacing: '-0.02em', color: textPrimary, margin: '0 0 0.2rem' }}>
            Compliance History
          </h2>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.78rem', color: textMuted, margin: 0 }}>
            {months}-month meal adherence calendar
          </p>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'flex', gap: '1.25rem' }}>
          {[
            { label: 'Overall', value: `${overallPct}%`, color: 'var(--color-brand)' },
            { label: 'Perfect days', value: perfDays, color: colors[4] },
            { label: 'Days tracked', value: tracked.length, color: textMuted },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.04em', color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.67rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: textMuted, marginTop: '0.15rem' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 0, minWidth: 'max-content' }}>

          {/* Month row */}
          <div style={{ display: 'flex', gap: GAP, marginBottom: '4px', paddingLeft: '28px' }}>
            {weeks.map((_, wi) => (
              <div key={wi} style={{ width: CELL, flexShrink: 0, fontFamily: 'var(--font-ui)', fontSize: '0.62rem', color: textMuted, whiteSpace: 'nowrap' }}>
                {monthLabels[wi] || ''}
              </div>
            ))}
          </div>

          {/* Day-row + week-columns */}
          <div style={{ display: 'flex', gap: 0 }}>
            {/* Day-of-week labels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: GAP, marginRight: '6px' }}>
              {DAY_LABELS.map((d, i) => (
                <div key={d} style={{ height: CELL, display: 'flex', alignItems: 'center', fontFamily: 'var(--font-ui)', fontSize: '0.6rem', color: textMuted, width: '22px', justifyContent: 'flex-end', flexShrink: 0, opacity: [0, 2, 4, 6].includes(i) ? 1 : 0 /* show Mon, Wed, Fri, Sun */ }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Week columns */}
            <div style={{ display: 'flex', gap: GAP }}>
              {weeks.map((week, wi) => (
                <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
                  {/* Pad the first week if it doesn't start on Mon (safety) */}
                  {week.map((day, di) => {
                    const color = colors[Math.min(day.eaten, 4)];
                    const isToday = day.date === new Date().toISOString().split('T')[0];
                    return (
                      <div
                        key={day.date}
                        onMouseEnter={e => handleMouseEnter(e, day)}
                        onMouseLeave={handleMouseLeave}
                        style={{
                          width:         CELL,
                          height:        CELL,
                          borderRadius:  '3px',
                          background:    color,
                          cursor:        'pointer',
                          flexShrink:    0,
                          outline:       isToday ? `2px solid var(--color-brand)` : 'none',
                          outlineOffset: '1px',
                          transition:    'transform 100ms, box-shadow 100ms',
                          boxShadow:     day.eaten > 0 ? `0 1px 3px oklch(0% 0 0 / ${isDark ? '0.35' : '0.12'})` : 'none',
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.transform = 'scale(1.25)';
                          e.currentTarget.style.zIndex = '10';
                          e.currentTarget.style.position = 'relative';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.zIndex = '';
                          e.currentTarget.style.position = '';
                          handleMouseLeave();
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.75rem', paddingLeft: '28px' }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.65rem', color: textMuted }}>Less</span>
            {colors.map((c, i) => (
              <div key={i} style={{ width: CELL, height: CELL, borderRadius: '3px', background: c, flexShrink: 0 }} />
            ))}
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.65rem', color: textMuted }}>More</span>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.65rem', color: textMuted, marginLeft: '0.5rem' }}>
              · <span style={{ background: 'transparent', border: '2px solid var(--color-brand)', borderRadius: '3px', padding: '0 3px', fontSize: '0.6rem' }}>T</span> = today
            </span>
          </div>
        </div>
      </div>

      {/* Tooltip (portal-style, fixed position) */}
      <Tooltip day={tooltip.day} position={tooltip.position} isDark={isDark} />
    </div>
  );
};

export default ComplianceHeatmap;
