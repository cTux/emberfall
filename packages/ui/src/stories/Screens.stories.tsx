import { Lobby as LobbyPreview } from './screens/Lobby';
import { Settings as SettingsPreview } from './screens/Settings';
import { Wardrobe as WardrobePreview } from './screens/Wardrobe';
import { Codex as CodexPreview } from './screens/Codex';
import { Hud as HudPreview } from './screens/Hud';
import { Portal as PortalPreview } from './screens/Portal';
import { Confirmation as ConfirmationPreview } from './screens/Confirmation';
import { Fallen as FallenPreview } from './screens/Fallen';
import { Service as ServicePreview } from './screens/Service';
import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = { title: 'Screens/Compositions', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Lobby: Story = {
  render: LobbyPreview,
};
export const Settings: Story = {
  render: SettingsPreview,
};
export const Wardrobe: Story = {
  render: WardrobePreview,
};
export const Codex: Story = {
  render: CodexPreview,
};
export const Hud: Story = {
  render: HudPreview,
};
export const Portal: Story = {
  render: PortalPreview,
};
export const Confirmation: Story = {
  render: ConfirmationPreview,
};
export const Fallen: Story = {
  render: FallenPreview,
};
export const Service: Story = {
  render: ServicePreview,
};
