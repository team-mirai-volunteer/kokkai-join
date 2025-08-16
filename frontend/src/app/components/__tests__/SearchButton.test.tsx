import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import SearchButton from '../SearchButton';

// Mock next/navigation
jest.mock('next/navigation');

describe('SearchButton', () => {
  const mockPush = jest.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  it('should render with search icon and text', () => {
    render(<SearchButton />);

    const button = screen.getByRole('button', { name: /検索ページへ/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('検索ページへ');
  });

  it('should be a contained button', () => {
    render(<SearchButton />);

    const button = screen.getByRole('button', { name: /検索ページへ/i });
    expect(button).toHaveClass('MuiButton-contained');
  });

  it('should be large size', () => {
    render(<SearchButton />);

    const button = screen.getByRole('button', { name: /検索ページへ/i });
    expect(button).toHaveClass('MuiButton-sizeLarge');
  });

  it('should navigate to search page when clicked', async () => {
    render(<SearchButton />);

    const button = screen.getByRole('button', { name: /検索ページへ/i });
    await user.click(button);

    expect(mockPush).toHaveBeenCalledWith('/search');
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('should have search icon', () => {
    const { container } = render(<SearchButton />);

    const searchIcon = container.querySelector('svg[data-testid="SearchIcon"]');
    expect(searchIcon).toBeInTheDocument();
  });

  it('should be accessible with proper ARIA attributes', () => {
    render(<SearchButton />);

    const button = screen.getByRole('button', { name: /検索ページへ/i });
    expect(button).toHaveAccessibleName('検索ページへ');
  });
});
