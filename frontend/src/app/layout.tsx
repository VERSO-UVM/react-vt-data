import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { MantineProvider, createTheme } from '@mantine/core';
import { useItems } from '@/components/ItemsProvider';
import HeaderMenu from '../components/HeaderMenu';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: ' Vermont Data Exploration App',
  description: 'Vermont Data dashboard built at UVM by VERSO students',
};

const theme = createTheme({
  primaryColor: 'blue',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icons8-maple-leaf-48.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <MantineProvider theme={theme}>
          <HeaderMenu />
          <main style={{ marginTop: 20 }}>{children}</main>
        </MantineProvider>
      </body>
    </html>
  );
}
