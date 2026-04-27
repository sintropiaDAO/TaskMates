import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import DOMPurify from 'dompurify';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import ImageExtension from '@tiptap/extension-image';
import { Node as TiptapNode, mergeAttributes } from '@tiptap/core';
import { Bold, Italic, Underline as UnderlineIcon, Heading2, List, ListOrdered, Smile, Paperclip, Loader2 } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

function emojiToTwemojiUrl(emoji: string): string {
  const codePoints = [...emoji]
    .map((char) => char.codePointAt(0)!.toString(16))
    .filter((cp) => cp !== 'fe0f')
    .join('-');

  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codePoints}.png`;
}

function normalizeEmojiForInsertion(value: string): string {
  const trimmedValue = value.trim();

  if (/^[A-Za-z]{2}$/.test(trimmedValue)) {
    const countryCode = trimmedValue.toUpperCase();
    return String.fromCodePoint(
      ...[...countryCode].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65)
    );
  }

  return trimmedValue;
}

function getEmojiImageAttrs(emoji: string) {
  return {
    emoji,
    src: emojiToTwemojiUrl(emoji),
    alt: emoji,
  };
}

function createEmojiImageElement(doc: Document, emoji: string) {
  const img = doc.createElement('img');
  const attrs = getEmojiImageAttrs(emoji);

  img.setAttribute('src', attrs.src);
  img.setAttribute('alt', attrs.alt);
  img.setAttribute('data-emoji', attrs.emoji);
  img.setAttribute('draggable', 'false');
  img.setAttribute('loading', 'lazy');
  img.setAttribute('contenteditable', 'false');
  img.setAttribute('class', 'emoji-inline-image');

  return img;
}

function normalizeRichTextContent(content: string): string {
  if (!content) return '';

  const html = /<[a-z][\s\S]*>/i.test(content) ? content : `<p>${content}</p>`;

  if (typeof window === 'undefined') return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const textNodes: Text[] = [];
  const walker = doc.createTreeWalker(doc.body, window.NodeFilter.SHOW_TEXT);
  let currentNode = walker.nextNode();

  while (currentNode) {
    textNodes.push(currentNode as Text);
    currentNode = walker.nextNode();
  }

  textNodes.forEach((textNode) => {
    const parentTag = textNode.parentElement?.tagName;
    if (!textNode.textContent || parentTag === 'SCRIPT' || parentTag === 'STYLE') return;

    const matches = [...textNode.textContent.matchAll(/[\u{1F1E6}-\u{1F1FF}]{2}/gu)];
    if (matches.length === 0) return;

    const fragment = doc.createDocumentFragment();
    let lastIndex = 0;

    matches.forEach((match) => {
      const emoji = match[0];
      const index = match.index ?? 0;

      if (index > lastIndex) {
        fragment.appendChild(doc.createTextNode(textNode.textContent!.slice(lastIndex, index)));
      }

      fragment.appendChild(createEmojiImageElement(doc, emoji));
      lastIndex = index + emoji.length;
    });

    if (lastIndex < textNode.textContent.length) {
      fragment.appendChild(doc.createTextNode(textNode.textContent.slice(lastIndex)));
    }

    textNode.parentNode?.replaceChild(fragment, textNode);
  });

  return doc.body.innerHTML;
}

function TwemojiImg({ emoji, size = 20 }: { emoji: string; size?: number }) {
  const [useFallback, setUseFallback] = useState(false);
  const url = emojiToTwemojiUrl(emoji);

  if (useFallback) {
    return <span className="emoji-native-font">{emoji}</span>;
  }

  return (
    <img
      src={url}
      alt={emoji}
      width={size}
      height={size}
      className="inline-block"
      style={{ verticalAlign: 'middle' }}
      onError={() => setUseFallback(true)}
      loading="lazy"
      draggable={false}
    />
  );
}

const EmojiImage = TiptapNode.create({
  name: 'emojiImage',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      emoji: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'img[data-emoji]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'img',
      mergeAttributes(HTMLAttributes, {
        class: 'emoji-inline-image',
        draggable: 'false',
        loading: 'lazy',
        contenteditable: 'false',
      }),
    ];
  },

  renderText({ node }) {
    return node.attrs.emoji || node.attrs.alt || '';
  },
});

const EMOJI_CATEGORIES: Record<string, { label: string; labelPt: string; emojis: string[] }> = {
  smileys: {
    label: 'Smileys',
    labelPt: 'Rostos',
    emojis: [
      '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩',
      '😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🫡',
      '🤐','🤨','😐','😑','😶','🫥','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴',
      '😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐',
      '😕','🫤','😟','🙁','😮','😯','😲','😳','🥺','🥹','😦','😧','😨','😰','😥','😢',
      '😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀',
      '☠️','💩','🤡','👹','👺','👻','👽','👾','🤖',
    ],
  },
  gestures: {
    label: 'Hands',
    labelPt: 'Gestos',
    emojis: [
      '👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','👌','🤌','🤏','✌️','🤞','🫰',
      '🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜',
      '👏','🙌','🫶','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿',
    ],
  },
  hearts: {
    label: 'Hearts',
    labelPt: 'Corações',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗',
      '💖','💘','💝','💟','♥️','❤️‍🔥','❤️‍🩹',
    ],
  },
  people: {
    label: 'People',
    labelPt: 'Pessoas',
    emojis: [
      '👶','👧','🧒','👦','👩','🧑','👨','👩‍🦱','🧑‍🦱','👨‍🦱','👩‍🦰','🧑‍🦰','👨‍🦰',
      '👱‍♀️','👱','👱‍♂️','👩‍🦳','🧑‍🦳','👨‍🦳','👩‍🦲','🧑‍🦲','👨‍🦲','🧔‍♀️','🧔','🧔‍♂️',
      '👵','🧓','👴','👲','👳‍♀️','👳','👳‍♂️','🧕','👮‍♀️','👮','👮‍♂️','👷‍♀️','👷','👷‍♂️',
      '💂‍♀️','💂','💂‍♂️','🕵️‍♀️','🕵️','🕵️‍♂️','👩‍⚕️','🧑‍⚕️','👨‍⚕️','👩‍🌾','🧑‍🌾','👨‍🌾',
      '👩‍🍳','🧑‍🍳','👨‍🍳','👩‍🎓','🧑‍🎓','👨‍🎓','👩‍🎤','🧑‍🎤','👨‍🎤','👩‍🏫','🧑‍🏫','👨‍🏫',
      '👩‍💻','🧑‍💻','👨‍💻','👩‍🚀','🧑‍🚀','👨‍🚀',
    ],
  },
  nature: {
    label: 'Nature',
    labelPt: 'Natureza',
    emojis: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐸',
      '🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇',
      '🐺','🐗','🐴','🦄','🫎','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🪰','🪲','🪳',
      '🦟','🦗','🕷️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡',
      '🐠','🐟','🐬','🐳','🐋','🦈','🪸','🐊','🐅','🐆','🦓','🦍','🦧','🐘','🦛',
      '🌸','🌺','🌻','🌹','🌷','🌼','💐','🌾','🍀','☘️','🍃','🍂','🍁','🌿','🪴',
      '🌱','🌲','🌳','🌴','🪹','🪺','🍄','🌵','🎋','🎍','🪻','🪷',
    ],
  },
  food: {
    label: 'Food',
    labelPt: 'Comidas',
    emojis: [
      '🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥',
      '🥝','🍅','🍆','🥑','🫛','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅',
      '🥔','🍠','🫘','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓',
      '🥩','🍗','🍖','🌭','🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗',
      '🥣','🥘','🫕','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘',
      '🍥','🥠','🥮','🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬',
      '🍫','🍿','🍩','🍪','🌰','🥜','🫗','🍯','🥛','🍼','🫖','☕','🍵','🧃','🥤',
      '🧋','🍶','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾','🧊',
    ],
  },
  activities: {
    label: 'Activities',
    labelPt: 'Atividades',
    emojis: [
      '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑',
      '🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷',
      '⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤸','⛹️','🤺','🏇','🧘','🏄','🏊','🤽',
      '🚣','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🏵️','🎗️','🎫','🎟️','🎪',
      '🤹','🎭','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🪘','🎷','🎺','🪗','🎸','🪕',
      '🎻','🎲','♟️','🎯','🎳','🎮','🕹️','🧩',
    ],
  },
  travel: {
    label: 'Travel',
    labelPt: 'Viagem',
    emojis: [
      '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍️',
      '🛵','🛺','🚲','🛴','🚏','🛣️','🛤️','⛽','🛞','🚨','🚥','🚦','🛑','🚧','⚓',
      '🛟','⛵','🛶','🚤','🛳️','⛴️','🛥️','🚢','✈️','🛩️','🛫','🛬','🪂','💺','🚁',
      '🚟','🚠','🚡','🛰️','🚀','🛸','🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩',
      '🏪','🏫','🏬','🏭','🏯','🏰','💒','🗼','🗽','⛪','🕌','🛕','🕍','⛩️','🕋',
      '⛲','⛺','🌁','🌃','🏙️','🌄','🌅','🌆','🌇','🌉','🎠','🛝','🎡','🎢','💈',
      '🎪','🗺️','🧭','🏔️','⛰️','🌋','🗻','🏕️','🏖️','🏜️','🏝️','🏞️',
    ],
  },
  objects: {
    label: 'Objects',
    labelPt: 'Objetos',
    emojis: [
      '⌚','📱','📲','💻','⌨️','🖥️','🖨️','🖱️','🖲️','💾','💿','📀','📼','📷','📸',
      '📹','🎥','📽️','🎞️','📞','☎️','📟','📠','📺','📻','🎙️','🎚️','🎛️','🧭','⏱️',
      '⏲️','⏰','🕰️','⌛','⏳','📡','🔋','🪫','🔌','💡','🔦','🕯️','🪔','🧯','🗑️',
      '🛢️','💸','💵','💴','💶','💷','🪙','💰','💳','💎','⚖️','🪜','🧰','🪛','🔧',
      '🔨','⚒️','🛠️','⛏️','🪚','🔩','⚙️','🪤','🧱','⛓️','🧲','🔫','💣','🧨','🪓',
      '🔪','🗡️','⚔️','🛡️','🚬','⚰️','🪦','⚱️','🏺','🔮','📿','🧿','🪬','💈',
      '⚗️','🔭','🔬','🕳️','🩹','🩺','🩻','🩼','💊','💉','🩸','🧬','🦠','🧫','🧪',
      '🌡️','🧹','🪠','🧺','🧻','🚽','🚰','🚿','🛁','🛀','🧼','🪥','🪒','🧽','🪣',
      '🔑','🗝️','🚪','🪑','🛋️','🛏️','🛌','🧸','🪆','🖼️','🪞','🪟','🛒',
    ],
  },
  symbols: {
    label: 'Symbols',
    labelPt: 'Símbolos',
    emojis: [
      '✅','❌','❓','❗','‼️','⁉️','💯','🔥','✨','⭐','🌟','💫','⚡','💥','🔆',
      '🔅','🔴','🟠','🟡','🟢','🔵','🟣','🟤','⚫','⚪','🟥','🟧','🟨','🟩','🟦',
      '🟪','🟫','⬛','⬜','◼️','◻️','▪️','▫️','🔶','🔷','🔸','🔹','🔺','🔻','💠',
      '🔘','🔳','🔲','🏁','🚩','🎌','🏴','🏳️','🏳️‍🌈','🏳️‍⚧️','🏴‍☠️',
      '♻️','⚠️','🚸','⛔','🚫','🚳','🚭','🚯','🚱','🔞','📵','🔇','🔕',
      '🆘','⛑️','🛟','📌','📍','🏷️','🔖','🔗','📎','🖇️','✂️','📐','📏',
      '🔒','🔓','🔏','🔐','🗝️','🔑','🗄️','📁','📂','🗂️','📋','📄','📃',
      '📑','📊','📈','📉','🗒️','🗓️','📅','📆','📇','🗃️','✏️','✒️','🖊️',
      '🖋️','🖌️','🖍️','📝','🔍','🔎',
    ],
  },
  flags: {
    label: 'Flags',
    labelPt: 'Bandeiras',
    emojis: [
      '🇧🇷','🇺🇸','🇬🇧','🇫🇷','🇩🇪','🇮🇹','🇪🇸','🇵🇹','🇯🇵','🇰🇷','🇨🇳','🇮🇳',
      '🇷🇺','🇨🇦','🇲🇽','🇦🇷','🇨🇴','🇨🇱','🇵🇪','🇻🇪','🇺🇾','🇵🇾','🇧🇴','🇪🇨',
      '🇦🇺','🇳🇿','🇿🇦','🇪🇬','🇳🇬','🇰🇪','🇸🇦','🇦🇪','🇮🇱','🇹🇷','🇬🇷','🇳🇱',
      '🇧🇪','🇨🇭','🇦🇹','🇸🇪','🇳🇴','🇩🇰','🇫🇮','🇵🇱','🇨🇿','🇭🇺','🇷🇴','🇺🇦',
      '🇮🇪','🇮🇸','🇹🇭','🇻🇳','🇵🇭','🇮🇩','🇲🇾','🇸🇬','🇹🇼','🇭🇰','🇲🇴',
    ],
  },
};

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  minHeight?: string;
  /** Optional callback to upload a file and return its public URL */
  onUploadMedia?: (file: File) => Promise<string | undefined>;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = '',
  maxLength,
  className,
  minHeight = '100px',
  onUploadMedia,
}: RichTextEditorProps) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState('smileys');
  const [emojiSearch, setEmojiSearch] = useState('');
  const isInternalUpdate = useRef(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Placeholder.configure({ placeholder }),
      EmojiImage,
      ImageExtension.configure({ inline: false, allowBase64: false }),
    ] as any,
    content: normalizeRichTextContent(value || ''),
    onUpdate: ({ editor }) => {
      isInternalUpdate.current = true;
      const html = editor.getHTML();
      const normalizedHtml = normalizeRichTextContent(html);

      if (html !== normalizedHtml) {
        editor.commands.setContent(normalizedHtml, { emitUpdate: false });
      }

      if (normalizedHtml === '<p></p>') {
        onChange('');
      } else {
        if (maxLength) {
          const text = editor.getText();
          if (text.length > maxLength) return;
        }
        onChange(normalizedHtml);
      }
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none px-3 py-2 emoji-rich-editor',
          'min-h-[var(--editor-min-h)]',
        ),
        style: `--editor-min-h: ${minHeight}`,
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }

    const currentHtml = editor.getHTML();
    const normalizedValue = normalizeRichTextContent(value || '');

    if (currentHtml !== normalizedValue && !(currentHtml === '<p></p>' && normalizedValue === '')) {
      editor.commands.setContent(normalizedValue, { emitUpdate: false });
    }
  }, [value, editor]);

  const filteredEmojis = useMemo(() => {
    if (!emojiSearch.trim()) return null;
    const all: string[] = [];
    Object.values(EMOJI_CATEGORIES).forEach((cat) => all.push(...cat.emojis));
    return all;
  }, [emojiSearch]);

  const insertEmoji = (value: string) => {
    const emoji = normalizeEmojiForInsertion(value);
    editor?.chain().focus().insertContent({ type: 'emojiImage', attrs: getEmojiImageAttrs(emoji) }).run();
    setEmojiOpen(false);
    setEmojiSearch('');
  };

  const handleMediaUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadMedia || !editor) return;
    setUploadingMedia(true);
    try {
      const url = await onUploadMedia(file);
      if (!url) return;
      if (file.type.startsWith('image/')) {
        editor.chain().focus().setImage({ src: url, alt: file.name }).run();
      } else if (file.type.startsWith('video/')) {
        editor.chain().focus().insertContent(
          `<p><a href="${url}" target="_blank">🎬 ${file.name}</a></p>`
        ).run();
      } else {
        editor.chain().focus().insertContent(
          `<p><a href="${url}" target="_blank">📎 ${file.name}</a></p>`
        ).run();
      }
    } finally {
      setUploadingMedia(false);
      if (mediaInputRef.current) mediaInputRef.current.value = '';
    }
  }, [onUploadMedia, editor]);

  if (!editor) return null;

  const currentEmojis = filteredEmojis || EMOJI_CATEGORIES[emojiCategory]?.emojis || [];
  const categoryKeys = Object.keys(EMOJI_CATEGORIES);
  const categoryIcons: Record<string, string> = {
    smileys: '😀', gestures: '👋', hearts: '❤️', people: '👤', nature: '🌿',
    food: '🍔', activities: '⚽', travel: '🚗', objects: '💡', symbols: '✅', flags: '🏳️',
  };

  return (
    <div className={cn('rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 relative z-[60]', className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-1 py-1">
        <Toggle size="sm" pressed={editor.isActive('bold')} onPressedChange={() => editor.chain().focus().toggleBold().run()} aria-label="Bold" className="h-7 w-7 p-0">
          <Bold className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle size="sm" pressed={editor.isActive('italic')} onPressedChange={() => editor.chain().focus().toggleItalic().run()} aria-label="Italic" className="h-7 w-7 p-0">
          <Italic className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle size="sm" pressed={editor.isActive('underline')} onPressedChange={() => editor.chain().focus().toggleUnderline().run()} aria-label="Underline" className="h-7 w-7 p-0">
          <UnderlineIcon className="h-3.5 w-3.5" />
        </Toggle>
        <div className="w-px h-5 bg-border mx-0.5" />
        <Toggle size="sm" pressed={editor.isActive('heading', { level: 2 })} onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="Heading" className="h-7 w-7 p-0">
          <Heading2 className="h-3.5 w-3.5" />
        </Toggle>
        <div className="w-px h-5 bg-border mx-0.5" />
        <Toggle size="sm" pressed={editor.isActive('bulletList')} onPressedChange={() => editor.chain().focus().toggleBulletList().run()} aria-label="Bullet List" className="h-7 w-7 p-0">
          <List className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle size="sm" pressed={editor.isActive('orderedList')} onPressedChange={() => editor.chain().focus().toggleOrderedList().run()} aria-label="Ordered List" className="h-7 w-7 p-0">
          <ListOrdered className="h-3.5 w-3.5" />
        </Toggle>
        <div className="w-px h-5 bg-border mx-0.5" />
        <Popover open={emojiOpen} onOpenChange={(open) => { setEmojiOpen(open); if (!open) setEmojiSearch(''); }}>
          <PopoverTrigger asChild>
            <button type="button" className="h-7 w-7 inline-flex items-center justify-center rounded-md text-sm hover:bg-muted">
              <Smile className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-0 z-[9999]" side="bottom" align="start">
            <div className="flex items-center gap-0.5 px-1 py-1 border-b border-border overflow-x-auto scrollbar-hide">
              {categoryKeys.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setEmojiCategory(key); setEmojiSearch(''); }}
                  className={cn(
                    'h-7 w-7 flex-shrink-0 flex items-center justify-center rounded hover:bg-muted transition-colors',
                    emojiCategory === key && !emojiSearch ? 'bg-accent' : ''
                  )}
                  title={EMOJI_CATEGORIES[key].labelPt}
                >
                  <TwemojiImg emoji={categoryIcons[key]} size={16} />
                </button>
              ))}
            </div>
            <ScrollArea className="h-[200px]">
              <div className="grid grid-cols-8 gap-0.5 p-2">
                {currentEmojis.map((emoji, i) => (
                  <button
                    key={`${emoji}-${i}`}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="h-8 w-8 flex items-center justify-center hover:bg-muted rounded transition-colors"
                  >
                    <TwemojiImg emoji={emoji} size={22} />
                  </button>
                ))}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
        {onUploadMedia && (
          <>
            <div className="w-px h-5 bg-border mx-0.5" />
            <input
              ref={mediaInputRef}
              type="file"
              accept="image/*,video/*,application/pdf"
              onChange={handleMediaUpload}
              className="hidden"
            />
            <button
              type="button"
              className="h-7 w-7 inline-flex items-center justify-center rounded-md text-sm hover:bg-muted disabled:opacity-50"
              onClick={() => mediaInputRef.current?.click()}
              disabled={uploadingMedia}
              title="Anexar mídia"
            >
              {uploadingMedia ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
            </button>
          </>
        )}
      </div>

      <EditorContent editor={editor} className="emoji-native-font" />

      {maxLength && (
        <div className="text-xs text-muted-foreground text-right px-3 py-1 border-t border-border">
          {editor.getText().length}/{maxLength}
        </div>
      )}
    </div>
  );
}

// Tags/attributes used by the TipTap editor in this app
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 's', 'h2', 'h3',
    'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
    'a', 'img', 'span', 'div',
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class', 'data-emoji', 'draggable', 'loading', 'contenteditable', 'width', 'height'],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'style'],
};

export function RichTextContent({ content, className }: { content: string; className?: string }) {
  if (!content) return null;

  const sanitized = DOMPurify.sanitize(normalizeRichTextContent(content), SANITIZE_CONFIG);

  return (
    <div
      className={cn('prose prose-sm dark:prose-invert max-w-none break-words emoji-rich-content', className)}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
