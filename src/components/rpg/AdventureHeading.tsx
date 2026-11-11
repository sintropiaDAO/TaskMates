import { motion, useReducedMotion } from 'framer-motion';
import { Leaf } from 'lucide-react';
import garden from '@/assets/adventure/solarpunk-garden.jpg';
import capyvera from '@/assets/adventure/capyvera-trophy.png';
import { useLanguage } from '@/contexts/LanguageContext';

/** Shared achievement landscape using the same world and original mascot as celebrations. */
export function AdventureHeading({ title, subtitle, page = false }: { title: string; subtitle?: string; page?: boolean }) {
  const { language } = useLanguage();
  const reduced = useReducedMotion();
  const Heading = page ? 'h1' : 'h2';
  return <header className="achievement-heading relative isolate overflow-hidden">
    <div className="absolute inset-0 -z-10" aria-hidden="true">
      <img src={garden} alt="" className="h-full w-full object-cover object-center" />
      <div className="achievement-heading-veil absolute inset-0" />
    </div>
    <div className="relative z-10 max-w-[75%] px-5 pb-5 pt-8 sm:px-6 sm:pt-10">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-extrabold text-primary"><Leaf className="h-3.5 w-3.5" />{language === 'pt' ? 'Aventura Regenerativa' : 'Regenerative Adventure'}</p>
      <Heading className="break-words text-2xl font-black leading-tight sm:text-3xl">{title}</Heading>
      {subtitle && <p className="mt-2 text-sm font-semibold text-muted-foreground">{subtitle}</p>}
    </div>
    <motion.img src={capyvera} alt="Capyvera" width={116} height={160}
      className="absolute bottom-3 right-2 h-36 w-24 object-contain sm:right-5 sm:h-44 sm:w-28"
      initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : 0.5 }} />
  </header>;
}