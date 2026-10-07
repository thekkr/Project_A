import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import Nav from '@/components/Nav';
import GoogleProvider from '@/components/GoogleProvider';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const metadata: Metadata = {
  title: 'Aavarana',
  description: 'Content publishing platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50" suppressHydrationWarning>
        <GoogleProvider>
          <Nav />
          <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">{children}</main>
        </GoogleProvider>
      </body>
    </html>
  );
}
