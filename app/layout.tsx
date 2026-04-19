import type { Metadata } from 'next';
import './globals.css';

import { RouteProgress } from '@/components/layout/route-progress';

export const metadata: Metadata = {
  title: 'Camp Management App',
  description: 'Production-leaning infrastructure scaffold for camp operations.',
  applicationName: 'Camp Management App',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB">
      <body className="bg-camp-cream text-camp-forest">
        <RouteProgress />
        {children}
      </body>
    </html>
  );
}
