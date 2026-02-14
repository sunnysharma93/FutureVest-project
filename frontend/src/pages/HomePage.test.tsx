import { render, screen } from '@testing-library/react';
import { HomePage } from './HomePage';

describe('HomePage', () => {
  it('renders welcome message', () => {
    render(<HomePage />);
    expect(screen.getByText(/Welcome to FutureVest/i)).toBeInTheDocument();
  });
});
