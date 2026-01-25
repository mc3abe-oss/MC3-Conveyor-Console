import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import { APP_NAME, APP_DESCRIPTION } from '../src/lib/brand';
import RulesDebugPanel from './components/RulesDebugPanel';
import { TelemetryBootstrap } from '../src/components/telemetry/TelemetryBootstrap';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
};

// Development banner - REMOVE THIS WHEN GOING TO PRODUCTION
function DevBanner() {
  return (
    <div className="bg-amber-500 text-black text-center py-2 px-4 font-semibold text-sm fixed top-0 left-0 right-0 z-[9999] shadow-md">
      ⚠️ DEVELOPMENT BUILD - NOT FOR PRODUCTION USE ⚠️
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <DevBanner />
        <div className="min-h-screen bg-gradient-to-b from-mc3-mist/60 to-white pt-10">
          {children}
        </div>
        <SpeedInsights />
        <RulesDebugPanel />
        <TelemetryBootstrap />
      </body>
    </html>
  );
}
