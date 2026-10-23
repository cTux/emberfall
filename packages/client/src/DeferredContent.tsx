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
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.reportError('Could not load this content. Reload to try again.');
  }

  render() {
    if (this.state.failed) return <Button onClick={() => location.reload()}>Reload</Button>;
    return (
      <Suspense fallback={<Typography role='status'>Loading…</Typography>}>
        {this.props.children}
      </Suspense>
    );
  }
}
