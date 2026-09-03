'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Smile } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { useTheme } from '@/lib/theme/ThemeContext';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

export function EmojiPickerButton({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const { resolvedTheme: theme } = useTheme();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <button
          type="button"
          aria-label="Add emoji"
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-brand-600 dark:hover:bg-ink-800"
        >
          <Smile className="h-4.5 w-4.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" width="w-auto" className="p-0 overflow-hidden">
        <EmojiPicker
          theme={theme as never}
          onEmojiClick={(data) => {
            onSelect(data.emoji);
            setOpen(false);
          }}
          width={320}
          height={380}
          previewConfig={{ showPreview: false }}
        />
      </PopoverContent>
    </Popover>
  );
}
