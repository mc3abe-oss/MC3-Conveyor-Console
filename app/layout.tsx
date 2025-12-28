import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Belt Conveyor Calculator',
  description: 'Professional belt conveyor application design calculator with versioned calculations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-b from-mc3-mist/60 to-white">
          {children}
        </div>
      </body>
    </html>
  );
}
