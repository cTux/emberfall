import { lazy, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GameUiProvider, PanelPositionContext } from '@emberfall/ui';
import { ChatProvider } from './ChatProvider';
import { AccountGate } from './Account';
import { DeferredContent } from './DeferredContent';
import { panelPositions } from './panel-positions';
import { clientAsset } from './urls';
import './style.scss';
import { loadPreferences } from './preferences';

const Game = lazy(() => import('./Game').then((module) => ({ default: module.Game })));
const AssetGallery = lazy(() =>
  import('./AssetGallery').then((module) => ({ default: module.AssetGallery })),
);
const ClassMovementGallery = lazy(() =>
  import('./ClassMovementGallery').then((module) => ({ default: module.ClassMovementGallery })),
);

window.addEventListener('contextmenu', (event) => event.preventDefault(), { capture: true });

function App() {
  const [preferences, setPreferences] = useState(loadPreferences);

  return (
    <GameUiProvider fontBaseUrl={clientAsset('fonts/')} font={preferences.font}>
      <PanelPositionContext value={panelPositions}>
        <ChatProvider>
          <DeferredContent>
            {new URLSearchParams(location.search).has('class-movement') ? (
              <ClassMovementGallery />
            ) : new URLSearchParams(location.search).has('art-gallery') ? (
              <AssetGallery />
            ) : (
              <AccountGate>
                {(props) => (
                  <Game {...props} preferences={preferences} setPreferences={setPreferences} />
                )}
              </AccountGate>
            )}
          </DeferredContent>
        </ChatProvider>
      </PanelPositionContext>
    </GameUiProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
