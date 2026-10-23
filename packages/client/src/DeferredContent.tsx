import { Component, Suspense, type ReactNode } from 'react';
import { Alert, Button, Typography } from '@mui/material';

export class DeferredContent extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed)
      return (
        <Alert severity='error' action={<Button onClick={() => location.reload()}>Reload</Button>}>
          Could not load this content. Reload to try again.
        </Alert>
      );
    return (
      <Suspense fallback={<Typography role='status'>Loading…</Typography>}>
        {this.props.children}
      </Suspense>
    );
  }
}
