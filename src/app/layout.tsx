import type { Metadata } from 'next';
import localFont from 'next/font/local';
import 'katex/dist/katex.min.css';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';
import { cookies, headers } from 'next/headers';
import { LanguageProvider } from '@/components/i18n/LanguageProvider';
import { getPreferredLocale, LOCALE_COOKIE } from '@/lib/i18n';

const monaSans = localFont({
  src: './fonts/MonaSans.woff2',
  variable: '--font-mona',
  weight: '200 900',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Gauth — A clearer way to learn',
  description:
    'Deterministic Computer Algebra System (CAS) paired with multi-model AI reasoning, interactive 2D graphing, 8-handle OCR crop, Atlas visual essays, and 15-minute STEM courses.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const locale = getPreferredLocale(cookieStore.get(LOCALE_COOKIE)?.value, requestHeaders.get('accept-language'));
  return (
    <html lang={locale === 'zh' ? 'zh-CN' : 'en'} className={monaSans.variable}>
      <body className="min-h-screen bg-atelier-canvas font-sans text-atelier-ink antialiased">
        <LanguageProvider initialLocale={locale}>
          <AppShell>{children}</AppShell>
        </LanguageProvider>
      </body>
    </html>
  );
}
