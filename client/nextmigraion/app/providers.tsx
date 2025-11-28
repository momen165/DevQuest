'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import { SpeedInsights } from '@vercel/speed-insights/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SpeedInsights />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            style: {
              background: '#4aed88',
              color: '#fff',
            },
          },
        }}
      />
      {children}
    </AuthProvider>
  );
}
