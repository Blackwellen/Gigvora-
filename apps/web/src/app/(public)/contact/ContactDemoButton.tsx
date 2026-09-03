'use client';

import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ContactDemoModal } from './ContactDemoModal';

export function ContactDemoButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button className="w-full justify-center" onClick={() => setOpen(true)}>
        <CalendarClock className="h-4 w-4" /> Book a demo
      </Button>
      <ContactDemoModal open={open} onClose={() => setOpen(false)} product="general" />
    </>
  );
}
