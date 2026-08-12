import { useEffect, useRef, useState } from 'react';

/**
 * Keeps a collapsible section closed by default when it has no items, and
 * open when it does — while still respecting a manual toggle by the user.
 *
 * The count usually arrives asynchronously, so `defaultOpen` on Collapsible
 * (evaluated only at mount) is not enough.
 */
export function useSectionOpen(count: number): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(count > 0);
  const touched = useRef(false);

  useEffect(() => {
    if (!touched.current) setOpen(count > 0);
  }, [count]);

  const setOpenManual = (value: boolean) => {
    touched.current = true;
    setOpen(value);
  };

  return [open, setOpenManual];
}
