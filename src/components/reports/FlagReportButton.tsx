import { useState, useEffect } from 'react';
import { Flag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { FlagReportModal } from './FlagReportModal';

interface FlagReportButtonProps {
  entityType: string;
  entityId: string;
  entityTitle?: string;
  className?: string;
}

export function FlagReportButton({ entityType, entityId, entityTitle, className = '' }: FlagReportButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!entityId) return;
    const fetchCount = async () => {
      const { count: c } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);
      setCount(c || 0);
    };
    fetchCount();
  }, [entityType, entityId]);

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
        className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full transition-colors text-muted-foreground hover:text-destructive hover:bg-destructive/10 ${className}`}
        title="Denunciar"
      >
        <Flag className="w-3.5 h-3.5 flex-shrink-0" />
        {count > 0 && <span className="font-medium">{count}</span>}
      </button>

      <FlagReportModal
        open={showModal}
        onOpenChange={setShowModal}
        entityType={entityType}
        entityId={entityId}
        entityTitle={entityTitle}
      />
    </>
  );
}
