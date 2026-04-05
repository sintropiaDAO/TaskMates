import { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarIcon, ClipboardList, Package, BarChart3, CheckCircle, Clock } from 'lucide-react';
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { Task, Product, Poll } from '@/types';

interface CalendarItem {
  id: string;
  type: 'task' | 'product' | 'poll';
  title: string;
  date: Date;
  dateType: 'deadline' | 'completed' | 'delivered';
  status: string;
  original: Task | Product | Poll;
}

interface MyCalendarViewProps {
  tasks: Task[];
  products: Product[];
  polls: Poll[];
  onTaskClick: (task: Task) => void;
  onProductClick: (product: Product) => void;
  onPollClick: (poll: Poll) => void;
}

export function MyCalendarView({ tasks, products, polls, onTaskClick, onProductClick, onPollClick }: MyCalendarViewProps) {
  const { language } = useLanguage();
  const dateLocale = language === 'pt' ? ptBR : enUS;
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMonth, setViewMonth] = useState<Date>(new Date());

  // Build calendar items from all entities with dates
  const calendarItems = useMemo(() => {
    const items: CalendarItem[] = [];

    tasks.forEach(task => {
      if (task.deadline) {
        items.push({
          id: task.id,
          type: 'task',
          title: task.title,
          date: new Date(task.deadline),
          dateType: task.status === 'completed' ? 'completed' : 'deadline',
          status: task.status || 'open',
          original: task,
        });
      } else if (task.status === 'completed' && task.updated_at) {
        items.push({
          id: task.id,
          type: 'task',
          title: task.title,
          date: new Date(task.updated_at),
          dateType: 'completed',
          status: 'completed',
          original: task,
        });
      }
    });

    products.forEach(product => {
      if (product.status === 'delivered' && product.updated_at) {
        items.push({
          id: product.id,
          type: 'product',
          title: product.title,
          date: new Date(product.updated_at),
          dateType: 'delivered',
          status: 'delivered',
          original: product,
        });
      }
      // Products don't have a deadline field, use created_at as reference
      if (product.status !== 'delivered') {
        items.push({
          id: product.id,
          type: 'product',
          title: product.title,
          date: new Date(product.created_at),
          dateType: 'deadline',
          status: product.status,
          original: product,
        });
      }
    });

    polls.forEach(poll => {
      if (poll.deadline) {
        items.push({
          id: poll.id,
          type: 'poll',
          title: poll.title,
          date: new Date(poll.deadline),
          dateType: poll.status === 'closed' ? 'completed' : 'deadline',
          status: poll.status,
          original: poll,
        });
      }
    });

    return items;
  }, [tasks, products, polls]);

  // Get items for a specific day
  const getItemsForDay = (day: Date) => {
    return calendarItems.filter(item => isSameDay(item.date, day));
  };

  // Get items for selected date
  const selectedDayItems = useMemo(() => getItemsForDay(selectedDate), [selectedDate, calendarItems]);

  // Get all days that have items (for calendar dot indicators)
  const daysWithItems = useMemo(() => {
    const days = new Set<string>();
    calendarItems.forEach(item => {
      days.add(format(item.date, 'yyyy-MM-dd'));
    });
    return days;
  }, [calendarItems]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'task': return <ClipboardList className="w-3.5 h-3.5" />;
      case 'product': return <Package className="w-3.5 h-3.5" />;
      case 'poll': return <BarChart3 className="w-3.5 h-3.5" />;
    }
  };

  const getTypeColor = (type: string, status: string) => {
    const isCompleted = status === 'completed' || status === 'closed' || status === 'delivered';
    if (isCompleted) return 'text-primary bg-primary/10';
    switch (type) {
      case 'task': return 'text-success bg-success/10';
      case 'product': return 'text-amber-500 bg-amber-500/10';
      case 'poll': return 'text-violet-500 bg-violet-500/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getStatusLabel = (item: CalendarItem) => {
    const isCompleted = item.status === 'completed' || item.status === 'closed' || item.status === 'delivered';
    if (isCompleted) {
      return language === 'pt' ? 'Concluído' : 'Completed';
    }
    return language === 'pt' ? 'Aberto' : 'Open';
  };

  const handleItemClick = (item: CalendarItem) => {
    if (item.type === 'task') onTaskClick(item.original as Task);
    else if (item.type === 'product') onProductClick(item.original as Product);
    else if (item.type === 'poll') onPollClick(item.original as Poll);
  };

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarIcon className="w-5 h-5 text-primary" />
          {language === 'pt' ? 'Calendário' : 'Calendar'}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {language === 'pt' ? 'Visualize seus prazos, entregas e conclusões.' : 'View your deadlines, deliveries and completions.'}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Calendar */}
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            month={viewMonth}
            onMonthChange={setViewMonth}
            locale={dateLocale}
            className={cn("p-3 pointer-events-auto")}
            modifiers={{
              hasItems: (day) => daysWithItems.has(format(day, 'yyyy-MM-dd')),
            }}
            modifiersClassNames={{
              hasItems: 'font-bold underline decoration-primary decoration-2 underline-offset-4',
            }}
          />
        </div>

        {/* Items for selected date */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            {format(selectedDate, "dd 'de' MMMM", { locale: dateLocale })}
            {selectedDayItems.length > 0 && (
              <span className="ml-1 text-xs">({selectedDayItems.length})</span>
            )}
          </h4>

          {selectedDayItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {language === 'pt' ? 'Nenhum item nesta data.' : 'No items on this date.'}
            </p>
          ) : (
            <div className="space-y-2">
              {selectedDayItems.map(item => {
                const isCompleted = item.status === 'completed' || item.status === 'closed' || item.status === 'delivered';
                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleItemClick(item)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-card/80 transition-all text-left",
                      isCompleted && "opacity-75"
                    )}
                  >
                    {/* Type icon */}
                    <div className={cn("flex items-center justify-center w-8 h-8 rounded-full shrink-0", getTypeColor(item.type, item.status))}>
                      {getTypeIcon(item.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{item.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                          item.type === 'task' ? 'bg-success/10 text-success' :
                          item.type === 'product' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-violet-500/10 text-violet-500'
                        )}>
                          {item.type === 'task' ? (language === 'pt' ? 'Tarefa' : 'Task') :
                           item.type === 'product' ? (language === 'pt' ? 'Produto' : 'Product') :
                           (language === 'pt' ? 'Enquete' : 'Poll')}
                        </span>
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          {isCompleted ? <CheckCircle className="w-3 h-3 text-primary" /> : <Clock className="w-3 h-3" />}
                          {getStatusLabel(item)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
