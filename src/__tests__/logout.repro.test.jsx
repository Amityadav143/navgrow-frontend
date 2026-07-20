import { describe, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';

// Mock axios so no real network happens
vi.mock('axios', () => {
  const ok = (data = {}) => Promise.resolve({ data });
  const inst = {
    get: vi.fn((url) => ok(url.includes('settings') ? {} : [])),
    post: vi.fn(() => ok({ message: 'Logged out successfully.' })),
    put: vi.fn(() => ok()), patch: vi.fn(() => ok()), delete: vi.fn(() => ok()),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    defaults: { headers: { common: {} } },
  };
  return { default: { create: () => inst, post: vi.fn(() => ok()), get: vi.fn(() => ok([])) } };
});

// jsdom lacks these
window.scrollTo = () => {};
window.matchMedia = window.matchMedia || function () {
  return { matches: false, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {} };
};
global.IntersectionObserver = class { observe(){} unobserve(){} disconnect(){} };
global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };

describe('logout repro', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('ng_access_token', 'tok');
    localStorage.setItem('ng_refresh_token', 'ref');
    localStorage.setItem('ng_user', JSON.stringify({
      email: 'admin@navgrow.org', fullName: 'Admin User',
      roles: ['ROLE_ADMIN'], isAdmin: true, isManager: false, isEditor: false,
    }));
    window.history.pushState({}, '', '/account');
  });

  it('click Sign Out on /account', async () => {
    const errors = [];
    const origError = console.error;
    console.error = (...a) => { errors.push(a.map(x => String(x?.message || x)).join(' ')); origError(...a); };

    const { default: Root } = await import('../main-under-test.jsx');
    render(<Root />);

    // wait for account page
    await waitFor(() => screen.getAllByText(/Sign Out/i), { timeout: 8000 });
    const btns = screen.getAllByText(/Sign Out/i);
    await act(async () => { fireEvent.click(btns[btns.length - 1]); });
    await new Promise(r => setTimeout(r, 800));

    const boundaryHit = screen.queryByText(/Something went wrong/i);
    console.log('BOUNDARY_HIT=', !!boundaryHit);
    console.log('CAPTURED_ERRORS=', JSON.stringify(errors.filter(e => /Error|error|Invalid|Cannot|undefined/.test(e)).slice(0, 12), null, 2));
    console.error = origError;
  }, 30000);
});
