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
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * ErrorBoundary — catches unhandled React rendering errors.
 * Wrap around top-level route outlets or any volatile component.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <App />
 *   </ErrorBoundary>
 *
 * Or with a custom fallback:
 *   <ErrorBoundary fallback={<p>Something broke</p>}>
 *     <MyComponent />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    // Log to console; swap for Sentry.captureException(error) in production
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null, info: null });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback)  return this.props.fallback;

    const msg = this.state.error?.message || 'An unexpected error occurred.';

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-3xl shadow-xl border border-red-100 p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-500 text-sm mb-1 leading-relaxed">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          {import.meta.env.DEV && (
            <details className="mt-4 text-left">
              <summary className="text-xs font-bold text-gray-400 cursor-pointer hover:text-gray-600">
                Developer details
              </summary>
              <pre className="mt-2 p-3 bg-gray-50 rounded-xl text-xs text-red-700 overflow-auto max-h-40 whitespace-pre-wrap">
                {msg}
              </pre>
            </details>
          )}
          <div className="flex flex-col sm:flex-row gap-3 mt-7">
            <button
              onClick={this.reset}
              className="flex-1 flex items-center justify-center gap-2 py-3 brand-gradient text-white font-bold rounded-xl text-sm hover:opacity-90 transition-opacity"
            >
              <RefreshCw className="h-4 w-4" />Try Again
            </button>
            <a
              href="/"
              className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:border-blue-300 hover:text-blue-600 transition-colors"
            >
              <Home className="h-4 w-4" />Go Home
            </a>
          </div>
          <p className="text-xs text-gray-400 mt-5">
            If this keeps happening, please email{' '}
            <a href="mailto:info@navgrow.org" className="text-blue-600 hover:underline">info@navgrow.org</a>
          </p>
        </div>
      </div>
    );
  }
}

/**
 * withErrorBoundary — HOC to wrap any component with an ErrorBoundary.
 *
 * Usage: const SafeComponent = withErrorBoundary(MyComponent);
 */
export const withErrorBoundary = (Component, fallback) => {
  const Wrapped = (props) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
  Wrapped.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;
  return Wrapped;
};

export default ErrorBoundary;
