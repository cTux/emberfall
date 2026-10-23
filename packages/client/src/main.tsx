import { lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { GameUiProvider, PanelPositionContext } from '@emberfall/ui';
import { AccountGate } from './Account';
import { DeferredContent } from './DeferredContent';
import { panelPositions } from './panel-positions';
import { clientAsset } from './urls';
import './style.scss';

const Game = lazy(() => import('./Game').then((module) => ({ default: module.Game })));
const AssetGallery = lazy(() =>
  import('./AssetGallery').then((module) => ({ default: module.AssetGallery })),
);
const ClassMovementGallery = lazy(() =>
  import('./ClassMovementGallery').then((module) => ({ default: module.ClassMovementGallery })),
);

window.addEventListener('contextmenu', (event) => event.preventDefault(), { capture: true });

createRoot(document.getElementById('root')!).render(
  <GameUiProvider fontBaseUrl={clientAsset('fonts/')}>
    <PanelPositionContext value={panelPositions}>
      <DeferredContent>
        {new URLSearchParams(location.search).has('class-movement') ? (
          <ClassMovementGallery />
        ) : new URLSearchParams(location.search).has('art-gallery') ? (
          <AssetGallery />
        ) : (
          <AccountGate>{(props) => <Game {...props} />}</AccountGate>
        )}
      </DeferredContent>
    </PanelPositionContext>
  </GameUiProvider>,
);
