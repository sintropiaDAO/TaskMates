import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Underline as UnderlineIcon, Heading2, List, ListOrdered, Smile } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

const EMOJI_LIST = [
  '😀','😂','😍','🥳','👍','👏','🔥','💡','✅','❌',
  '⭐','💪','🎯','🚀','💬','📌','📎','🏷️','🤝','❤️',
  '😎','🤔','😢','😡','🙏','👀','💰','🎉','📢','⚡',
];

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  minHeight?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = '',
  maxLength,
  className,
  minHeight = '100px',
}: RichTextEditorProps) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const isInternalUpdate = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      isInternalUpdate.current = true;
      const html = editor.getHTML();
      // If editor is empty, return empty string
      if (html === '<p></p>') {
        onChange('');
      } else {
        if (maxLength) {
          const text = editor.getText();
          if (text.length > maxLength) return;
        }
        onChange(html);
      }
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none px-3 py-2',
          'min-h-[var(--editor-min-h)]',
        ),
        style: `--editor-min-h: ${minHeight}`,
      },
    },
  });

  // Sync external value changes (e.g. form reset)
  useEffect(() => {
    if (!editor) return;
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    const currentHtml = editor.getHTML();
    const normalizedValue = value || '';
    if (currentHtml !== normalizedValue && !(currentHtml === '<p></p>' && normalizedValue === '')) {
      editor.commands.setContent(normalizedValue);
    }
  }, [value, editor]);

  const insertEmoji = (emoji: string) => {
    editor?.chain().focus().insertContent(emoji).run();
    setEmojiOpen(false);
  };

  if (!editor) return null;

  return (
    <div className={cn('rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 relative z-[60]', className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-1 py-1">
        <Toggle
          size="sm"
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          aria-label="Bold"
          className="h-7 w-7 p-0"
        >
          <Bold className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Italic"
          className="h-7 w-7 p-0"
        >
          <Italic className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('underline')}
          onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
          aria-label="Underline"
          className="h-7 w-7 p-0"
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </Toggle>
        <div className="w-px h-5 bg-border mx-0.5" />
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 2 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          aria-label="Heading"
          className="h-7 w-7 p-0"
        >
          <Heading2 className="h-3.5 w-3.5" />
        </Toggle>
        <div className="w-px h-5 bg-border mx-0.5" />
        <Toggle
          size="sm"
          pressed={editor.isActive('bulletList')}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Bullet List"
          className="h-7 w-7 p-0"
        >
          <List className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('orderedList')}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label="Ordered List"
          className="h-7 w-7 p-0"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </Toggle>
        <div className="w-px h-5 bg-border mx-0.5" />
        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="h-7 w-7 inline-flex items-center justify-center rounded-md text-sm hover:bg-muted">
              <Smile className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="bottom" align="start">
            <div className="grid grid-cols-10 gap-1">
              {EMOJI_LIST.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  className="h-7 w-7 flex items-center justify-center hover:bg-muted rounded text-base"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Character count */}
      {maxLength && (
        <div className="text-xs text-muted-foreground text-right px-3 py-1 border-t border-border">
          {editor.getText().length}/{maxLength}
        </div>
      )}
    </div>
  );
}

/** Renders HTML content from the rich text editor safely */
export function RichTextContent({ content, className }: { content: string; className?: string }) {
  if (!content) return null;

  // If content doesn't contain HTML tags, wrap in <p>
  const isPlainText = !/<[a-z][\s\S]*>/i.test(content);
  const html = isPlainText ? `<p>${content}</p>` : content;

  return (
    <div
      className={cn('prose prose-sm dark:prose-invert max-w-none break-words', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
