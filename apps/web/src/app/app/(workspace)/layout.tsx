import { AuthGate } from '@/components/shell/AuthGate';
import { GlobalTopBar } from '@/components/shell/GlobalTopBar';
import { MobileBottomNav } from '@/components/shell/MobileBottomNav';
import { FloatingChatBubble } from '@/components/chat-bubble/FloatingChatBubble';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="min-h-screen bg-[#f7f8fa] dark:bg-ink-950">
        <GlobalTopBar />
        <main className="pb-16 xl:pb-0">{children}</main>
        <MobileBottomNav />
        <FloatingChatBubble />
      </div>
    </AuthGate>
  );
}
