import React, { useState } from 'react';
import { Plus, Calendar, Scale } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const WeightLogForm = ({ onAddLog }) => {
  const { isDark } = useTheme();
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!weight || !date) return;

    onAddLog({
      weight: parseFloat(weight),
      date,
      notes,
      timestamp: new Date().toISOString()
    });

    // Reset form
    setWeight('');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
  };

  return (
    <form onSubmit={handleSubmit} className={`p-6 rounded-2xl ${
      isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
    }`}>
      <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Log Your Weight
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Weight Input */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            <Scale className="w-4 h-4 inline mr-2" />
            Weight (kg)
          </label>
          <input
            type="number"
            step="0.1"
            min="30"
            max="300"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
              isDark
                ? 'bg-gray-900 border-gray-700 text-white focus:border-emerald-600'
                : 'bg-white border-gray-200 text-gray-900 focus:border-emerald-600'
            } focus:outline-none`}
            placeholder="70.5"
            required
          />
        </div>

        {/* Date Input */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            <Calendar className="w-4 h-4 inline mr-2" />
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
              isDark
                ? 'bg-gray-900 border-gray-700 text-white focus:border-emerald-600'
                : 'bg-white border-gray-200 text-gray-900 focus:border-emerald-600'
            } focus:outline-none`}
            required
          />
        </div>
      </div>

      {/* Notes Input */}
      <div className="mb-4">
        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., Feeling good, had a great workout..."
          rows="2"
          className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
            isDark
              ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500 focus:border-emerald-600'
              : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-emerald-600'
          } focus:outline-none resize-none`}
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
      >
        <Plus className="w-5 h-5" />
        <span>Add Weight Log</span>
      </button>
    </form>
  );
};

export default WeightLogForm;