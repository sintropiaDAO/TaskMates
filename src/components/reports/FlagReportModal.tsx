import { useState } from 'react';
import { Flag, Send, ThumbsUp, ThumbsDown, ShieldAlert, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useReports, Report } from '@/hooks/useReports';
import { formatDistanceToNow } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { toast } from 'sonner';

interface FlagReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: string;
  entityId: string;
  entityTitle?: string;
}

export function FlagReportModal({ open, onOpenChange, entityType, entityId, entityTitle }: FlagReportModalProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { reports, loading, submitReport, fetchReports, toggleLike, deleteReport } = useReports(entityType, entityId);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [sending, setSending] = useState(false);
  const dateLocale = language === 'pt' ? pt : enUS;

  const entityLabels: Record<string, { pt: string; en: string }> = {
    user: { pt: 'Usuário', en: 'User' },
    task: { pt: 'Tarefa', en: 'Task' },
    product: { pt: 'Produto', en: 'Product' },
    poll: { pt: 'Enquete', en: 'Poll' },
    tag: { pt: 'Tag', en: 'Tag' },
  };

  const handleOpen = () => {
    if (open) {
      fetchReports();
    }
  };

  useState(() => {
    if (open) fetchReports();
  });

  const handleSubmit = async () => {
    if (!comment.trim()) {
      toast.error(language === 'pt' ? 'Insira um comentário justificando a denúncia' : 'Please add a comment justifying the report');
      return;
    }
    setSending(true);
    const success = await submitReport(comment.trim(), isAnonymous);
    setSending(false);
    if (success) {
      setComment('');
      setIsAnonymous(false);
      toast.success(language === 'pt' ? 'Denúncia enviada com sucesso' : 'Report submitted successfully');
    } else {
      toast.error(language === 'pt' ? 'Erro ao enviar denúncia' : 'Error submitting report');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="w-5 h-5" />
            {language === 'pt' ? 'Denúncias' : 'Reports'} — {entityLabels[entityType]?.[language] || entityType}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {language === 'pt'
              ? 'Denuncie comportamentos que não estejam alinhados ao nosso objetivo comum de nutrir a vida e fortalecer ações de autocuidado, ajuda mútua e cuidado socioambiental.'
              : 'Report behaviors that are not aligned with our common goal of nurturing life and strengthening actions of self-care, mutual aid, and socio-environmental care.'}
          </p>
          {entityTitle && (
            <p className="text-sm text-muted-foreground truncate mt-1">"{entityTitle}"</p>
          )}
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Existing reports */}
          <ScrollArea className="flex-1 max-h-[300px]">
            {loading ? (
              <p className="text-center py-6 text-muted-foreground text-sm">
                {language === 'pt' ? 'Carregando...' : 'Loading...'}
              </p>
            ) : reports.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground text-sm">
                {language === 'pt' ? 'Nenhuma denúncia registrada.' : 'No reports registered.'}
              </p>
            ) : (
              <div className="space-y-3 pr-3">
                {reports.map((report) => (
                  <ReportItem
                    key={report.id}
                    report={report}
                    onToggleLike={toggleLike}
                    onDelete={deleteReport}
                    language={language}
                    dateLocale={dateLocale}
                    currentUserId={user?.id}
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Submit new report */}
          <div className="border-t border-border pt-4 space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Flag className="w-4 h-4 text-destructive" />
              {language === 'pt' ? 'Enviar Denúncia' : 'Submit Report'}
            </h4>
            <Textarea
              placeholder={language === 'pt' ? 'Descreva o motivo da denúncia...' : 'Describe the reason for the report...'}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[80px] resize-none"
              maxLength={500}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="anonymous"
                  checked={isAnonymous}
                  onCheckedChange={(c) => setIsAnonymous(c === true)}
                />
                <Label htmlFor="anonymous" className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer">
                  {isAnonymous ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {language === 'pt' ? 'Enviar anonimamente' : 'Submit anonymously'}
                </Label>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleSubmit}
                disabled={sending || !comment.trim()}
                className="gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                {language === 'pt' ? 'Denunciar' : 'Report'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReportItem({
  report,
  onToggleLike,
  language,
  dateLocale,
  currentUserId,
}: {
  report: Report;
  onToggleLike: (reportId: string, likeType: 'like' | 'dislike') => void;
  language: string;
  dateLocale: typeof pt;
  currentUserId?: string;
}) {
  return (
    <div className="glass rounded-lg p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Avatar className="w-7 h-7 flex-shrink-0">
          {report.is_anonymous ? (
            <AvatarFallback className="text-xs bg-muted">?</AvatarFallback>
          ) : (
            <>
              <AvatarImage src={report.reporter_avatar || ''} />
              <AvatarFallback className="text-xs">
                {report.reporter_name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </>
          )}
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium truncate">
              {report.is_anonymous
                ? (language === 'pt' ? 'Anônimo' : 'Anonymous')
                : (report.reporter_name || (language === 'pt' ? 'Usuário' : 'User'))}
            </span>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: dateLocale })}
            </span>
          </div>
          <p className="text-sm text-foreground mt-1">{report.comment}</p>
        </div>
      </div>

      {/* Like/Dislike buttons */}
      <div className="flex items-center gap-2 pl-9">
        <button
          onClick={() => onToggleLike(report.id, 'like')}
          className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-colors ${
            report.userLike === 'like'
              ? 'text-primary bg-primary/15'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <ThumbsUp className="w-3 h-3" />
          <span>{report.likes}</span>
        </button>
        <button
          onClick={() => onToggleLike(report.id, 'dislike')}
          className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-colors ${
            report.userLike === 'dislike'
              ? 'text-destructive bg-destructive/15'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <ThumbsDown className="w-3 h-3" />
          <span>{report.dislikes}</span>
        </button>
      </div>
    </div>
  );
}
