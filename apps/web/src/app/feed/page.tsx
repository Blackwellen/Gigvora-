import { redirect } from 'next/navigation';

export default function FeedRedirect() {
  redirect('/app/live-feed');
}
