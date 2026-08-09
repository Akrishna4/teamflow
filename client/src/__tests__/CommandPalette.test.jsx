import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import CommandPalette from '../components/CommandPalette';
import axios from 'axios';

describe('CommandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  it('opens on Cmd+K', async () => {
    render(
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    );
    
    await userEvent.keyboard('{Meta>}{k}{/Meta}');
    expect(screen.getByPlaceholderText(/Search projects/i)).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    render(
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    );
    
    await userEvent.keyboard('{Meta>}{k}{/Meta}');
    expect(screen.getByPlaceholderText(/Search projects/i)).toBeInTheDocument();
    
    await userEvent.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/Search projects/i)).not.toBeInTheDocument();
    });
  });

  it('debounces search input and fetches results', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        data: {
          projects: [{ _id: '1', name: 'Test Project' }],
          tasks: [],
          comments: [],
          labels: []
        }
      }
    });

    render(
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    );
    
    await userEvent.keyboard('{Meta>}{k}{/Meta}');
    const input = screen.getByPlaceholderText(/Search projects/i);
    
    await userEvent.type(input, 'test');
    
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/v1/search?q=test'), expect.any(Object));
    });
    
    expect(await screen.findByText('Test Project')).toBeInTheDocument();
  });
});
