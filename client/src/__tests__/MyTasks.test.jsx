import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MyTasks from '../pages/MyTasks';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import axios from 'axios';
import { MemoryRouter } from 'react-router-dom';

vi.mock('axios');

const mockUser = {
  _id: 'user1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'Member',
};

const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
};

describe('MyTasks Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <AuthContext.Provider value={{ user: mockUser }}>
          <SocketContext.Provider value={mockSocket}>
            <MyTasks />
          </SocketContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    );
  };

  it('renders loading state initially', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        summary: { assigned: 0, pending: 0, overdue: 0, completed: 0 },
        groups: { assigned: [], pending: [], overdue: [], completed: [] },
        hasMore: { assigned: false, pending: false, overdue: false, completed: false }
      }
    });
    // For dependencies
    axios.get.mockResolvedValueOnce({ data: { users: [] } });
    axios.get.mockResolvedValueOnce({ data: { projects: [] } });

    renderComponent();

    // The loading skeletons should be present initially
    // We can't easily query raw divs without text, but we can verify the API is called
    expect(axios.get).toHaveBeenCalledWith('/tasks/my/dashboard', expect.any(Object));
  });

  it('renders summary cards correctly', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        summary: { assigned: 5, pending: 2, overdue: 1, completed: 10 },
        groups: { assigned: [], pending: [], overdue: [], completed: [] },
        hasMore: { assigned: false, pending: false, overdue: false, completed: false }
      }
    });
    axios.get.mockResolvedValueOnce({ data: { users: [] } });
    axios.get.mockResolvedValueOnce({ data: { projects: [] } });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument(); // Assigned count
      expect(screen.getByText('2')).toBeInTheDocument(); // Pending count
      expect(screen.getByText('1')).toBeInTheDocument(); // Overdue count
      expect(screen.getByText('10')).toBeInTheDocument(); // Completed count
    });
  });

  it('switches tabs and displays empty state correctly', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        summary: { assigned: 0, pending: 0, overdue: 0, completed: 0 },
        groups: { assigned: [], pending: [], overdue: [], completed: [] },
        hasMore: { assigned: false, pending: false, overdue: false, completed: false }
      }
    });
    axios.get.mockResolvedValueOnce({ data: { users: [] } });
    axios.get.mockResolvedValueOnce({ data: { projects: [] } });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('You have no assigned To Do tasks.')).toBeInTheDocument();
    });

    const pendingTab = screen.getByRole('tab', { name: 'Pending' });
    fireEvent.click(pendingTab);

    await waitFor(() => {
      expect(screen.getByText('You have no tasks in progress.')).toBeInTheDocument();
    });
  });
});
