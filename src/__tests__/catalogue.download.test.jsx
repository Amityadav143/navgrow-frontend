import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const capture = vi.fn(() => Promise.resolve({ data: { message: 'ok', downloadUrl: '/api/catalogue/download' } }));
vi.mock('@/lib/api', () => ({
  catalogueApi: {
    capture: (...a) => capture(...a),
    downloadUrl: () => 'http://x/api/catalogue/download',
  },
}));

import CatalogueDownloadModal from '@/components/CatalogueDownloadModal';

describe('CatalogueDownloadModal', () => {
  beforeEach(() => { capture.mockClear(); });

  it('validates required fields before submitting', async () => {
    render(<CatalogueDownloadModal open onClose={() => {}} />);
    fireEvent.click(screen.getByText(/Get the Catalogue/i));
    await waitFor(() => screen.getByText(/Please enter your name/i));
    expect(capture).not.toHaveBeenCalled();
  });

  it('rejects an invalid email', async () => {
    render(<CatalogueDownloadModal open onClose={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(/Rahul Sharma/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByPlaceholderText(/98765/i), { target: { value: '+91 9876543210' } });
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), { target: { value: 'not-an-email' } });
    fireEvent.change(screen.getByPlaceholderText(/Briefly describe/i), { target: { value: 'Need catalogue' } });
    fireEvent.click(screen.getByText(/Get the Catalogue/i));
    await waitFor(() => screen.getByText(/valid email/i));
    expect(capture).not.toHaveBeenCalled();
  });

  it('submits a valid lead and shows the success state', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<CatalogueDownloadModal open onClose={() => {}} source="test" />);
    fireEvent.change(screen.getByPlaceholderText(/Rahul Sharma/i), { target: { value: 'Rahul' } });
    fireEvent.change(screen.getByPlaceholderText(/98765/i), { target: { value: '+91 9876543210' } });
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), { target: { value: 'rahul@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Briefly describe/i), { target: { value: 'Need railway tools catalogue' } });
    fireEvent.click(screen.getByText(/Get the Catalogue/i));
    await waitFor(() => screen.getByText(/download has started/i));
    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture.mock.calls[0][0]).toMatchObject({
      name: 'Rahul', email: 'rahul@example.com', requirement: 'Need railway tools catalogue', source: 'test',
    });
    clickSpy.mockRestore();
  });
});
