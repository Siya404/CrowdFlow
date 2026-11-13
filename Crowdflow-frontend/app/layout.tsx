import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Crowdflow — Live operations',
  description: 'Intelligent crowd and queue management for live events.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
