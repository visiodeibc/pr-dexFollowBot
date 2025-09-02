export const metadata = {
  title: 'Telegram Bot Vercel',
  description: 'A Telegram bot built with Next.js, grammY, and Supabase',
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