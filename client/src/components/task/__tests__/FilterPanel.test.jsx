import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterPanel from '../FilterPanel';
import axios from 'axios';
import { vi } from 'vitest';

describe('FilterPanel', () => {
  const defaultProps = {
    projectId: 'test-project',
    activeFilters: { status: [], priority: [], assignedTo: [], labels: [], sort: '-createdAt' },
    setActiveFilters: vi.fn(),
    users: [{ _id: 'u1', name: 'User 1' }],
    labels: [{ _id: 'l1', name: 'Bug' }],
    onApply: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a filter button with count', () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Filter & Sort/i })).toBeInTheDocument();
  });

  it('opens panel and shows filter options', async () => {
    render(<FilterPanel {...defaultProps} />);
    
    await userEvent.click(screen.getByRole('button', { name: /Filter & Sort/i }));
    
    expect(screen.getByText('Advanced Filters')).toBeInTheDocument();
    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('User 1')).toBeInTheDocument();
    expect(screen.getByText('Bug')).toBeInTheDocument();
  });

  it('calls setActiveFilters when a filter is clicked', async () => {
    render(<FilterPanel {...defaultProps} />);
    
    await userEvent.click(screen.getByRole('button', { name: /Filter & Sort/i }));
    await userEvent.click(screen.getByText('To Do'));
    
    expect(defaultProps.setActiveFilters).toHaveBeenCalledWith(expect.objectContaining({
      status: ['To Do']
    }));
  });

  it('calls onApply and closes panel when Apply Filter is clicked', async () => {
    render(<FilterPanel {...defaultProps} />);
    
    await userEvent.click(screen.getByRole('button', { name: /Filter & Sort/i }));
    await userEvent.click(screen.getByRole('button', { name: /Apply Filter/i }));
    
    expect(defaultProps.onApply).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText('Advanced Filters')).not.toBeInTheDocument();
    });
  });

  it('can save a view', async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });
    axios.get.mockResolvedValueOnce({ data: { data: [] } }); // fetch views initially
    axios.get.mockResolvedValueOnce({ data: { data: [{ _id: 'v1', name: 'My View' }] } }); // after save
    
    render(<FilterPanel {...defaultProps} />);
    
    await userEvent.click(screen.getByRole('button', { name: /Filter & Sort/i }));
    
    const input = screen.getByPlaceholderText(/View name/i);
    await userEvent.type(input, 'My View');
    
    const saveButton = screen.getByTitle('Save View');
    await userEvent.click(saveButton);
    
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/v1/views', expect.any(Object));
    });
  });
});
