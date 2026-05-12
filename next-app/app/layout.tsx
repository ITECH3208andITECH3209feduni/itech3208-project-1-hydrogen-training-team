import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hydrogen Lab Safety',
  description: 'Interactive Hydrogen Lab Safety Training',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
