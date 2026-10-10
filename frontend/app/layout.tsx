import type { Metadata } from 'next';
import { Geist, Playfair_Display, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import Nav from '@/components/Nav';
import StickyFooter from '@/components/ui/StickyFooter';
import GoogleProvider from '@/components/GoogleProvider';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['700', '900'],
  style: ['normal', 'italic'],
  variable: '--font-display',
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
});

export const metadata: Metadata = {
  title: 'Aavarana',
  description: 'Content publishing platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${playfair.variable} ${sourceSerif.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" style={{ background: 'var(--background)' }} suppressHydrationWarning>
        <GoogleProvider>
          <Nav />
          <main className="flex-1 min-w-0">{children}</main>
          <StickyFooter />
        </GoogleProvider>
      </body>
    </html>
  );
}
