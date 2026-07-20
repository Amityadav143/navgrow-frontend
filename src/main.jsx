/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 | navgrow.org | info@navgrow.org
 *
 * PROPRIETARY & CONFIDENTIAL
 * This file is part of the Navgrow Engineering Platform.
 * Unauthorised copying, modification, distribution, or use is prohibited
 * without prior written consent of Navgrow Engineering Service Pvt. Ltd.
 *
 * Licensed for: navgrow.org (Production Deployment Only)
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import App from '@/App';
import { initVitals } from '@/lib/vitals';
import '@/index.css';
import { Toaster } from '@/components/ui/toaster';
import { CartProvider } from '@/context/CartContext';
import { CompareProvider } from '@/components/CompareDrawer';
import { AuthProvider } from '@/context/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ConfirmProvider } from '@/components/ConfirmDialog';
import { RfqProvider } from '@/context/RfqContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <RfqProvider>
              <CompareProvider>
              <ConfirmProvider>
                <App />
                <Toaster />
              </ConfirmProvider>
              </CompareProvider>
            </RfqProvider>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
      </MotionConfig>
    </ErrorBoundary>
  </React.StrictMode>
);

initVitals();
