// Test-only root: mirrors main.jsx but exports the tree instead of mounting
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import App from '@/App';
import { Toaster } from '@/components/ui/toaster';
import { CartProvider } from '@/context/CartContext';
import { CompareProvider } from '@/components/CompareDrawer';
import { AuthProvider } from '@/context/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ConfirmProvider } from '@/components/ConfirmDialog';
import { RfqProvider } from '@/context/RfqContext';

export default function Root() {
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <AuthProvider>
            <RfqProvider>
              <CartProvider>
                <CompareProvider>
                  <ConfirmProvider>
                    <App />
                    <Toaster />
                  </ConfirmProvider>
                </CompareProvider>
              </CartProvider>
            </RfqProvider>
          </AuthProvider>
        </BrowserRouter>
      </MotionConfig>
    </ErrorBoundary>
  );
}
