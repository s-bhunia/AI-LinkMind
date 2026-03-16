import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { ThemeProvider } from 'next-themes';

// Import the new client component
import AndroidBridge from '@/components/AndroidBridge'; 

export const metadata: Metadata = {
  title: 'LinkSaver',
  description: 'Intelligently categorize and save your video links.',
};

export const viewport = 'width=device-width, initial-scale=1, maximum-scale=5';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AndroidBridge /> 
          
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}