import type { ClientMessage, WorldState, Player } from '@emberfall/common';
import {
  resourceNodes,
  nearbyInteraction,
  nearbyResource,
  activityIndicator,
  inTrainingZone,
} from '@emberfall/core';
import type { DrawingContext } from './rendering/drawing-context';
import { drawTimedActivity } from './timed-activity';
import { drawInteractionPrompt, type Interaction } from './effects';
import {
  partyInteraction,
  pickInteraction,
  interactionInRange,
  type InteractionTarget,
} from './interaction-targets';

type Options = {
  element: HTMLCanvasElement;
  signal: { current: Interaction | null };
  playerId: string;
  send: (message: ClientMessage) => void;
  blocked: () => boolean;
};
type Frame = {
  ctx: DrawingContext;
  authoritative: WorldState | null;
  view: WorldState | null;
  local?: Player;
  now: number;
  receivedAt: number;
  hideGatheringHintInCombat: boolean;
  highlightInteractions: boolean;
};

export class InteractionPresentation {
  private clock?: { activity: NonNullable<Player['gathering']>; offset: number };
  private options: Options;
  constructor(options: Options) {
    this.options = options;
  }
  frame(frame: Frame) {
    const { element, signal, playerId, send, blocked } = this.options;
    const {
      ctx,
      authoritative,
      view,
      local,
      now,
      receivedAt,
      hideGatheringHintInCombat,
      highlightInteractions,
    } = frame;
    let targets: InteractionTarget[] = [];
    let hovered: InteractionTarget | null = null;
    const authoritativePlayer = authoritative?.players.find((p) => p.id === playerId);
    const drawPrompt = () => {
      const activity = authoritativePlayer?.gathering;
      if (!activity) this.clock = undefined;
      element.dataset.gathering = activity?.nodeId ?? '';
      element.dataset.gatheringCheck = activity?.checkId ?? '';
      if (activity && local) {
        element.dataset.interactionPrompt = '';
        const node = resourceNodes(local, 250).find((node) => node.id === activity.nodeId);
        if (node) {
          if (
            !this.clock ||
            this.clock.activity.startedAt !== activity.startedAt ||
            this.clock.activity.nodeId !== activity.nodeId ||
            this.clock.activity.epoch !== activity.epoch
          ) {
            // Packet arrival jitter must not restart the fill or indicator clock.
            this.clock = {
              activity,
              offset: (authoritative?.serverNow ?? 0) - Math.min(now, receivedAt),
            };
          }
          const activityTime = now + this.clock.offset;
          element.dataset.gatheringIndicator = String(activityIndicator(activity, activityTime));
          element.dataset.gatheringZone = String(activity.zoneStart);
          drawTimedActivity(ctx, activity, node.x, node.y - node.size - 26, activityTime);
          signal.current = {
            id: `gather:${node.id}`,
            name: `Gather ${node.kind}`,
            x: node.x,
            y: node.y,
            activate: () => {
              if (blocked()) return;
              send({
                type: 'gather',
                nodeId: node.id,
                epoch: activity.epoch,
                checkId: activity.checkId,
                at: activityTime,
              });
            },
          };
        }
        return;
      }
      const hideGatheringHint =
        hideGatheringHintInCombat &&
        signal.current?.id.startsWith('gather:') &&
        (authoritativePlayer?.scene === 'forest'
          ? authoritative?.scene?.phase === 'active'
          : authoritativePlayer &&
            authoritative?.training?.phase === 'active' &&
            inTrainingZone(authoritativePlayer));
      const label =
        local &&
        authoritativePlayer &&
        authoritativePlayer.hitpoints > 0 &&
        !blocked() &&
        !hideGatheringHint
          ? (signal.current?.name ?? '')
          : '';
      if (element.dataset.interactionPrompt !== label) element.dataset.interactionPrompt = label;
      if (local && label) drawInteractionPrompt(ctx, local.x, local.y, label);
    };
    let nearby = authoritativePlayer
      ? nearbyInteraction(
          authoritativePlayer,
          authoritative?.scene?.phase === 'ended',
          authoritative?.scene?.portals,
          authoritative?.npcs,
        )
      : null;
    nearby = partyInteraction(authoritative, authoritativePlayer) ?? nearby;
    if (!nearby && authoritativePlayer) {
      const node = nearbyResource(
        authoritativePlayer,
        authoritative?.resources,
        authoritative?.serverNow ?? 0,
      );
      if (node)
        nearby = { id: `gather:${node.id}`, name: `Gather ${node.kind}`, x: node.x, y: node.y };
    }
    const updateGatherDiagnostics = () => {
      element.dataset.resource = signal.current?.id.startsWith('gather:')
        ? signal.current.id.slice(7)
        : '';
      element.dataset.depletedResources = String(
        Object.values(view?.resources ?? {}).filter((state) => state.remaining === 0).length,
      );
      element.dataset.resourceHealth = String(
        view?.resources?.[element.dataset.resource]?.remaining ?? '',
      );
    };
    const outlines = () => {
      const highlighted = highlightInteractions;
      for (const target of targets) target.highlighted = highlighted;
      return highlighted ? targets : hovered ? [hovered] : [];
    };
    return {
      draw: drawPrompt,
      outlines,
      select: (
        next: InteractionTarget[],
        point: { x: number; y: number } | undefined,
        cats?: readonly InteractionTarget[],
      ) => {
        targets = next;
        hovered = pickInteraction(targets, point);
        signal.current = hovered
          ? interactionInRange(hovered, authoritativePlayer)
            ? hovered.source
            : hovered.source.id.startsWith('gather:')
              ? nearby
              : null
          : (nearby ??
            cats?.find((cat) => interactionInRange(cat, authoritativePlayer))?.source ??
            null);
        if (nearby && !nearby.id.startsWith('gather:') && signal.current?.id.startsWith('gather:'))
          signal.current = nearby;
        updateGatherDiagnostics();
        element.dataset.interactionTarget = hovered?.source.id ?? '';
        element.dataset.interactionRange = hovered
          ? String(interactionInRange(hovered, authoritativePlayer))
          : '';
      },
    };
  }
}
