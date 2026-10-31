import { useChat } from './ChatProvider';
import { Component, Suspense, type ReactNode } from 'react';
import { Button, Typography } from '@mui/material';

export function DeferredContent({ children }: { children: ReactNode }) {
  const { reportError } = useChat();
  return <ContentBoundary reportError={reportError}>{children}</ContentBoundary>;
}

class ContentBoundary extends Component<
  { children: ReactNode; reportError: (text: string) => void },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch() {
    this.props.reportError('Could not load this content. Reload to try again.');
  }

  override render() {
    if (this.state.failed) return <Button onClick={() => location.reload()}>Reload</Button>;
    return (
      <Suspense
        fallback={
          <Typography
            role='status'
            sx={{
              position: 'absolute',
              width: 1,
              height: 1,
              overflow: 'hidden',
              clipPath: 'inset(50%)',
              whiteSpace: 'nowrap',
            }}
          >
            Loading…
          </Typography>
        }
      >
        {this.props.children}
      </Suspense>
    );
  }
}
