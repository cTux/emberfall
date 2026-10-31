import { updateFrameDiagnostics } from './arena-frame-diagnostics';
import type { ArenaProps } from './arena-contract';
import { ArenaPresentation } from './arena-presentation';
import { InteractionPresentation, forestInteractionTargets } from './interaction-presentation';
import { VillageScene } from './village-scene';

import { FrameBudget } from './frame-budget';
import { createPresentationInput } from './arena-presentation-input';

import { useArenaState } from './useArenaState';
import { drawLootHints } from './loot-hint-rendering';

import { useChat } from './ChatProvider';

import { sceneryInteraction } from './interaction-targets';

import { PixiContext } from './rendering/pixi-context';

import { villageImages } from './village-background';
import { characterImages } from './characters';

import { actorArt } from './art';

import { useEffect, useRef } from 'react';
import { useTheme } from '@mui/material';

import { forestRenderer } from './forest';

export function useArenaRenderer(props: ArenaProps) {
  const { playerId, interaction, onCursorAim, onHitpoints } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  const { reportError } = useChat();
  const selectedFont = useTheme().typography.fontFamily ?? 'sans-serif';
  const {
    lootHints,
    latest,
    receivedAt,
    sender,
    activate,
    catSpoke,
    quality,
    prefs,
    fontFamily,
    frameRate,
    networkTiming,
  } = useArenaState(props, selectedFont);
  useEffect(() => {
    const element = canvas.current!;
    const renderer = new PixiContext(element);
    let disposed = false;
    void renderer.ready.catch(() => {
      if (!disposed) {
        reportError(
          'The game renderer could not start. Enable browser hardware acceleration and reload.',
        );
      }
    });
    const presentation = new ArenaPresentation(
      playerId,
      (message) => {
        return sender.current(message);
      },
      () => {
        return prefs.current;
      },
      onHitpoints,
    );
    const ctx = renderer;
    const knight = characterImages.warrior.walk;
    const { nature } = villageImages;
    const skeleton = actorArt('skeleton');
    const drawForest = forestRenderer(nature, knight, skeleton);
    const input = createPresentationInput(element, playerId, presentation, {
      latest,
      prefs,
      sender,
      activate,
    });
    onCursorAim(input.currentAim);
    const village = new VillageScene(playerId, (text) => {
      return catSpoke.current(text);
    });
    let frame = 0;
    const prompts = new InteractionPresentation({
      element,
      signal: interaction,
      playerId,
      send: (message) => {
        return sender.current(message);
      },
      blocked: input.blocked,
    });
    let wardrobeOpenedAt = 0;
    let wardrobeActive = false;
    const resize = () => {
      const ratio = Math.min(devicePixelRatio * quality.current.resolution * budget.scale, 3);
      renderer.resize(Math.round(innerWidth * ratio), Math.round(innerHeight * ratio));
    };

    const budget = new FrameBudget(quality.current, performance.now(), resize);
    resize();
    window.addEventListener('resize', resize);
    let previousScene: string | undefined;

    function draw(now: number) {
      const openWardrobe = interaction.current?.id === 'wardrobe';

      if (openWardrobe && !wardrobeActive) {
        wardrobeOpenedAt = now;
      }

      wardrobeActive = openWardrobe;

      if (!renderer.initialized) {
        frame = requestAnimationFrame(draw);

        return;
      }

      const delta = budget.begin(now, quality.current);

      if (delta === undefined) {
        frame = requestAnimationFrame(draw);

        return;
      }

      element.dataset.lootHintCount = '0';
      renderer.begin();
      renderer.fontFamily = fontFamily.current;
      ctx.imageSmoothingEnabled = quality.current.smoothTextures;
      // Sprite filtering is independent; CSS resampling must preserve smooth text.
      const imageRendering = 'auto';

      if (element.style.imageRendering !== imageRendering) {
        element.style.imageRendering = imageRendering;
      }

      const el = element;
      // Keep the original view scale independent of the walkable map size.
      const scale = Math.max(el.width / 960, el.height / 640);

      if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
        input.clearKeys();
      }

      const presented = presentation.render(
        latest.current,
        now,
        input,
        { width: el.width / scale, height: el.height / scale },
        prefs.current,
      );
      const { view, local, cycle } = presented;
      renderer.ambientTint = cycle.tint;
      renderer.directionalShadow = cycle.shadow;
      updateFrameDiagnostics(element, presented);
      networkTiming.current = presented.timing;
      const highlightInteractions = now - input.altHeldAt > 500 && !input.blocked();
      const interactionFrame = prompts.frame({
        ctx,
        authoritative: latest.current,
        view,
        local,
        now,
        receivedAt: receivedAt.current,
        hideGatheringHintInCombat: prefs.current.hideGatheringHintInCombat,
        highlightInteractions,
      });
      input.targets = forestInteractionTargets(view, local, input.camera);
      interactionFrame.select(input.targets, input.pointerPoint());

      if (local?.scene !== previousScene) {
        village.clear();
        previousScene = local?.scene;
      }

      const fps = budget.sample(now);

      if (fps !== undefined) {
        frameRate.current = fps;
      }

      presentation.effects(presented, now);

      if (!view || local?.scene === 'forest') {
        element.dataset.catSpeech = '';
        drawForest(
          ctx,
          view,
          playerId,
          quality.current,
          prefs.current,
          now,
          delta,
          interactionFrame.outlines(),
          highlightInteractions,
        );
        interactionFrame.draw();

        if (local && prefs.current.lootHints) {
          drawLootHints(ctx, lootHints.current.hints, local, now);
        }

        renderer.present();
        frame = requestAnimationFrame(draw);

        return;
      }

      const villageFrame = village.prepare(view, local, now, quality.current, {
        width: el.width,
        height: el.height,
        scale,
      });
      const { visibleScenery, portalTarget, cats } = villageFrame;
      Object.assign(element.dataset, villageFrame.diagnostics);
      input.targets = [
        ...visibleScenery.map(sceneryInteraction).filter((target) => {
          return target !== null;
        }),
        ...cats,
        portalTarget,
      ].sort((a, b) => {
        return a.y + a.height - b.y - b.height;
      });
      interactionFrame.select(input.targets, input.pointerPoint(), cats);
      const drawn = village.draw(ctx, villageFrame, {
        preferences: prefs.current,
        cycle,
        highlightInteractions,
        outlines: interactionFrame.outlines,
        wardrobeOpen: interaction.current?.id === 'wardrobe',
        wardrobeOpenedAt,
      });
      interactionFrame.draw();
      Object.assign(element.dataset, village.overlays(ctx, villageFrame, drawn, prefs.current));

      if (local && prefs.current.lootHints) {
        drawLootHints(ctx, lootHints.current.hints, local, now);
      }

      renderer.present();
      frame = requestAnimationFrame(draw);
    }

    frame = requestAnimationFrame(draw);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      input.dispose();
      window.removeEventListener('resize', resize);
      onCursorAim(null);

      renderer.destroy();
      presentation.dispose();
    };
  }, [
    playerId,
    interaction,
    onCursorAim,
    onHitpoints,
    reportError,
    lootHints,
    latest,
    receivedAt,
    sender,
    activate,
    catSpoke,
    quality,
    prefs,
    fontFamily,
    frameRate,
    networkTiming,
  ]);

  return { canvas, frameRate, networkTiming };
}
