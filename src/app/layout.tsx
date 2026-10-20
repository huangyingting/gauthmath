import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'Gauth: #1 AI Homework Helper & Study Companion | Free Step-by-Step STEM Solver',
  description:
    'Instant step-by-step homework solutions across Math, Physics, Chemistry, Biology, Calculus, Statistics, and Writing powered by Hybrid Symbolic CAS, GitHub Copilot SDK, and Azure OpenAI.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
