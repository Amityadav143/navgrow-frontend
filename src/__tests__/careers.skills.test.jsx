import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// A live API job in the real backend shape: department/jobType/experience +
// skills:null (exactly what a job saved from the old admin form looked like)
const API_JOB = {
  id: 'j1', title: 'Site Engineer', department: 'Engineering', location: 'Siliguri, WB',
  jobType: 'Full-time', experience: '2-4 yrs', description: 'Supervise site work.',
  skills: null, status: 'OPEN',
};
vi.mock('@/lib/api', () => ({
  jobsApi: {
    list: vi.fn(() => Promise.resolve({ data: [API_JOB] })),
    apply: vi.fn(() => Promise.resolve({ data: {} })),
    uploadResume: vi.fn(() => Promise.resolve({ data: { url: '/uploads/resumes/x.pdf' } })),
  },
}));
vi.mock('@/hooks/useSeo', () => ({ default: () => {} }));
window.scrollTo = () => {};
global.IntersectionObserver = class { observe(){} unobserve(){} disconnect(){} };

import CareersPage from '@/pages/CareersPage';

describe('CareersPage with API jobs', () => {
  it('renders a null-skills API job and opens the detail brief without crashing', async () => {
    render(<MemoryRouter><CareersPage /></MemoryRouter>);
    await waitFor(() => screen.getByText('Site Engineer'));
    // normalised fields visible (previously undefined -> blank chips)
    expect(screen.getAllByText(/Engineering/).length).toBeGreaterThan(0);
    const btn = screen.getByText(/View details/i);
    fireEvent.click(btn); // used to throw on skills.map -> "something went wrong"
    // The description now appears twice — once as the card preview and once in
    // the opened brief — so assert on presence rather than uniqueness.
    await waitFor(() => expect(screen.getAllByText(/Supervise site work/).length).toBeGreaterThan(1));
    // The brief's own actions confirm the modal actually opened.
    expect(screen.getByText(/Apply for this role/i)).toBeTruthy();
    expect(screen.getByText(/Email us instead/i)).toBeTruthy();
    expect(screen.queryByText(/something went wrong/i)).toBeNull();
  });
});
