import type { Metadata } from 'next';
import ThemeRegistry from '@/components/ThemeRegistry';
import { AuthProvider } from '@/contexts/AuthContext';
import { UserProfileProvider } from '@/contexts/UserProfileContext';

export const metadata: Metadata = {
  title: 'Inside Out - Devil\'s Advocate',
  description: 'AI-powered application built with Next.js, MUI, and Vercel AI SDK',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>
          <AuthProvider>
            <UserProfileProvider>
              {children}
            </UserProfileProvider>
          </AuthProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
