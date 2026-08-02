import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TaskCelebrationOverlay, TASK_COMPLETED_EVENT } from './TaskCelebrationOverlay';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { MemoryRouter } from 'react-router-dom';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter>
      <LanguageProvider>{children}</LanguageProvider>
    </MemoryRouter>
  );
}

describe('TaskCelebrationOverlay', () => {
  it('renders the celebration when the task completed event is dispatched', async () => {
    render(<TaskCelebrationOverlay />, { wrapper: Wrapper });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    window.dispatchEvent(new CustomEvent(TASK_COMPLETED_EVENT));

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    expect(screen.getByText(/Task completed/i)).toBeInTheDocument();
  });
});
