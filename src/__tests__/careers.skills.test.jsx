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
vi.mock('@/lib/api', () => ({ jobsApi: { list: vi.fn(() => Promise.resolve({ data: [API_JOB] })) } }));
vi.mock('@/hooks/useSeo', () => ({ default: () => {} }));
window.scrollTo = () => {};
global.IntersectionObserver = class { observe(){} unobserve(){} disconnect(){} };

import CareersPage from '@/pages/CareersPage';

describe('CareersPage with API jobs', () => {
  it('renders a null-skills API job and opens View Details without crashing', async () => {
    render(<MemoryRouter><CareersPage /></MemoryRouter>);
    await waitFor(() => screen.getByText('Site Engineer'));
    // normalised fields visible (previously undefined -> blank chips)
    expect(screen.getAllByText(/Engineering/).length).toBeGreaterThan(0);
    const btn = screen.getByText(/View Details/i);
    fireEvent.click(btn); // used to throw on skills.map -> "something went wrong"
    await waitFor(() => screen.getByText(/Supervise site work/));
    expect(screen.queryByText(/something went wrong/i)).toBeNull();
  });
});
