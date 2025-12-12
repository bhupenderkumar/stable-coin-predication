import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Header, Footer } from '@/components/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Solana Meme Trading Bot | AI-Powered Trading',
  description:
    'An AI-powered meme coin trading bot built on Solana. Analyze tokens with AI, execute trades, and manage your portfolio.',
  keywords: [
    'Solana',
    'meme coins',
    'trading bot',
    'AI trading',
    'cryptocurrency',
    'DeFi',
  ],
  authors: [{ name: 'Solana Grant Project' }],
  openGraph: {
    title: 'Solana Meme Trading Bot',
    description: 'AI-powered meme coin trading on Solana',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
