import type { Metadata } from 'next';
import { Zilla_Slab } from 'next/font/google';

import '@mantine/core/styles.css';
import './globals.css';

import { MantineProvider, Container } from '@mantine/core';

import HeaderMenu from '../components/HeaderMenu';
import { theme } from './theme';

const zillaSlab = Zilla_Slab({
  variable: '--font-zilla-slab',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Vermont Data Collaborative',
  description: 'Vermont Data dashboard built at UVM by VERSO students',
};

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

      <body className={`${zillaSlab.variable} antialiased`}>
        <MantineProvider theme={theme}>
          <HeaderMenu />
          <Container size="xl" py="lg">
            <main>{children}</main>
          </Container>
        </MantineProvider>
      </body>
    </html>
  );
}
