import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sparkles, Send, User, Bot, Zap } from 'lucide-react';
import { api } from '../services/api';
import { getWeeklyCompliance } from '../services/complianceService';

// ─── Rule-based response engine ──────────────────────────────────────────────
const generateResponse = (message, profile, weeklyCompliance) => {
  const msg = message.toLowerCase();
  const goal = profile?.goal || 'maintain';
  const calories = profile?.nutritionTargets?.targetCalories || 2000;
  const protein = profile?.nutritionTargets?.macros?.protein || 150;
  const carbs = profile?.nutritionTargets?.macros?.carbs || 200;
  const fat = profile?.nutritionTargets?.macros?.fat || 65;
  const tdee = profile?.nutritionTargets?.tdee || calories;
  const bmr = Math.round(tdee / (profile?.activityLevel || 1.55));
  const diet = profile?.dietaryPreference || 'non_veg';
  const compliance = weeklyCompliance?.overallCompliance ?? 0;
  const name = profile?.name || 'there';
  const weight = profile?.weight || 70;
  const targetWeight = profile?.targetWeight || weight;
  const budget = profile?.budget || 'medium';
  const allergies = (profile?.allergies || []).join(', ') || 'none';

  // Calorie / target questions
  if (msg.includes('calorie') || msg.includes('kcal') || msg.includes('energy')) {
    return `Your daily calorie target is **${calories} kcal**, calculated from your TDEE of **${tdee} kcal**.\n\nBreakdown:\n• 🌅 Breakfast: ~${Math.round(calories * 0.25)} kcal (25%)\n• 🍽️ Lunch: ~${Math.round(calories * 0.35)} kcal (35%)\n• 🍎 Snack: ~${Math.round(calories * 0.10)} kcal (10%)\n• 🌙 Dinner: ~${Math.round(calories * 0.30)} kcal (30%)\n\nStay within ±100 kcal of your target for best results.`;
  }

  // BMR / metabolism
  if (msg.includes('bmr') || msg.includes('basal') || msg.includes('metabolism') || msg.includes('tdee')) {
    return `Here are your key metabolic numbers:\n\n• **BMR** (Basal Metabolic Rate): **${bmr} kcal/day** — what your body burns at rest\n• **TDEE** (Total Daily Energy Expenditure): **${tdee} kcal/day** — with your activity level\n• **Target Calories**: **${calories} kcal/day** — adjusted for your ${goal === 'lose' ? 'weight loss' : goal === 'gain' ? 'muscle gain' : 'maintenance'} goal\n\nThese are calculated using the **Mifflin-St Jeor equation**, which is the most accurate standard formula.`;
  }

  // Protein questions
  if (msg.includes('protein')) {
    return `Your daily protein target is **${protein}g**.\n\n${diet === 'vegan' || diet === 'vegetarian' ? '🌱 Great plant-based sources:\n• Lentils (18g/cup)\n• Tofu (20g/cup)\n• Chickpeas (15g/cup)\n• Greek yogurt (17g/cup)\n• Quinoa (8g/cup)' : '🍗 Top protein sources:\n• Chicken breast (31g/100g)\n• Eggs (6g each)\n• Paneer (18g/100g)\n• Fish (25g/100g)\n• Lentils (18g/cup)'}\n\nAim for **${Math.round(protein / 4)}g per meal** spread across the day.`;
  }

  // Carbs
  if (msg.includes('carb') || msg.includes('carbohydrate')) {
    return `Your daily carbohydrate target is **${carbs}g**.\n\nFocus on complex carbs:\n• Brown rice, oats, quinoa\n• Sweet potato, lentils\n• Whole wheat roti/bread\n• Fruits and vegetables\n\nAvoid refined sugars and white bread as much as possible. Pre-workout meals should be higher in carbs (~${Math.round(carbs * 0.35)}g) for energy.`;
  }

  // Fat / macros
  if (msg.includes('fat') || msg.includes('macro')) {
    return `Your daily macro targets are:\n\n• 🥩 Protein: **${protein}g** (${Math.round((protein * 4 / calories) * 100)}%)\n• 🍚 Carbohydrates: **${carbs}g** (${Math.round((carbs * 4 / calories) * 100)}%)\n• 🥑 Fat: **${fat}g** (${Math.round((fat * 9 / calories) * 100)}%)\n\nHealthy fat sources: avocado, nuts, olive oil, ghee (in moderation). These support hormones and brain health.`;
  }

  // Water / hydration
  if (msg.includes('water') || msg.includes('hydrat') || msg.includes('drink')) {
    const target = Math.round(weight * 35); // 35ml per kg
    return `Your recommended daily water intake is **${target}ml** (~${(target / 1000).toFixed(1)}L).\n\nTips:\n• Drink a glass of water first thing in the morning\n• Keep a bottle at your desk\n• Add a glass before each meal (helps with satiety)\n• ${goal === 'lose' ? 'Drinking water 30 min before meals can reduce calorie intake by up to 13%!' : 'Proper hydration improves muscle recovery and performance!'}\n\nYour hydration is tracked daily — check the Dashboard for your progress.`;
  }

  // Goal / weight
  if (msg.includes('goal') || msg.includes('weight') || msg.includes('target')) {
    const diff = Math.abs(weight - targetWeight).toFixed(1);
    if (goal === 'lose') {
      return `Your goal is to **lose weight** — from **${weight}kg to ${targetWeight}kg** (${diff}kg to go).\n\nYour plan:\n• Calorie deficit: ~${Math.round(tdee - calories)} kcal/day\n• Expected rate: ~0.5kg/week\n• Focus on: high protein (${protein}g/day), fiber-rich foods, and staying within ${calories} kcal\n\nConsistency over perfection — even 80% compliance gets great results!`;
    } else if (goal === 'gain') {
      return `Your goal is to **gain muscle** — target weight **${targetWeight}kg** (${diff}kg to go).\n\nYour plan:\n• Calorie surplus: ~${Math.round(calories - tdee)} kcal/day\n• High protein: **${protein}g/day** is essential for muscle synthesis\n• Strength training 3–4x/week amplifies results\n• Don't skip carbs — they fuel workouts and spare protein for muscle building.`;
    } else {
      return `Your goal is to **maintain weight** at **${weight}kg**.\n\nYour calorie target of **${calories} kcal** matches your TDEE. Focus on:\n• Consistent meal timing\n• Balanced macros (${protein}g protein / ${carbs}g carbs / ${fat}g fat)\n• Regular hydration\n• Keep compliance above 80% for optimal health.`;
    }
  }

  // Compliance / adherence
  if (msg.includes('compli') || msg.includes('doing') || msg.includes('progress') || msg.includes('adherence')) {
    const emoji = compliance >= 80 ? '🏆' : compliance >= 60 ? '👍' : '💪';
    return `${emoji} Your current weekly meal compliance is **${compliance}%**.\n\n${compliance >= 80 ? 'Excellent work! You\'re well on track. Keep this up and you\'ll see results fast.' : compliance >= 60 ? 'Good progress! Try to log all meals and aim for 80%+ compliance this week.' : 'You\'re building the habit — every meal logged counts. Try setting a reminder before each meal time.'}\n\nTip: Preparing meals in advance on Sunday dramatically improves weekday compliance.`;
  }

  // Snack suggestions
  if (msg.includes('snack')) {
    const snacks = diet === 'vegan'
      ? ['Apple with almond butter (~200 kcal)', 'Hummus with carrot sticks (~180 kcal)', 'Mixed nuts (30g) (~180 kcal)', 'Banana + peanut butter (~220 kcal)']
      : ['Boiled eggs (2) + fruit (~200 kcal)', 'Greek yogurt with berries (~150 kcal)', 'Paneer cubes + cucumber (~180 kcal)', 'Roasted chana (~130 kcal)'];
    return `Here are ${budget === 'low' ? 'budget-friendly' : 'great'} high-protein snack ideas for you:\n\n${snacks.map(s => `• ${s}`).join('\n')}\n\nYour snack target is ~**${Math.round(calories * 0.10)} kcal**. Choose options that keep you satisfied for 2–3 hours.`;
  }

  // Breakfast suggestions
  if (msg.includes('breakfast')) {
    return `Great breakfast options for your ${diet} ${goal} goal:\n\n• **Oats with nuts and banana** (~350 kcal, 12g protein)\n• **Moong dal cheela** (~280 kcal, 18g protein) — high protein and filling\n• **Greek yogurt with granola** (~320 kcal, 15g protein)\n• **Whole wheat toast + eggs** (~400 kcal, 22g protein)\n\nYour breakfast target is **${Math.round(calories * 0.25)} kcal**. Eating a high-protein breakfast reduces cravings throughout the day.`;
  }

  // Allergies / food safety
  if (msg.includes('allerg') || msg.includes('avoid') || msg.includes('safe')) {
    return `Based on your profile, you should avoid:\n\n• 🚫 **Allergens**: ${allergies !== 'none' ? allergies : 'None listed (update your profile to add allergies)'}\n\nYour meal plan is automatically filtered to exclude these ingredients. When dining out:\n• Always ask about hidden allergens in sauces and marinades\n• Carry your own snacks as a safe backup\n• The swap feature in your Meal Plan can instantly replace any dish with a safe alternative.`;
  }

  // Budget tips
  if (msg.includes('budget') || msg.includes('cheap') || msg.includes('cost') || msg.includes('afford')) {
    return `Smart budget-conscious eating tips for your plan:\n\n💰 **Affordable high-nutrition foods:**\n• Eggs — cheapest protein source\n• Lentils (dal) — 20g protein/cup, very cheap\n• Bananas & seasonal fruits\n• Brown rice, oats, whole wheat atta\n• Frozen vegetables (as nutritious as fresh)\n\n🛒 **Shopping tips:**\n• Buy in bulk for staples (lentils, rice, oats)\n• Check the 'Shop' page for your weekly shopping list\n• Seasonal produce is always cheaper and fresher`;
  }

  // Meal timing
  if (msg.includes('when') || msg.includes('timing') || msg.includes('time') || msg.includes('schedule')) {
    return `Optimal meal timing for your ${goal} goal:\n\n• 🌅 **Breakfast**: 7–9 AM (within 1 hour of waking)\n• 🍽️ **Lunch**: 12–1 PM\n• 🍎 **Snack**: 3–4 PM (before energy dip)\n• 🌙 **Dinner**: 7–8 PM (2–3 hours before bed)\n\n${goal === 'gain' ? 'Post-workout: Eat protein + carbs within 30 minutes of training for best muscle synthesis.' : goal === 'lose' ? 'Avoid eating after 8 PM — evening calories are more likely to be stored as fat.' : 'Consistent timing regulates hunger hormones and improves metabolism.'}`;
  }

  // Default / greeting
  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
    return `Hi ${name}! 👋 I'm your AI Diet Assistant.\n\nI can help you with:\n• Your calorie & macro targets\n• BMR and TDEE explanation\n• Meal timing & snack ideas\n• Hydration recommendations\n• Budget-friendly food choices\n• Progress & compliance tips\n\nWhat would you like to know?`;
  }

  return `I'm here to help with your nutrition journey, ${name}! Try asking about:\n\n• **"What's my calorie target?"**\n• **"How much protein do I need?"**\n• **"How am I doing this week?"**\n• **"Suggest a high-protein snack"**\n• **"What's my BMR?"**\n• **"When should I eat?"**\n\nThe more specific your question, the better I can help! 🥗`;
};

const QUICK_CHIPS = [
  "What's my calorie target?",
  "How much protein do I need?",
  "How am I doing this week?",
  "Suggest a high-protein snack",
  "What's my BMR and TDEE?",
  "How much water should I drink?",
  "When should I eat my meals?",
  "Budget-friendly food tips",
];

// ─── Component ────────────────────────────────────────────────────────────────
const AIDietAssistantPage = () => {
  const { isDark } = useTheme();
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      text: "Hi! I'm your AI Diet Assistant 🥗\n\nI can answer questions about your calorie targets, macros, hydration, meal timing, and more — all personalised to your profile.\n\nWhat would you like to know?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [profile, setProfile] = useState(null);
  const [weeklyCompliance, setWeeklyCompliance] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const p = await api.getUserProfile();
        setProfile(p);
      } catch (_) {
        const local = localStorage.getItem('userProfile');
        if (local) setProfile(JSON.parse(local));
      }
      setWeeklyCompliance(getWeeklyCompliance());
    };
    load();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText) return;
    setInput('');

    const userMsg = { id: Date.now(), role: 'user', text: userText, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    await new Promise(r => setTimeout(r, 800 + Math.random() * 600));

    const response = generateResponse(userText, profile, weeklyCompliance);
    setIsTyping(false);
    setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', text: response, timestamp: new Date() }]);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Render markdown-lite: **bold**, bullet •, newlines
  const renderText = (text) => {
    return text.split('\n').map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <span key={i}>
          {parts.map((part, j) =>
            j % 2 === 1
              ? <strong key={j}>{part}</strong>
              : <span key={j}>{part}</span>
          )}
          {i < text.split('\n').length - 1 && <br />}
        </span>
      );
    });
  };

  const surface = isDark ? 'oklch(18% 0.022 152)' : '#fff';
  const surface2 = isDark ? 'oklch(22% 0.025 152)' : 'oklch(97% 0.008 152)';
  const border = isDark ? 'oklch(28% 0.03 152)' : 'oklch(88% 0.018 152)';
  const textPrimary = isDark ? 'oklch(94% 0.012 152)' : 'oklch(18% 0.02 152)';
  const textMuted = isDark ? 'oklch(55% 0.018 152)' : 'oklch(52% 0.02 152)';

  return (
    <div style={{ minHeight: '100vh', background: isDark ? 'oklch(14% 0.018 152)' : 'oklch(98% 0.008 152)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '1.5rem 2rem 1rem', borderBottom: `1px solid ${border}`, background: surface }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '3rem', height: '3rem', borderRadius: '0.875rem', background: 'linear-gradient(135deg, oklch(52% 0.2 280), oklch(62% 0.18 200))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px oklch(52% 0.2 280 / 0.3)' }}>
            <Sparkles size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.03em', color: textPrimary, margin: 0 }}>AI Diet Assistant</h1>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8rem', color: textMuted, margin: 0 }}>Personalised nutrition guidance powered by your profile</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.75rem', borderRadius: '999px', background: 'oklch(88% 0.08 152)', border: '1px solid oklch(78% 0.1 152)' }}>
            <Zap size={12} color="oklch(38% 0.12 152)" />
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.72rem', fontWeight: 700, color: 'oklch(35% 0.12 152)', letterSpacing: '0.04em' }}>LIVE</span>
          </div>
        </div>
      </div>

      {/* Chat thread */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1rem' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
              {/* Avatar */}
              <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', flexShrink: 0, background: msg.role === 'user' ? 'var(--color-brand)' : 'linear-gradient(135deg, oklch(52% 0.2 280), oklch(62% 0.18 200))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {msg.role === 'user' ? <User size={14} color="#fff" /> : <Bot size={14} color="#fff" />}
              </div>
              {/* Bubble */}
              <div style={{ maxWidth: '72%', padding: '0.875rem 1.125rem', borderRadius: msg.role === 'user' ? '1.25rem 0.375rem 1.25rem 1.25rem' : '0.375rem 1.25rem 1.25rem 1.25rem', background: msg.role === 'user' ? 'var(--color-brand)' : surface2, border: msg.role === 'user' ? 'none' : `1px solid ${border}`, boxShadow: '0 2px 8px oklch(0% 0 0 / 0.06)' }}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', lineHeight: 1.65, color: msg.role === 'user' ? '#fff' : textPrimary, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {renderText(msg.text)}
                </p>
                <span style={{ display: 'block', marginTop: '0.4rem', fontFamily: 'var(--font-ui)', fontSize: '0.68rem', color: msg.role === 'user' ? 'rgba(255,255,255,0.65)' : textMuted }}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: 'linear-gradient(135deg, oklch(52% 0.2 280), oklch(62% 0.18 200))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={14} color="#fff" />
              </div>
              <div style={{ padding: '0.875rem 1.125rem', borderRadius: '0.375rem 1.25rem 1.25rem 1.25rem', background: surface2, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--color-brand)', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Quick chips */}
      <div style={{ background: surface, borderTop: `1px solid ${border}`, padding: '0.75rem 1rem 0' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {QUICK_CHIPS.map(chip => (
            <button key={chip} onClick={() => sendMessage(chip)} style={{ flexShrink: 0, padding: '0.4rem 0.875rem', borderRadius: '999px', border: `1px solid ${border}`, background: 'transparent', color: textMuted, fontFamily: 'var(--font-ui)', fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer', transition: 'all 150ms', whiteSpace: 'nowrap' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-brand-muted)'; e.currentTarget.style.color = 'var(--color-brand)'; e.currentTarget.style.borderColor = 'var(--color-brand)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = textMuted; e.currentTarget.style.borderColor = border; }}>
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={{ background: surface, borderTop: `1px solid ${border}`, padding: '0.75rem 1rem 1rem' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask about your diet, calories, macros..."
            style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '0.875rem', border: `1.5px solid ${border}`, background: surface2, color: textPrimary, fontFamily: 'var(--font-body)', fontSize: '0.9rem', resize: 'none', outline: 'none', lineHeight: 1.5, transition: 'border-color 150ms' }}
            onFocus={e => e.target.style.borderColor = 'var(--color-brand)'}
            onBlur={e => e.target.style.borderColor = border}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isTyping}
            style={{ width: '2.75rem', height: '2.75rem', borderRadius: '0.875rem', border: 'none', background: input.trim() && !isTyping ? 'var(--color-brand)' : (isDark ? 'oklch(28% 0.03 152)' : 'oklch(88% 0.018 152)'), color: input.trim() && !isTyping ? '#fff' : textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: input.trim() && !isTyping ? 'pointer' : 'not-allowed', flexShrink: 0, transition: 'all 150ms' }}>
            <Send size={18} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
};

export default AIDietAssistantPage;
