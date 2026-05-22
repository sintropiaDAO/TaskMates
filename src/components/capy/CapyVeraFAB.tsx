import { useState } from 'react';
import { CapyVeraChat } from './CapyVeraChat';
import mascot from '@/assets/capy-vera-mascot.png';

export function CapyVeraFAB() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir conversa com Capy Vera"
        className="fixed left-4 bottom-24 z-40 w-14 h-14 rounded-full bg-background border-2 border-primary shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 overflow-hidden p-1"
      >
        <img
          src={mascot}
          alt=""
          width={56}
          height={56}
          loading="lazy"
          className="w-full h-full object-contain"
        />
      </button>
      <CapyVeraChat open={open} onOpenChange={setOpen} />
    </>
  );
}
