import { type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Leaf, Flower2 } from 'lucide-react';
import { Capyvera, type CapyveraPose } from '@/components/capy/Capyvera';
import garden from '@/assets/adventure/solarpunk-garden.jpg';

interface AdventureSceneProps {
  pose: CapyveraPose;
  children: ReactNode;
}

/** The original mascot poses are reused, never regenerated, throughout access. */
export function AdventureScene({ pose, children }: AdventureSceneProps) {
  const reducedMotion = useReducedMotion();
  return (
    <div className="adventure-world relative isolate min-h-svh overflow-x-clip">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <img src={garden} width={1536} height={1024} alt="" fetchPriority="high" className="adventure-landscape h-full w-full object-cover" />
        <div className="adventure-veil absolute inset-0" />
        <Leaf className="adventure-leaf adventure-leaf-one absolute h-7 w-7 text-primary" />
        <Leaf className="adventure-leaf adventure-leaf-two absolute h-5 w-5 text-primary" />
        <Flower2 className="adventure-flower absolute h-6 w-6 text-adventure-flower" />
      </div>
      {children}
      <motion.div
        key={pose}
        className="adventure-companion pointer-events-none absolute"
        initial={reducedMotion ? false : { opacity: 0, y: 12, rotate: -3 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.35 }}
      >
        <div className="adventure-capy-motion">
          <Capyvera pose={pose} size="xl" loading="eager" alt="Capyvera" />
        </div>
      </motion.div>
    </div>
  );
}