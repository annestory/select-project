import React, { useState, useEffect, useRef } from 'react';
import { Utensils, Sun, Moon, RotateCw, Plus, Trash2, RotateCcw, Volume2, VolumeX, History, Sparkles, Check, Settings, Award } from 'lucide-react';
import confetti from 'canvas-confetti';

interface HistoryItem {
  id: string;
  type: 'lunch' | 'dinner';
  menu: string;
  timestamp: string;
}

const DEFAULT_LUNCH = ['김치찌개', '돈까스', '제육볶음', '짜장면', '초밥', '샌드위치', '쌀국수', '비빔밥'];
const DEFAULT_DINNER = ['삼겹살', '치킨', '피자', '곱창', '족발', '파스타', '떡볶이', '샤브샤브'];

const WHEEL_COLORS = [
  '#f97316', // Orange
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#10b981', // Emerald
  '#f43f5e', // Rose
  '#3b82f6', // Blue
  '#eab308', // Yellow
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#6366f1', // Indigo
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
  const [rotation, setRotation] = useState(0); // in radians
  const [winner, setWinner] = useState<string | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newMenuInput, setNewMenuInput] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const currentMenus = activeTab === 'lunch' ? lunchMenus : dinnerMenus;

  // Save menus to localStorage
  useEffect(() => {
    localStorage.setItem('lunch_menus', JSON.stringify(lunchMenus));
  }, [lunchMenus]);

  useEffect(() => {
    localStorage.setItem('dinner_menus', JSON.stringify(dinnerMenus));
  }, [dinnerMenus]);

  useEffect(() => {
    localStorage.setItem('menu_history', JSON.stringify(history));
  }, [history]);

  // Web Audio API sound generator
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
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'win') {
        // Victory fanfare arpeggio
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const noteOsc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          noteOsc.type = 'sine';
          noteOsc.frequency.setValueAtTime(freq, now + idx * 0.12);
          noteGain.gain.setValueAtTime(0, now + idx * 0.12);
          noteGain.gain.linearRampToValueAtTime(0.2, now + idx * 0.12 + 0.02);
          noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.4);
          noteOsc.connect(noteGain);
          noteGain.connect(ctx.destination);
          noteOsc.start(now + idx * 0.12);
          noteOsc.stop(now + idx * 0.12 + 0.4);
        });
      }
    } catch {
      // AudioContext might be blocked before user interaction
    }
  };

  // Draw wheel on canvas
  const drawWheel = (currentRotation: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 15;

    ctx.clearRect(0, 0, width, height);

    const count = currentMenus.length;
    if (count === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px sans-serif';
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
      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
      ctx.fill();

      // Border of slice
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Text
      ctx.save();
      ctx.rotate(angleStart + arcSize / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px "Pretendard", sans-serif';
      
      // Shadow for readability
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      // Truncate or fit text
      let text = currentMenus[i];
      if (text.length > 6) {
        text = text.substring(0, 6) + '…';
      }
      ctx.fillText(text, radius - 25, 6);
      ctx.restore();
    }

    ctx.restore();

    // Draw center cap
    ctx.beginPath();
    ctx.arc(centerX, centerY, 32, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = activeTab === 'lunch' ? '#f97316' : '#8b5cf6';
    ctx.stroke();

    // Center icon/text
    ctx.fillStyle = activeTab === 'lunch' ? '#f97316' : '#8b5cf6';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(activeTab === 'lunch' ? '점심' : '저녁', centerX, centerY);
  };

  useEffect(() => {
    drawWheel(rotation);
  }, [rotation, currentMenus, activeTab]);

  // Spin function (3-5 seconds duration)
  const spinWheel = () => {
    if (isSpinning || currentMenus.length === 0) return;
    playSound('click');
    setIsSpinning(true);
    setShowWinnerModal(false);

    const count = currentMenus.length;
    const arcSize = (2 * Math.PI) / count;

    // Random extra full rotations (3 to 5 full turns = 6 * PI to 10 * PI)
    const minTurns = 4;
    const maxTurns = 7;
    const randomTurns = Math.floor(Math.random() * (maxTurns - minTurns + 1)) + minTurns;
    
    // Choose random winning index
    const winningIndex = Math.floor(Math.random() * count);

    // Calculate target rotation so pointer (at top, angle = -PI/2 or 3*PI/2) points to winningIndex
    // The slice for winningIndex starts at winningIndex * arcSize and ends at (winningIndex + 1) * arcSize.
    // The center of the winning slice is winningIndex * arcSize + arcSize / 2.
    // Since pointer is at top (-Math.PI / 2 radians in standard canvas if unrotated, or top center),
    // let's compute precise target:
    const targetSliceCenterAngle = winningIndex * arcSize + arcSize / 2;
    // We want targetSliceCenterAngle + finalRotation modulo 2*PI to align with top (-Math.PI/2)
    // Top pointer corresponds to angle -Math.PI / 2 relative to center.
    const normalizedCurrentRotation = rotation % (2 * Math.PI);
    const extraRotation = randomTurns * 2 * Math.PI;
    
    // Target offset
    const pointerAngle = -Math.PI / 2;
    const targetRotation = rotation + extraRotation + (pointerAngle - (targetSliceCenterAngle + normalizedCurrentRotation));
    
    // Ensure it spins forward significantly
    const finalRotation = targetRotation + (2 * Math.PI * 2);

    const duration = 3500; // 3.5 seconds
    const startTime = performance.now();
    const startRotation = rotation;

    let lastTickSegment = -1;

    const animateSpin = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic: 1 - Math.pow(1 - progress, 3)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentRot = startRotation + (finalRotation - startRotation) * easeOut;

      setRotation(currentRot);

      // Play tick sound when crossing segment boundaries
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
        // Spin finished
        setIsSpinning(false);
        const chosenMenu = currentMenus[winningIndex];
        setWinner(chosenMenu);
        setShowWinnerModal(true);
        playSound('win');

        // Trigger confetti
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });

        // Add to history
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

  // Add menu handler
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 text-slate-800 font-sans flex flex-col selection:bg-orange-500 selection:text-white">
      {/* Header / Top Bar */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/80 border-b border-orange-100 px-4 sm:px-8 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg sm:text-xl tracking-tight text-slate-900">오늘 뭐 먹지?</h1>
            <p className="text-xs text-slate-500">메뉴 고민 해결 룰렛</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            title={soundEnabled ? '소리 켜짐' : '소리 꺼짐'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-orange-600" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
          </button>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-700 text-sm font-semibold transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">메뉴 편집</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 sm:py-10 flex flex-col items-center">
        {/* Tab Selector */}
        <div className="inline-flex p-1.5 bg-white rounded-2xl shadow-sm border border-orange-100 mb-8 w-full max-w-md">
          <button
            onClick={() => { setActiveTab('lunch'); setShowWinnerModal(false); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-sm sm:text-base transition-all ${
              activeTab === 'lunch'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25 scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Sun className="w-5 h-5" />
            점심 추천
          </button>
          <button
            onClick={() => { setActiveTab('dinner'); setShowWinnerModal(false); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-sm sm:text-base transition-all ${
              activeTab === 'dinner'
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-purple-600/25 scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Moon className="w-5 h-5" />
            저녁 추천
          </button>
        </div>

        {/* Roulette Area */}
        <div className="relative flex flex-col items-center mb-8">
          {/* Top Pointer Triangle */}
          <div className="absolute -top-3 z-20 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[26px] border-t-slate-900 drop-shadow-md"></div>

          {/* Canvas Container */}
          <div className="relative p-4 bg-white rounded-full shadow-2xl border-4 border-orange-200">
            <canvas
              ref={canvasRef}
              width={340}
              height={340}
              className="w-[300px] h-[300px] sm:w-[340px] sm:h-[340px] rounded-full"
            />

            {/* Center Spinning Indicator */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {isSpinning && (
                <div className="absolute inset-0 rounded-full border-4 border-orange-500 border-t-transparent animate-spin opacity-40"></div>
              )}
            </div>
          </div>
        </div>

        {/* Spin Button */}
        <div className="flex flex-col items-center gap-4 w-full max-w-sm mb-12">
          <button
            onClick={spinWheel}
            disabled={isSpinning || currentMenus.length === 0}
            className={`w-full py-4 px-8 rounded-2xl font-black text-lg sm:text-xl text-white shadow-xl transition-all flex items-center justify-center gap-3 ${
              isSpinning
                ? 'bg-slate-400 cursor-not-allowed shadow-none'
                : activeTab === 'lunch'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-500/30 hover:scale-[1.02] active:scale-95'
                : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-purple-600/30 hover:scale-[1.02] active:scale-95'
            }`}
          >
            <RotateCw className={`w-6 h-6 ${isSpinning ? 'animate-spin' : ''}`} />
            {isSpinning ? '룰렛 돌아가는 중...' : `${activeTab === 'lunch' ? '점심' : '저녁'} 룰렛 돌리기!`}
          </button>

          {/* Current Menu Tags Preview */}
          <div className="flex flex-wrap gap-1.5 justify-center max-w-md">
            {currentMenus.map((menu, idx) => (
              <span
                key={idx}
                className="text-xs px-2.5 py-1 rounded-full bg-white/80 border border-orange-100 text-slate-600 shadow-2xs font-medium"
              >
                {menu}
              </span>
            ))}
          </div>
        </div>

        {/* Winner Result Popup / Banner */}
        {showWinnerModal && winner && (
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border-2 border-orange-300 p-6 sm:p-8 text-center animate-in fade-in zoom-in duration-300 mb-10 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-100 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-amber-100 rounded-full blur-2xl pointer-events-none"></div>

            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 mb-4 shadow-inner">
              <Award className="w-8 h-8" />
            </div>

            <span className="text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
              오늘의 {activeTab === 'lunch' ? '점심' : '저녁'} 추천 메뉴!
            </span>

            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-3 mb-2 tracking-tight">
              🎉 {winner} 🎉
            </h2>
            <p className="text-sm text-slate-500 mb-6">맛있는 식사 되세요!</p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={spinWheel}
                className="flex-1 py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <RotateCw className="w-4 h-4" />
                다시 돌리기
              </button>
              <button
                onClick={() => setShowWinnerModal(false)}
                className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all"
              >
                닫기
              </button>
            </div>
          </div>
        )}

        {/* History Section */}
        {history.length > 0 && (
          <div className="w-full max-w-xl bg-white/70 backdrop-blur-md rounded-2xl border border-orange-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
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
                <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-white border border-slate-100 text-sm">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${item.type === 'lunch' ? 'bg-orange-500' : 'bg-purple-600'}`}></span>
                    <span className="font-semibold text-slate-800">{item.menu}</span>
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
      <footer className="py-6 text-center text-xs text-slate-400 border-t border-orange-100/60">
        <p>© 2026 오늘 뭐 먹지? 메뉴 추천 룰렛. All rights reserved.</p>
      </footer>

      {/* Menu Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-orange-500" />
                <h3 className="font-bold text-lg text-slate-900">
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
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 text-sm"
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
                <div key={idx} className="flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-medium text-slate-800 text-sm">{menu}</span>
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
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={handleResetDefaults}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-orange-600 transition-colors font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                기본값으로 초기화
              </button>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-colors"
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
