import React, { useState, useEffect } from 'react';
import { ShoppingCart, Check, Download, Printer, Copy, FileText, Share2, Trash2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { jsPDF } from "jspdf";

const ShoppingList = ({ shoppingList, costEstimate }) => {
  const { isDark } = useTheme();
  // Load checked items from local storage
  const [checkedItems, setCheckedItems] = useState(() => {
    const saved = localStorage.getItem('shopping_checked_items');
    return saved ? JSON.parse(saved) : {};
  });

  const [expandedCategories, setExpandedCategories] = useState({
    vegetables: false,
    proteins: false,
    grains: false,
    dairy: false,
    fruits: false,
    spices: false,
    oils: false,
    others: false
  });

  // Save checked items to local storage whenever they change
  useEffect(() => {
    localStorage.setItem('shopping_checked_items', JSON.stringify(checkedItems));
  }, [checkedItems]);

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

  const clearChecked = () => {
    if (window.confirm('Clear all checked items?')) {
      setCheckedItems({});
    }
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const getCheckedCount = (category) => {
    return shoppingList.byCategory[category].filter(item =>
      checkedItems[item.name.toLowerCase()] // Use name as key to match generator
    ).length;
  };

  const getTotalChecked = () => {
    return Object.keys(checkedItems).filter(key => checkedItems[key]).length;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = async () => {
    let content = "🛒 WEEKLY SHOPPING LIST\n\n";

    Object.keys(shoppingList.byCategory).forEach(category => {
      const items = shoppingList.byCategory[category];
      if (items.length > 0) {
        content += `${category.toUpperCase()}\n`;
        items.forEach(item => {
          const isChecked = checkedItems[item.name.toLowerCase()];
          content += `${isChecked ? '[x]' : '[ ]'} ${item.display || item.original}\n`;
        });
        content += "\n";
      }
    });

    try {
      await navigator.clipboard.writeText(content);
      alert('Shopping list copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(0, 150, 136); // Emerald color
    doc.text("Weekly Shopping List", 20, 20);

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, 30);

    let yPos = 45;

    Object.keys(shoppingList.byCategory).forEach(category => {
      const items = shoppingList.byCategory[category];
      if (items.length > 0) {
        // Check for page break
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        // Category Header
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.text(`${categoryIcons[category]} ${category.charAt(0).toUpperCase() + category.slice(1)}`, 20, yPos);
        yPos += 10;

        // Items
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        items.forEach(item => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          const isChecked = checkedItems[item.name.toLowerCase()];
          const checkbox = isChecked ? "[x]" : "[ ]";
          const text = `${checkbox}  ${item.display || item.original}`;

          // Strike through if checked? PDF support is tricky, simplified for now
          if (isChecked) {
            doc.setTextColor(150);
          } else {
            doc.setTextColor(50);
          }

          doc.text(text, 25, yPos);
          yPos += 7;
        });

        yPos += 5; // Spacing between categories
      }
    });

    doc.save("nutriplan-shopping-list.pdf");
  };

  return (
    <div>
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Shopping List
          </h2>
          <div className="flex items-center space-x-4">
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {shoppingList.totalItems} items total
            </p>
            <div className={`h-4 w-px ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
            <p className={`text-sm ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              Est. Cost: ₹{costEstimate?.total || 0}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleCopy}
            className={`px-4 py-2.5 rounded-xl font-medium flex items-center space-x-2 transition-all ${isDark
              ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            title="Copy to Clipboard"
          >
            <Copy className="w-4 h-4" />
            <span className="hidden sm:inline">Copy</span>
          </button>

          <button
            onClick={handlePrint}
            className={`px-4 py-2.5 rounded-xl font-medium flex items-center space-x-2 transition-all ${isDark
              ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            title="Print List"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className={`px-4 py-2.5 rounded-xl font-medium flex items-center space-x-2 transition-all ${isDark
              ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/20'
              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200'
              }`}
            title="Download PDF"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Download PDF</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Progress</span>
          <span className={isDark ? 'text-white' : 'text-gray-900'}>{getTotalChecked()} / {shoppingList.totalItems} done</span>
        </div>
        <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
          <div
            className="h-full bg-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${(getTotalChecked() / shoppingList.totalItems) * 100}%` }}
          ></div>
        </div>
        {getTotalChecked() > 0 && (
          <div className="mt-2 text-right">
            <button
              onClick={clearChecked}
              className="text-xs text-red-500 hover:text-red-600 flex items-center justify-end ml-auto"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear checked
            </button>
          </div>
        )}
      </div>

      {/* Categories */}
      <div className="columns-1 md:columns-2 gap-6 space-y-6">
        {Object.keys(shoppingList.byCategory).map(category => {
          const items = shoppingList.byCategory[category];
          if (items.length === 0) return null;

          const isExpanded = expandedCategories[category];
          const checkedCount = getCheckedCount(category);
          const colorClass = categoryColors[category][isDark ? 'dark' : 'light'];
          const allChecked = checkedCount === items.length;

          return (
            <div
              key={category}
              className={`break-inside-avoid rounded-2xl overflow-hidden transition-all duration-300 ${isDark
                ? `bg-gray-800 border ${allChecked ? 'border-emerald-600/50' : 'border-gray-700'}`
                : `bg-white border ${allChecked ? 'border-emerald-200' : 'border-gray-100'} shadow-sm`
                }`}
            >
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className={`w-full p-4 flex items-center justify-between transition-colors ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-opacity ${allChecked ? 'opacity-50' : 'opacity-100'} ${colorClass}`}>
                    <span className="text-xl">{categoryIcons[category]}</span>
                  </div>
                  <div className="text-left">
                    <h3 className={`font-bold capitalize flex items-center ${isDark ? 'text-white' : 'text-gray-900'} ${allChecked ? 'line-through text-opacity-50' : ''}`}>
                      {category}
                      {allChecked && <Check className="w-4 h-4 ml-2 text-emerald-500" />}
                    </h3>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {checkedCount}/{items.length} bought
                    </p>
                  </div>
                </div>

                <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                  <svg className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Items List */}
              {isExpanded && (
                <div className={`border-t p-2 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  <div className="space-y-1">
                    {items.map((item, idx) => {
                      // Construct a unique-ish key or use parsed name
                      const itemKey = item.name.toLowerCase();
                      const isChecked = checkedItems[itemKey];

                      return (
                        <div
                          key={idx}
                          onClick={() => toggleItem(itemKey)}
                          className={`p-2.5 rounded-xl cursor-pointer group transition-all select-none flex items-start space-x-3 ${isChecked
                            ? isDark
                              ? 'bg-emerald-900/10 text-gray-500' // Checked Dark
                              : 'bg-emerald-50/50 text-gray-400'   // Checked Light
                            : isDark
                              ? 'hover:bg-gray-700'
                              : 'hover:bg-gray-50'
                            }`}
                        >
                          <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${isChecked
                            ? 'bg-emerald-500 border-emerald-500'
                            : isDark
                              ? 'border-gray-600 group-hover:border-emerald-500/50'
                              : 'border-gray-300 group-hover:border-emerald-400'
                            }`}>
                            {isChecked && (
                              <Check className="w-3 h-3 text-white" strokeWidth={3} />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium truncate ${isChecked ? 'line-through' : (isDark ? 'text-gray-200' : 'text-gray-900')}`}>
                              {item.display || item.original}
                            </div>
                            {/* Show usage count if > 1 meal */}
                            {item.count > 1 && !isChecked && (
                              <div className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                Used in {item.count} meals
                              </div>
                            )}
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