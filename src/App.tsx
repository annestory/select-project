import React, { useState, useEffect, useRef } from 'react';
import { Utensils, Sun, Moon, RotateCw, Plus, Trash2, RotateCcw, Volume2, VolumeX, History, Settings, Award, Copy, Check, Share2, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface HistoryItem {
  id: string;
  type: 'lunch' | 'dinner';
  menu: string;
  timestamp: string;
}

const DEFAULT_LUNCH = ['김치찌개', '돈까스', '제육볶음', '짜장면', '초밥', '샌드위치', '쌀국수', '비빔밥'];
const DEFAULT_DINNER = ['삼겹살', '치킨', '피자', '곱창', '족발', '파스타', '떡볶이', '샤브샤브'];

// Modern Pastel & Vibrant Palette
const LUNCH_COLORS = [
  '#FF7E67', '#FFB996', '#F6C667', '#6C5B7B', '#355C7D', '#99B898', '#FECEAB', '#FF847C'
];
const DINNER_COLORS = [
  '#6C5B7B', '#C06C84', '#F67280', '#F8B195', '#355C7D', '#2A363B', '#99B898', '#E84A5F'
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'lunch' | 'dinner'>('lunch');
  const [lunchMenus, setLunchMenus] = useState<string[]>(() => {
    const saved = localStorage.getItem('lunch_menus');
    return saved ? JSON.parse(saved) : DEFAULT_LUNCH;
  });
  const [dinnerMenus, setDinnerMenus] = useState<string[]>(() => {
    const saved = localStorage.getItem('dinner_menus');
    return saved ? JSON.parse(saved) : DEFAULT_DINNER;
  });

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('menu_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('dark_mode') === 'true';
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newMenuInput, setNewMenuInput] = useState('');
  const [copiedToast, setCopiedToast] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const currentMenus = activeTab === 'lunch' ? lunchMenus : dinnerMenus;
  const currentColors = activeTab === 'lunch' ? LUNCH_COLORS : DINNER_COLORS;

  useEffect(() => {
    localStorage.setItem('lunch_menus', JSON.stringify(lunchMenus));
  }, [lunchMenus]);

  useEffect(() => {
    localStorage.setItem('dinner_menus', JSON.stringify(dinnerMenus));
  }, [dinnerMenus]);

  useEffect(() => {
    localStorage.setItem('menu_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('dark_mode', darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Audio synthesizer
  const playSound = (type: 'tick' | 'win' | 'click') => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'tick') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.04);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'click') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (type === 'win') {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const noteOsc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          noteOsc.type = 'sine';
          noteOsc.frequency.setValueAtTime(freq, now + idx * 0.1);
          noteGain.gain.setValueAtTime(0, now + idx * 0.1);
          noteGain.gain.linearRampToValueAtTime(0.18, now + idx * 0.1 + 0.02);
          noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.35);
          noteOsc.connect(noteGain);
          noteGain.connect(ctx.destination);
          noteOsc.start(now + idx * 0.1);
          noteOsc.stop(now + idx * 0.1 + 0.35);
        });
      }
    } catch {
      // AudioContext fallback
    }
  };

  // Canvas Drawing
  const drawWheel = (currentRotation: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 12;

    ctx.clearRect(0, 0, width, height);

    const count = currentMenus.length;
    if (count === 0) {
      ctx.fillStyle = darkMode ? '#94a3b8' : '#64748b';
      ctx.font = '16px Pretendard, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('메뉴를 추가해 주세요!', centerX, centerY);
      return;
    }

    const arcSize = (2 * Math.PI) / count;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(currentRotation);

    for (let i = 0; i < count; i++) {
      const angleStart = i * arcSize;
      const angleEnd = (i + 1) * arcSize;

      // Slice background
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, angleStart, angleEnd);
      ctx.closePath();
      ctx.fillStyle = currentColors[i % currentColors.length];
      ctx.fill();

      // Outer border / divider
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = darkMode ? '#1e293b' : '#ffffff';
      ctx.stroke();

      // Text rendering
      ctx.save();
      ctx.rotate(angleStart + arcSize / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px Pretendard, sans-serif';
      
      // Text shadow for ultra clarity
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      let text = currentMenus[i];
      if (text.length > 6) {
        text = text.substring(0, 6) + '…';
      }
      ctx.fillText(text, radius - 30, 6);
      ctx.restore();
    }

    ctx.restore();

    // Center hub cap with glowing gradient & shadow
    ctx.beginPath();
    ctx.arc(centerX, centerY, 36, 0, 2 * Math.PI);
    ctx.fillStyle = darkMode ? '#0f172a' : '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = activeTab === 'lunch' ? '#FF7E67' : '#C06C84';
    ctx.stroke();
    ctx.shadowBlur = 0; // reset shadow

    // Center icon text
    ctx.fillStyle = activeTab === 'lunch' ? '#FF7E67' : '#C06C84';
    ctx.font = 'bold 13px Pretendard, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(activeTab === 'lunch' ? '점심' : '저녁', centerX, centerY);
  };

  useEffect(() => {
    drawWheel(rotation);
  }, [rotation, currentMenus, activeTab, darkMode]);

  // Spin Wheel function with precise ease-out physics
  const spinWheel = () => {
    if (isSpinning || currentMenus.length === 0) return;
    playSound('click');
    setIsSpinning(true);
    setShowWinnerModal(false);

    const count = currentMenus.length;
    const arcSize = (2 * Math.PI) / count;

    const minTurns = 5;
    const maxTurns = 8;
    const randomTurns = Math.floor(Math.random() * (maxTurns - minTurns + 1)) + minTurns;
    const winningIndex = Math.floor(Math.random() * count);

    const targetSliceCenterAngle = winningIndex * arcSize + arcSize / 2;
    const normalizedCurrentRotation = rotation % (2 * Math.PI);
    const extraRotation = randomTurns * 2 * Math.PI;
    const pointerAngle = -Math.PI / 2; // Top pointer
    const targetRotation = rotation + extraRotation + (pointerAngle - (targetSliceCenterAngle + normalizedCurrentRotation));
    const finalRotation = targetRotation + (2 * Math.PI * 2);

    const duration = 4000; // 4 seconds for ultra smooth deceleration
    const startTime = performance.now();
    const startRotation = rotation;

    let lastTickSegment = -1;

    const animateSpin = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth ease-out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentRot = startRotation + (finalRotation - startRotation) * easeOut;

      setRotation(currentRot);

      // Tick sound on segment boundary crossing
      const normalizedAngle = (currentRot + Math.PI / 2) % (2 * Math.PI);
      const positiveAngle = (2 * Math.PI - normalizedAngle) % (2 * Math.PI);
      const currentSegment = Math.floor(positiveAngle / arcSize) % count;
      if (currentSegment !== lastTickSegment) {
        playSound('tick');
        lastTickSegment = currentSegment;
      }

      if (progress < 1) {
        requestAnimationFrame(animateSpin);
      } else {
        setIsSpinning(false);
        const chosenMenu = currentMenus[winningIndex];
        setWinner(chosenMenu);
        setShowWinnerModal(true);
        playSound('win');

        // Epic confetti burst
        confetti({
          particleCount: 150,
          spread: 90,
          origin: { y: 0.6 },
          colors: currentColors
        });

        const newHistoryItem: HistoryItem = {
          id: Date.now().toString(),
          type: activeTab,
          menu: chosenMenu,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setHistory(prev => [newHistoryItem, ...prev.slice(0, 19)]);
      }
    };

    requestAnimationFrame(animateSpin);
  };

  const handleAddMenu = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMenuInput.trim()) return;
    const trimmed = newMenuInput.trim();
    if (activeTab === 'lunch') {
      if (!lunchMenus.includes(trimmed)) {
        setLunchMenus([...lunchMenus, trimmed]);
      }
    } else {
      if (!dinnerMenus.includes(trimmed)) {
        setDinnerMenus([...dinnerMenus, trimmed]);
      }
    }
    setNewMenuInput('');
  };

  const handleRemoveMenu = (index: number) => {
    if (activeTab === 'lunch') {
      if (lunchMenus.length <= 2) {
        alert('최소 2개 이상의 메뉴가 필요합니다.');
        return;
      }
      setLunchMenus(lunchMenus.filter((_, i) => i !== index));
    } else {
      if (dinnerMenus.length <= 2) {
        alert('최소 2개 이상의 메뉴가 필요합니다.');
        return;
      }
      setDinnerMenus(dinnerMenus.filter((_, i) => i !== index));
    }
  };

  const handleResetDefaults = () => {
    if (confirm(activeTab === 'lunch' ? '점심 메뉴를 기본값으로 초기화하시겠습니까?' : '저녁 메뉴를 기본값으로 초기화하시겠습니까?')) {
      if (activeTab === 'lunch') {
        setLunchMenus(DEFAULT_LUNCH);
      } else {
        setDinnerMenus(DEFAULT_DINNER);
      }
    }
  };

  const copyResultToClipboard = () => {
    if (!winner) return;
    const text = `[오늘 뭐 먹지? 메뉴 추천]\n오늘의 ${activeTab === 'lunch' ? '점심' : '저녁'} 추천 메뉴는 바로 [ ${winner} ] 입니다! 😋`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    });
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-gradient-to-br from-amber-50/60 via-orange-50/40 to-rose-50/50 text-slate-800'} font-sans flex flex-col selection:bg-orange-500 selection:text-white`}>
      {/* Header / Top Bar */}
      <header className={`sticky top-0 z-30 backdrop-blur-md border-b px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs transition-colors duration-300 ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-orange-100/80'}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg sm:text-xl tracking-tight">오늘 뭐 먹지?</h1>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>트렌디한 메뉴 고민 해결사</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl transition-colors ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
            title={soundEnabled ? '효과음 켜짐' : '효과음 꺼짐'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-orange-500" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2.5 rounded-xl transition-colors ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-amber-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
            title={darkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-xs ${
              darkMode 
                ? 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30' 
                : 'bg-orange-100 hover:bg-orange-200 text-orange-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">메뉴 편집</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 flex flex-col items-center">
        {/* Tab Switcher */}
        <div className={`inline-flex p-1.5 rounded-2xl shadow-sm border mb-8 w-full max-w-md transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-orange-100'}`}>
          <button
            onClick={() => { setActiveTab('lunch'); setShowWinnerModal(false); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-sm sm:text-base transition-all ${
              activeTab === 'lunch'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25 scale-[1.02]'
                : darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Sun className="w-5 h-5" />
            점심 추천
          </button>
          <button
            onClick={() => { setActiveTab('dinner'); setShowWinnerModal(false); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-sm sm:text-base transition-all ${
              activeTab === 'dinner'
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-purple-600/25 scale-[1.02]'
                : darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Moon className="w-5 h-5" />
            저녁 추천
          </button>
        </div>

        {/* Roulette Wheel Container */}
        <div className="relative flex flex-col items-center mb-8">
          {/* Gorgeous Modern Pointer Badge */}
          <div className="absolute -top-4 z-20 flex flex-col items-center filter drop-shadow-md">
            <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-amber-400 border-3 border-white dark:border-slate-900 flex items-center justify-center text-white dark:text-slate-900 shadow-lg">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-slate-900 dark:border-t-amber-400 -mt-1"></div>
          </div>

          {/* Canvas Wheel */}
          <div className={`relative p-4 rounded-full shadow-2xl border-4 transition-colors ${darkMode ? 'bg-slate-900 border-slate-800 shadow-orange-500/10' : 'bg-white border-orange-200 shadow-orange-500/15'}`}>
            <canvas
              ref={canvasRef}
              width={350}
              height={350}
              className="w-[300px] h-[300px] sm:w-[350px] sm:h-[350px] rounded-full"
            />
          </div>
        </div>

        {/* Spin Button */}
        <div className="flex flex-col items-center gap-4 w-full max-w-sm mb-12">
          <button
            onClick={spinWheel}
            disabled={isSpinning || currentMenus.length === 0}
            className={`w-full py-4 px-8 rounded-2xl font-black text-lg sm:text-xl text-white shadow-xl transition-all flex items-center justify-center gap-3 ${
              isSpinning
                ? 'bg-slate-500/50 cursor-not-allowed shadow-none'
                : activeTab === 'lunch'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-500/30 hover:scale-[1.02] active:scale-95'
                : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-purple-600/30 hover:scale-[1.02] active:scale-95'
            }`}
          >
            <RotateCw className={`w-6 h-6 ${isSpinning ? 'animate-spin' : ''}`} />
            {isSpinning ? '룰렛 회전 중...' : `${activeTab === 'lunch' ? '점심' : '저녁'} 룰렛 돌리기!`}
          </button>

          {/* Menu tags preview */}
          <div className="flex flex-wrap gap-1.5 justify-center max-w-md">
            {currentMenus.map((menu, idx) => (
              <span
                key={idx}
                className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                  darkMode 
                    ? 'bg-slate-900 border-slate-800 text-slate-400' 
                    : 'bg-white/80 border-orange-100 text-slate-600 shadow-2xs'
                }`}
              >
                {menu}
              </span>
            ))}
          </div>
        </div>

        {/* Winner Result Card / Modal */}
        {showWinnerModal && winner && (
          <div className={`w-full max-w-md rounded-3xl shadow-2xl border-2 p-6 sm:p-8 text-center animate-in fade-in zoom-in-95 duration-300 mb-10 relative overflow-hidden transition-colors ${
            darkMode 
              ? 'bg-slate-900 border-orange-500/40 shadow-orange-500/10' 
              : 'bg-white border-orange-300 shadow-orange-500/15'
          }`}>
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-500 mb-3 shadow-inner">
              <Award className="w-8 h-8" />
            </div>

            <span className="text-xs font-bold uppercase tracking-wider text-orange-500 bg-orange-500/10 px-3 py-1 rounded-full">
              오늘의 {activeTab === 'lunch' ? '점심' : '저녁'} 추천 메뉴 당첨!
            </span>

            <h2 className="text-3xl sm:text-4xl font-black mt-3 mb-2 tracking-tight">
              ✨ {winner} ✨
            </h2>
            <p className={`text-sm mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>맛있는 식사로 활기찬 하루 보내세요!</p>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                onClick={spinWheel}
                className="py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <RotateCw className="w-4 h-4" />
                다시 돌리기
              </button>
              <button
                onClick={copyResultToClipboard}
                className={`py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border ${
                  darkMode 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
              >
                <Copy className="w-4 h-4" />
                결과 복사하기
              </button>
            </div>

            {copiedToast && (
              <div className="text-xs text-emerald-500 font-semibold animate-bounce mt-2">
                ✓ 결과가 클립보드에 복사되었습니다!
              </div>
            )}
          </div>
        )}

        {/* History Section */}
        {history.length > 0 && (
          <div className={`w-full max-w-xl backdrop-blur-md rounded-2xl border p-5 shadow-sm transition-colors ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white/70 border-orange-100'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-bold">
                <History className="w-4 h-4 text-orange-500" />
                <h3>추천 기록</h3>
              </div>
              <button
                onClick={() => setHistory([])}
                className="text-xs text-slate-400 hover:text-rose-500 transition-colors"
              >
                기록 삭제
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {history.map(item => (
                <div key={item.id} className={`flex items-center justify-between py-2.5 px-3.5 rounded-xl border text-sm transition-colors ${darkMode ? 'bg-slate-900/80 border-slate-800 text-slate-200' : 'bg-white border-slate-100 text-slate-800'}`}>
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${item.type === 'lunch' ? 'bg-orange-500' : 'bg-purple-600'}`}></span>
                    <span className="font-semibold">{item.menu}</span>
                    <span className="text-xs text-slate-400">({item.type === 'lunch' ? '점심' : '저녁'})</span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{item.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`py-6 text-center text-xs border-t transition-colors ${darkMode ? 'border-slate-800 text-slate-500' : 'border-orange-100/60 text-slate-400'}`}>
        <p>© 2026 오늘 뭐 먹지? 트렌디 메뉴 추천 룰렛. All rights reserved.</p>
      </footer>

      {/* Menu Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 border transition-colors ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-orange-100 text-slate-900'}`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-orange-500" />
                <h3 className="font-bold text-lg">
                  {activeTab === 'lunch' ? '점심' : '저녁'} 메뉴 편집
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Add Menu Form */}
            <form onSubmit={handleAddMenu} className="flex gap-2 mb-6">
              <input
                type="text"
                value={newMenuInput}
                onChange={e => setNewMenuInput(e.target.value)}
                placeholder="새로운 메뉴 입력 (예: 부대찌개)"
                className={`flex-1 px-4 py-3 rounded-xl border text-sm focus:outline-none focus:border-orange-500 transition-colors ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}
              />
              <button
                type="submit"
                className="px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors flex items-center gap-1 shadow-md"
              >
                <Plus className="w-4 h-4" />
                추가
              </button>
            </form>

            {/* Menu List */}
            <div className="max-h-60 overflow-y-auto space-y-2 mb-6 pr-1">
              {currentMenus.map((menu, idx) => (
                <div key={idx} className={`flex items-center justify-between py-2.5 px-3.5 rounded-xl border transition-colors ${darkMode ? 'bg-slate-800/60 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-100 text-slate-800'}`}>
                  <span className="font-medium text-sm">{menu}</span>
                  <button
                    onClick={() => handleRemoveMenu(idx)}
                    className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={handleResetDefaults}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-orange-500 transition-colors font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                기본값으로 초기화
              </button>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm shadow-md transition-colors"
              >
                완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
