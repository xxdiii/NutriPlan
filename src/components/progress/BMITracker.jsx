import React, { useMemo, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Info } from 'lucide-react';

// ── BMI calculation & classification ─────────────────────────────────────────

/**
 * WHO / standard BMI categories.
 * Each has: min (inclusive), max (exclusive), label, short description,
 * a colour token used for the indicator, and an emoji.
 */
export const BMI_CATEGORIES = [
  {
    min: 0,    max: 16,   label: 'Severe Thinness',   emoji: '⚠️',
    color: '#ef4444', bg: 'rgba(239,68,68,0.12)',
    tip: 'Consult a healthcare provider. Significant weight gain may be needed.',
  },
  {
    min: 16,   max: 17,   label: 'Moderate Thinness', emoji: '⚠️',
    color: '#f97316', bg: 'rgba(249,115,22,0.12)',
    tip: 'Your weight is below the healthy range. Consider speaking with a dietitian.',
  },
  {
    min: 17,   max: 18.5, label: 'Mild Thinness',     emoji: '🌿',
    color: '#eab308', bg: 'rgba(234,179,8,0.12)',
    tip: 'Slightly below healthy weight. Focus on balanced, calorie-sufficient meals.',
  },
  {
    min: 18.5, max: 25,   label: 'Normal',            emoji: '✅',
    color: '#22c55e', bg: 'rgba(34,197,94,0.12)',
    tip: 'You are within the healthy BMI range. Keep maintaining your lifestyle!',
  },
  {
    min: 25,   max: 30,   label: 'Overweight',        emoji: '📊',
    color: '#eab308', bg: 'rgba(234,179,8,0.12)',
    tip: 'Slightly above healthy weight. Regular activity and a balanced diet can help.',
  },
  {
    min: 30,   max: 35,   label: 'Obese Class I',     emoji: '📈',
    color: '#f97316', bg: 'rgba(249,115,22,0.12)',
    tip: 'Increased health risk. A structured diet and exercise plan is recommended.',
  },
  {
    min: 35,   max: 40,   label: 'Obese Class II',    emoji: '🔺',
    color: '#ef4444', bg: 'rgba(239,68,68,0.12)',
    tip: 'High health risk. Please seek professional medical guidance.',
  },
  {
    min: 40,   max: Infinity, label: 'Obese Class III', emoji: '🔴',
    color: '#dc2626', bg: 'rgba(220,38,38,0.12)',
    tip: 'Very high health risk. Medical intervention is strongly recommended.',
  },
];

/**
 * Calculate BMI from weight (kg) and height (cm).
 * @returns {number} rounded to 1 decimal
 */
export const calcBMI = (weightKg, heightCm) => {
  if (!weightKg || !heightCm || heightCm <= 0) return null;
  const hm = heightCm / 100;
  return Math.round((weightKg / (hm * hm)) * 10) / 10;
};

/**
 * Return the BMI category object for a given BMI value.
 */
export const getBMICategory = (bmi) => {
  if (bmi === null) return null;
  return BMI_CATEGORIES.find(c => bmi >= c.min && bmi < c.max) ?? BMI_CATEGORIES[BMI_CATEGORIES.length - 1];
};

/**
 * Healthy weight range for a given height.
 * @returns {{ min: number, max: number }}
 */
export const getHealthyWeightRange = (heightCm) => {
  if (!heightCm) return null;
  const hm = heightCm / 100;
  return {
    min: Math.round(18.5 * hm * hm * 10) / 10,
    max: Math.round(24.9 * hm * hm * 10) / 10,
  };
};

// ── Gauge SVG ─────────────────────────────────────────────────────────────────

/**
 * Semi-circular gauge that visualises BMI in the range [10, 45].
 */
const BMIGauge = ({ bmi, category, isDark }) => {
  const MIN_BMI = 10;
  const MAX_BMI = 45;
  const clampedBmi = Math.max(MIN_BMI, Math.min(bmi ?? MIN_BMI, MAX_BMI));
  const pct = (clampedBmi - MIN_BMI) / (MAX_BMI - MIN_BMI); // 0–1

  // Arc from 180° to 0° (left to right across the top half)
  const cx = 100, cy = 90, r = 72;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const arcX = (angle) => cx + r * Math.cos(toRad(angle));
  const arcY = (angle) => cy + r * Math.sin(toRad(angle));

  // Colour segments: map categories onto arc
  const segments = [
    { from: 180, to: 208, color: '#ef4444' },   // < 16
    { from: 208, to: 218, color: '#f97316' },   // 16–17
    { from: 218, to: 228, color: '#eab308' },   // 17–18.5
    { from: 228, to: 290, color: '#22c55e' },   // 18.5–25 (healthy)
    { from: 290, to: 330, color: '#eab308' },   // 25–30
    { from: 330, to: 354, color: '#f97316' },   // 30–35
    { from: 354, to: 366, color: '#ef4444' },   // 35–40
    { from: 366, to: 360, color: '#dc2626' },   // 40+ (wrapped)
  ];

  // Needle angle: maps MIN→MAX to 180°→360°
  const needleAngle = 180 + pct * 180;
  const needleLen = 58;
  const nx = cx + needleLen * Math.cos(toRad(needleAngle));
  const ny = cy + needleLen * Math.sin(toRad(needleAngle));

  const describeArc = (startDeg, endDeg) => {
    const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
    return `M ${arcX(startDeg)} ${arcY(startDeg)} A ${r} ${r} 0 ${largeArc} 1 ${arcX(endDeg)} ${arcY(endDeg)}`;
  };

  const colorSegments = [
    { from: 180, to: 204, color: '#ef4444' },
    { from: 204, to: 212, color: '#f97316' },
    { from: 212, to: 224, color: '#eab308' },
    { from: 224, to: 294, color: '#22c55e' },
    { from: 294, to: 330, color: '#eab308' },
    { from: 330, to: 352, color: '#f97316' },
    { from: 352, to: 360, color: '#ef4444' },
  ];

  return (
    <svg viewBox="0 0 200 100" className="w-full" style={{ maxWidth: 260, display: 'block', margin: '0 auto' }}>
      {/* Track */}
      <path d={describeArc(180, 360)} fill="none"
        stroke={isDark ? 'oklch(28% 0.03 152)' : 'oklch(90% 0.01 152)'}
        strokeWidth="14" strokeLinecap="round" />

      {/* Colour segments */}
      {colorSegments.map((s, i) => (
        <path key={i} d={describeArc(s.from, s.to)} fill="none"
          stroke={s.color} strokeWidth="14" strokeLinecap="butt" opacity="0.85" />
      ))}

      {/* Needle */}
      <line x1={cx} y1={cy} x2={nx} y2={ny}
        stroke={isDark ? '#f1f5f9' : '#1e293b'}
        strokeWidth="2.5" strokeLinecap="round"
        style={{ transition: 'x2 0.8s cubic-bezier(0.34,1.56,0.64,1), y2 0.8s cubic-bezier(0.34,1.56,0.64,1)' }}
      />
      <circle cx={cx} cy={cy} r="5" fill={category?.color ?? '#22c55e'} />

      {/* BMI text */}
      <text x={cx} y={cy - 14} textAnchor="middle"
        fontSize="18" fontWeight="800" fill={category?.color ?? '#22c55e'}
        fontFamily="system-ui, sans-serif">
        {bmi}
      </text>
      <text x={cx} y={cy - 2} textAnchor="middle"
        fontSize="7" fill={isDark ? '#94a3b8' : '#64748b'}
        fontFamily="system-ui, sans-serif" letterSpacing="0.08em">
        BMI
      </text>

      {/* Scale labels */}
      {[
        { val: '10', deg: 180 }, { val: '18.5', deg: 224 },
        { val: '25', deg: 294 }, { val: '30', deg: 330 }, { val: '45', deg: 360 }
      ].map(({ val, deg }) => {
        const lx = cx + (r + 12) * Math.cos(toRad(deg));
        const ly = cy + (r + 12) * Math.sin(toRad(deg));
        return (
          <text key={val} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            fontSize="5.5" fill={isDark ? '#64748b' : '#94a3b8'}
            fontFamily="system-ui, sans-serif">
            {val}
          </text>
        );
      })}
    </svg>
  );
};

// ── BMI History Sparkline ──────────────────────────────────────────────────────
const BMISparkline = ({ weightLogs, heightCm, isDark }) => {
  if (!weightLogs || weightLogs.length < 2 || !heightCm) return null;

  const points = weightLogs
    .slice(-12) // last 12 logs
    .map(log => ({ bmi: calcBMI(log.weight, heightCm), date: log.date }))
    .filter(p => p.bmi !== null);

  if (points.length < 2) return null;

  const W = 260, H = 56;
  const bmiVals = points.map(p => p.bmi);
  const minB = Math.min(...bmiVals) - 1;
  const maxB = Math.max(...bmiVals) + 1;

  const toSvgX = (i) => (i / (points.length - 1)) * W;
  const toSvgY = (b) => H - ((b - minB) / (maxB - minB)) * H;

  const polyline = points.map((p, i) => `${toSvgX(i)},${toSvgY(p.bmi)}`).join(' ');
  const areaPath = `M${toSvgX(0)},${H} ` +
    points.map((p, i) => `L${toSvgX(i)},${toSvgY(p.bmi)}`).join(' ') +
    ` L${toSvgX(points.length - 1)},${H} Z`;

  const lastCat = getBMICategory(points[points.length - 1].bmi);
  const lineColor = lastCat?.color ?? '#22c55e';

  return (
    <div className="mt-4">
      <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        BMI trend (last {points.length} logs)
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxWidth: W }}>
        <defs>
          <linearGradient id="bmiAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#bmiAreaGrad)" />
        <polyline points={polyline} fill="none" stroke={lineColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {/* Latest dot */}
        <circle
          cx={toSvgX(points.length - 1)}
          cy={toSvgY(points[points.length - 1].bmi)}
          r="3.5" fill={lineColor}
        />
      </svg>
    </div>
  );
};

// ── Main BMITracker component ─────────────────────────────────────────────────

/**
 * BMITracker
 *
 * Props:
 *  currentWeight  {number}  kg – live (latest log or profile weight)
 *  heightCm       {number}  cm – from user profile
 *  weightLogs     {Array}   all weight logs for the sparkline
 */
const BMITracker = ({ currentWeight, heightCm, weightLogs = [] }) => {
  const { isDark } = useTheme();
  const [showInfo, setShowInfo] = useState(false);

  const bmi = useMemo(() => calcBMI(currentWeight, heightCm), [currentWeight, heightCm]);
  const category = useMemo(() => getBMICategory(bmi), [bmi]);
  const healthyRange = useMemo(() => getHealthyWeightRange(heightCm), [heightCm]);

  const weightToHealthy = useMemo(() => {
    if (!bmi || !healthyRange || !currentWeight) return null;
    if (bmi < 18.5) return { dir: 'gain', kg: Math.round((healthyRange.min - currentWeight) * 10) / 10 };
    if (bmi >= 25)  return { dir: 'lose', kg: Math.round((currentWeight - healthyRange.max) * 10) / 10 };
    return null;
  }, [bmi, healthyRange, currentWeight]);

  if (!heightCm || !currentWeight) {
    return (
      <div className={`p-6 rounded-2xl shadow-lg ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Height or weight data missing. Complete your profile to see BMI.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>BMI Tracker</h2>
        <button
          onClick={() => setShowInfo(v => !v)}
          className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          title="What is BMI?"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* Info banner */}
      {showInfo && (
        <div className={`mx-6 mb-3 p-3 rounded-xl text-xs leading-relaxed ${isDark ? 'bg-gray-700/60 text-gray-300' : 'bg-blue-50 text-blue-800'}`}>
          <strong>Body Mass Index (BMI)</strong> is a screening measure calculated from your weight and height.
          It's a useful starting point but doesn't account for muscle mass, age, or body composition.
          Always consult a healthcare provider for personalised advice.
        </div>
      )}

      {/* Gauge */}
      <div className="px-6">
        <BMIGauge bmi={bmi} category={category} isDark={isDark} />
      </div>

      {/* Category badge */}
      <div className="flex justify-center pb-3">
        <span
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold"
          style={{ background: category?.bg, color: category?.color }}
        >
          <span>{category?.emoji}</span>
          {category?.label}
        </span>
      </div>

      {/* Tip */}
      <div className={`mx-6 mb-4 px-4 py-3 rounded-xl text-xs leading-relaxed ${isDark ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
        {category?.tip}
      </div>

      {/* Stats row */}
      <div className={`grid grid-cols-3 divide-x border-t ${isDark ? 'divide-gray-700 border-gray-700' : 'divide-gray-100 border-gray-100'}`}>
        <div className="px-4 py-3 text-center">
          <div className={`text-lg font-black tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>{bmi}</div>
          <div className={`text-xs font-medium mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Your BMI</div>
        </div>
        <div className="px-4 py-3 text-center">
          <div className={`text-sm font-bold tabular-nums ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            {healthyRange?.min} – {healthyRange?.max}
          </div>
          <div className={`text-xs font-medium mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Healthy (kg)</div>
        </div>
        <div className="px-4 py-3 text-center">
          {weightToHealthy ? (
            <>
              <div className={`text-sm font-bold tabular-nums ${weightToHealthy.dir === 'lose' ? 'text-orange-500' : 'text-blue-500'}`}>
                {weightToHealthy.dir === 'lose' ? '−' : '+'}{weightToHealthy.kg} kg
              </div>
              <div className={`text-xs font-medium mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                To {weightToHealthy.dir === 'lose' ? 'lose' : 'gain'}
              </div>
            </>
          ) : (
            <>
              <div className="text-sm font-bold text-emerald-500">On track</div>
              <div className={`text-xs font-medium mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Status</div>
            </>
          )}
        </div>
      </div>

      {/* Sparkline */}
      {weightLogs.length >= 2 && (
        <div className={`px-6 pb-5 border-t pt-3 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
          <BMISparkline weightLogs={weightLogs} heightCm={heightCm} isDark={isDark} />
        </div>
      )}
    </div>
  );
};

export default BMITracker;
