import { useEffect, useRef, useState } from 'react';
import { Send, Trash2, Sparkles } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { respond, greet, ElizaIntent } from '@/lib/capyVera/eliza';
import mascot from '@/assets/capy-vera-mascot.png';

interface Message {
  id: string;
  from: 'capy' | 'user';
  text: string;
  intent?: ElizaIntent;
  payload?: string;
  ts: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const INTENT_CTA: Record<ElizaIntent, { label: string; type?: 'offer' | 'request' | 'personal' } | null> = {
  none: null,
  suggest_personal_task: { label: 'Copiar como tarefa pessoal', type: 'personal' },
  suggest_offer_task: { label: 'Copiar como oferta', type: 'offer' },
  suggest_request_task: { label: 'Copiar como pedido', type: 'request' },
  suggest_goal: { label: 'Copiar como meta pessoal', type: 'personal' },
  open_journal: { label: 'Registrar no diário', type: 'personal' },
  praise: null,
  out_of_scope: null,
};

export function CapyVeraChat({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const storageKey = user ? `capyvera:history:${user.id}` : 'capyvera:history:guest';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Load history
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed: Message[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setMessages([{ id: crypto.randomUUID(), from: 'capy', text: greet(), ts: Date.now() }]);
  }, [storageKey]);

  // Persist
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages.slice(-50)));
      } catch {
        /* ignore */
      }
    }
  }, [messages, storageKey]);

  // Autoscroll + focus
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    const userMsg: Message = { id: crypto.randomUUID(), from: 'user', text, ts: Date.now() };
    const reply = respond(text);
    const capyMsg: Message = {
      id: crypto.randomUUID(),
      from: 'capy',
      text: reply.text,
      intent: reply.intent,
      payload: reply.payload,
      ts: Date.now() + 1,
    };
    setMessages((prev) => [...prev, userMsg, capyMsg]);
    setInput('');
  };

  const handleCta = (msg: Message) => {
    if (!msg.payload) return;
    const cta = msg.intent ? INTENT_CTA[msg.intent] : null;
    if (!cta) return;

    if (msg.intent === 'open_journal') {
      const journalKey = user ? `capyvera:journal:${user.id}` : 'capyvera:journal:guest';
      try {
        const raw = localStorage.getItem(journalKey);
        const entries: Array<{ id: string; text: string; ts: number }> = raw ? JSON.parse(raw) : [];
        entries.push({ id: crypto.randomUUID(), text: msg.payload, ts: Date.now() });
        localStorage.setItem(journalKey, JSON.stringify(entries.slice(-200)));
      } catch {
        /* ignore */
      }
      toast({
        title: 'Entrada registrada no diário',
        description: `"${msg.payload}" — guardado no seu diário local da Capy Vera.`,
      });
      return;
    }

    const label =
      cta.type === 'offer' ? 'Oferta' : cta.type === 'request' ? 'Pedido' : 'Tarefa pessoal';
    navigator.clipboard?.writeText(msg.payload).catch(() => {});
    toast({
      title: `${label} copiada para a área de transferência`,
      description: `"${msg.payload}" — cole no campo Título ao criar a tarefa.`,
    });
  };

  const handleClear = () => {
    const fresh: Message = { id: crypto.randomUUID(), from: 'capy', text: greet(), ts: Date.now() };
    setMessages([fresh]);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        <SheetHeader className="px-4 py-3 border-b flex-row items-center gap-3 space-y-0">
          <img
            src={mascot}
            alt="Capy Vera"
            width={40}
            height={40}
            loading="lazy"
            className="w-10 h-10 rounded-full bg-primary/10"
          />
          <div className="flex-1 text-left">
            <SheetTitle className="text-base">Capy Vera</SheetTitle>
            <SheetDescription className="text-xs flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Conversa por padrões — sem IA generativa
            </SheetDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClear} aria-label="Limpar conversa">
            <Trash2 className="w-4 h-4" />
          </Button>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0 px-4 py-3" role="log" aria-live="polite">
          <div className="flex flex-col gap-3">
            {messages.map((m) => {
              const cta = m.from === 'capy' && m.intent ? INTENT_CTA[m.intent] : null;
              return (
                <div
                  key={m.id}
                  className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="max-w-[85%] flex flex-col gap-2">
                    <div
                      className={`px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                        m.from === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-muted text-foreground rounded-bl-sm'
                      }`}
                    >
                      {m.text}
                    </div>
                    {cta && m.payload && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="self-start text-xs"
                        onClick={() => handleCta(m)}
                      >
                        {cta.label}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        </ScrollArea>

        <div className="border-t p-3 flex gap-2 bg-background">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Escreva pra Capy Vera..."
            aria-label="Mensagem"
          />
          <Button onClick={handleSend} size="icon" aria-label="Enviar">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
