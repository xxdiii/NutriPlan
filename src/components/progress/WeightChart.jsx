import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

/**
 * @param trend  [{ date: 'YYYY-MM-DD', trend }] smoothed weight from the weekly check-in
 */
const WeightChart = ({ weightLogs, targetWeight, trend = [] }) => {
  const { isDark } = useTheme();

  if (!weightLogs || weightLogs.length === 0) {
    return (
      <div className={`p-12 text-center rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
          No weight data to display yet. Start logging your weight!
        </p>
      </div>
    );
  }

  // Format data for chart
  const trendByDate = new Map((trend || []).map(p => [p.date, p.trend]));
  const chartData = weightLogs.map(log => ({
    date: new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: log.weight,
    trend: trendByDate.get(new Date(log.date).toISOString().slice(0, 10)) ?? null,
    fullDate: log.date
  }));
  const hasTrend = chartData.some(d => d.trend !== null);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 rounded-lg shadow-lg ${
          isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
        }`}>
          <p className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {new Date(payload[0].payload.fullDate).toLocaleDateString('en-US', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric' 
            })}
          </p>
          <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {payload[0].payload.weight} kg
          </p>
          {payload[0].payload.trend !== null && (
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Trend {payload[0].payload.trend.toFixed(1)} kg
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={isDark ? '#374151' : '#E5E7EB'} 
          />
          <XAxis 
            dataKey="date" 
            stroke={isDark ? '#9CA3AF' : '#6B7280'}
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke={isDark ? '#9CA3AF' : '#6B7280'}
            style={{ fontSize: '12px' }}
            domain={['dataMin - 2', 'dataMax + 2']}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Target weight line */}
          {targetWeight && (
            <ReferenceLine 
              y={targetWeight} 
              stroke="#10B981" 
              strokeDasharray="5 5"
              label={{ 
                value: `Target: ${targetWeight}kg`, 
                position: 'right',
                fill: '#10B981',
                fontSize: 12
              }}
            />
          )}
          
          <Line
            type="monotone"
            dataKey="weight"
            name="Weigh-ins"
            stroke="#3B82F6"
            strokeWidth={hasTrend ? 1 : 3}
            strokeOpacity={hasTrend ? 0.5 : 1}
            dot={{ fill: '#3B82F6', r: hasTrend ? 3 : 4 }}
            activeDot={{ r: 6 }}
          />
          {hasTrend && (
            <Line
              type="monotone"
              dataKey="trend"
              name="Trend"
              stroke="#10B981"
              strokeWidth={3}
              dot={false}
              connectNulls
            />
          )}
          {hasTrend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WeightChart;