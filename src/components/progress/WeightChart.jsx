import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const WeightChart = ({ weightLogs, targetWeight }) => {
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
  const chartData = weightLogs.map(log => ({
    date: new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: log.weight,
    fullDate: log.date
  }));

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
            {payload[0].value} kg
          </p>
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
            stroke="#3B82F6" 
            strokeWidth={3}
            dot={{ fill: '#3B82F6', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WeightChart;