import { useState, useEffect } from 'react';

const SplashOverlay = () => {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 1500);
    const removeTimer = setTimeout(() => setVisible(false), 2100);
    return () => { clearTimeout(timer); clearTimeout(removeTimer); };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        backgroundColor: '#0f172a',
        transition: 'opacity 0.6s ease-out',
        opacity: fadeOut ? 0 : 1,
        pointerEvents: fadeOut ? 'none' : 'auto',
      }}
    >
      <img
        src="/splash-logo.png"
        alt="InhaleStays"
        className="w-28 h-28 mb-6 rounded-2xl shadow-2xl"
      />
      <h1 className="text-3xl font-bold text-white tracking-wide mb-1">
        InhaleStays
      </h1>
      <p className="text-sm text-slate-400 tracking-widest uppercase">
        Reading Room Booking
      </p>
      <div className="mt-10">
        <div className="w-8 h-8 border-3 border-slate-600 border-t-white rounded-full animate-spin" />
      </div>
    </div>
  );
};

export default SplashOverlay;
