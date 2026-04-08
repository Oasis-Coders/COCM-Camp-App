import { redirect } from 'next/navigation';

export default function DevToolsAccountRedirectPage() {
  redirect('/profile');
}
