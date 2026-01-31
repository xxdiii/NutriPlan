import React, { useState } from 'react';
import { ShoppingCart, Check, Download, Printer, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const ShoppingList = ({ shoppingList, costEstimate }) => {
  const { isDark } = useTheme();
  const [checkedItems, setCheckedItems] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({
    vegetables: true,
    proteins: true,
    grains: true,
    dairy: true,
    fruits: true,
    spices: true,
    oils: true,
    others: true
  });

  const categoryIcons = {
    vegetables: '🥬',
    fruits: '🍎',
    proteins: '🍗',
    dairy: '🥛',
    grains: '🌾',
    spices: '🌶️',
    oils: '🫒',
    others: '📦'
  };

  const categoryColors = {
    vegetables: { light: 'bg-green-100 text-green-800', dark: 'bg-green-900/30 text-green-400' },
    fruits: { light: 'bg-orange-100 text-orange-800', dark: 'bg-orange-900/30 text-orange-400' },
    proteins: { light: 'bg-red-100 text-red-800', dark: 'bg-red-900/30 text-red-400' },
    dairy: { light: 'bg-blue-100 text-blue-800', dark: 'bg-blue-900/30 text-blue-400' },
    grains: { light: 'bg-yellow-100 text-yellow-800', dark: 'bg-yellow-900/30 text-yellow-400' },
    spices: { light: 'bg-purple-100 text-purple-800', dark: 'bg-purple-900/30 text-purple-400' },
    oils: { light: 'bg-amber-100 text-amber-800', dark: 'bg-amber-900/30 text-amber-400' },
    others: { light: 'bg-gray-100 text-gray-800', dark: 'bg-gray-700 text-gray-400' }
  };

  const toggleItem = (itemKey) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemKey]: !prev[itemKey]
    }));
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const getCheckedCount = (category) => {
    return shoppingList.byCategory[category].filter(item => 
      checkedItems[item.original.toLowerCase()]
    ).length;
  };

  const getTotalChecked = () => {
    return Object.keys(checkedItems).filter(key => checkedItems[key]).length;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create text content
    let content = "🛒 WEEKLY SHOPPING LIST\n";
    content += "═══════════════════════\n\n";

    Object.keys(shoppingList.byCategory).forEach(category => {
      const items = shoppingList.byCategory[category];
      if (items.length > 0) {
        content += `\n${categoryIcons[category]} ${category.toUpperCase()}\n`;
        content += "─────────────────────\n";
        items.forEach(item => {
          content += `☐ ${item.original}\n`;
          if (item.count > 1) {
            content += `  (needed for ${item.count} meals)\n`;
          }
        });
      }
    });

    content += `\n\nTOTAL ITEMS: ${shoppingList.totalItems}\n`;
    content += `ESTIMATED COST: ₹${costEstimate.total}\n`;

    // Create blob and download
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shopping-list.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Weekly Shopping List
          </h2>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {getTotalChecked()} of {shoppingList.totalItems} items checked
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className={`px-4 py-2 rounded-xl font-medium flex items-center space-x-2 transition-all ${
              isDark 
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>

          <button
            onClick={handlePrint}
            className={`px-4 py-2 rounded-xl font-medium flex items-center space-x-2 transition-all ${
              isDark 
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Cost Estimate */}
      <div className={`p-6 rounded-2xl mb-6 ${
        isDark 
          ? 'bg-gradient-to-br from-emerald-900/20 to-teal-900/20 border border-emerald-800' 
          : 'bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Estimated Cost
            </h3>
            {costEstimate.servings > 1 && (
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                For {costEstimate.servings} servings
              </p>
            )}
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              ₹{costEstimate.total}
            </div>
            {costEstimate.servings > 1 && costEstimate.estimatedPerPerson && (
              <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                ₹{costEstimate.estimatedPerPerson} per person
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {Object.keys(costEstimate.breakdown).map(category => {
            const amount = costEstimate.breakdown[category];
            if (amount === 0) return null;
            
            return (
              <div 
                key={category}
                className={`p-3 rounded-xl ${isDark ? 'bg-gray-800/50' : 'bg-white/50'}`}
              >
                <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {categoryIcons[category]} {category}
                </div>
                <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  ₹{amount}
                </div>
              </div>
            );
          })}
        </div>

        <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800/50' : 'bg-white/50'}`}>
          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            💡 Estimated based on {costEstimate.budgetLevel} budget tier and ingredient quantities. 
            Actual prices may vary by location and season.
          </p>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {Object.keys(shoppingList.byCategory).map(category => {
          const items = shoppingList.byCategory[category];
          if (items.length === 0) return null;

          const isExpanded = expandedCategories[category];
          const checkedCount = getCheckedCount(category);
          const colorClass = categoryColors[category][isDark ? 'dark' : 'light'];

          return (
            <div 
              key={category}
              className={`rounded-2xl overflow-hidden ${
                isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              }`}
            >
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className={`w-full p-4 flex items-center justify-between transition-colors ${
                  isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}>
                    <span className="text-xl">{categoryIcons[category]}</span>
                  </div>
                  <div className="text-left">
                    <h3 className={`font-bold capitalize ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {category}
                    </h3>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {checkedCount}/{items.length} items
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className={`text-sm font-medium ${colorClass} px-3 py-1 rounded-full`}>
                    {items.length} items
                  </span>
                  <svg
                    className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''} ${
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Items List */}
              {isExpanded && (
                <div className="border-t border-gray-700 p-4">
                  <div className="space-y-2">
                    {items.map((item, idx) => {
                      const itemKey = item.original.toLowerCase();
                      const isChecked = checkedItems[itemKey];

                      return (
                        <div
                          key={idx}
                          onClick={() => toggleItem(itemKey)}
                          className={`p-3 rounded-xl cursor-pointer transition-all ${
                            isChecked
                              ? isDark 
                                ? 'bg-emerald-900/30 border-2 border-emerald-600' 
                                : 'bg-emerald-50 border-2 border-emerald-500'
                              : isDark
                              ? 'bg-gray-700/50 hover:bg-gray-700'
                              : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              isChecked
                                ? 'bg-emerald-600 border-emerald-600'
                                : isDark
                                ? 'border-gray-600'
                                : 'border-gray-300'
                            }`}>
                              {isChecked && (
                                <Check className="w-3 h-3 text-white" strokeWidth={3} />
                              )}
                            </div>

                            <div className="flex-1">
                              <div className={`font-medium ${
                                isChecked 
                                  ? isDark ? 'text-emerald-400 line-through' : 'text-emerald-700 line-through'
                                  : isDark ? 'text-white' : 'text-gray-900'
                              }`}>
                                {item.original}
                              </div>
                              {item.count > 1 && (
                                <div className={`text-xs mt-1 ${
                                  isDark ? 'text-gray-500' : 'text-gray-600'
                                }`}>
                                  Needed for {item.count} {item.count === 1 ? 'meal' : 'meals'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ShoppingList;