import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import {
    LayoutDashboard,
    CalendarDays,
    ShoppingBag,
    BarChart2,
    Settings,
    UtensilsCrossed,
    User
} from 'lucide-react';

const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'mealplan', label: 'Meal Plan', icon: CalendarDays },
    { id: 'shopping', label: 'Shop', icon: ShoppingBag },
    { id: 'progress', label: 'Progress', icon: BarChart2 },
    { id: 'recipes', label: 'Recipes', icon: UtensilsCrossed },
    { id: 'settings', label: 'Settings', icon: Settings },
];

const NavigationLayout = ({ children, currentPage, setCurrentPage }) => {
    const { isDark } = useTheme();

    const handleNav = (pageId) => {
        setCurrentPage(pageId);
        // Optional: Scroll to top on nav change
        window.scrollTo(0, 0);
    };

    return (
        <div className={`min-h-screen flex flex-col md:flex-row ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>

            {/* Desktop Sidebar - Hidden on Mobile */}
            <aside className={`max-md:hidden w-20 hover:w-64 group fixed h-full z-30 transition-all duration-300 ease-in-out border-r ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
                }`}>
                <div className="flex flex-col h-full p-4">
                    {/* Header/Logo */}
                    <div className="flex items-center gap-0 group-hover:gap-3 px-2 mb-8 justify-center group-hover:justify-start whitespace-nowrap">
                        <div className="min-w-[2rem] h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white shrink-0">
                            <UtensilsCrossed size={20} />
                        </div>
                    </div>

                    <nav className="space-y-2 flex-1">
                        {NAV_ITEMS.map((item) => {
                            const Icon = item.icon;
                            const isActive = currentPage === item.id;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleNav(item.id)}
                                    className={`w-full flex items-center gap-0 group-hover:gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${isActive
                                        ? 'bg-gradient-to-r from-emerald-600/10 to-teal-600/10 text-emerald-600 font-medium'
                                        : isDark ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                        } justify-center group-hover:justify-start`}
                                >
                                    <Icon size={22} className={`shrink-0 ${isActive ? 'text-emerald-600' : ''}`} />
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-0 group-hover:w-auto overflow-hidden whitespace-nowrap">
                                        {item.label}
                                    </span>
                                    {isActive && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* User Profile Link at Bottom */}
                    <div className="mt-auto px-1">
                        <button
                            onClick={() => handleNav('profile')}
                            className={`w-full flex items-center gap-0 group-hover:gap-3 px-2 py-3 rounded-xl transition-all duration-200 ${currentPage === 'profile'
                                ? 'bg-emerald-600/10 text-emerald-600'
                                : isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                } justify-center group-hover:justify-start`}
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                                <User size={16} />
                            </div>
                            <div className="text-left min-w-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-0 group-hover:w-auto overflow-hidden whitespace-nowrap">
                                <p className="text-sm font-medium truncate">My Profile</p>
                                <p className="text-xs opacity-70 truncate">View Account</p>
                            </div>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className={`flex-1 md:ml-20 pb-20 md:pb-0 transition-all duration-300`}>
                {children}
            </main>

            {/* Mobile Bottom Navigation - Visible only on small screens */}
            <div className={`md:hidden fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-lg transition-colors ${isDark ? 'bg-gray-900/90 border-gray-800' : 'bg-white/90 border-gray-200'
                }`}>
                <nav className="flex items-center justify-around p-2 pb-safe">
                    {NAV_ITEMS.slice(0, 5).map((item) => { // Show top 5 items on mobile to fit
                        const Icon = item.icon;
                        const isActive = currentPage === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleNav(item.id)}
                                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${isActive ? 'text-emerald-600' : isDark ? 'text-gray-500' : 'text-gray-400'
                                    }`}
                            >
                                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className="mb-1" />
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

        </div>
    );
};

export default NavigationLayout;
