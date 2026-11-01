import { PixiContext } from '../packages/client/src/rendering/pixi-context';
import { playerCutoutRuns } from '../packages/client/src/rendering/player-cutout';

export async function cutoutPixels() {
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  const pixi = new PixiContext(canvas);
  await pixi.ready;
  const pose = document.createElement('canvas');
  pose.width = pose.height = 48;
  const art = pose.getContext('2d')!;
  art.fillStyle = '#ff8800';
  art.fillRect(18, 2, 12, 12);
  art.fillRect(14, 14, 20, 18);
  art.fillRect(14, 32, 8, 14);
  art.fillRect(26, 32, 8, 14);
  const wall = document.createElement('canvas');
  wall.width = wall.height = 180;
  wall.getContext('2d')!.fillStyle = '#993322';
  wall.getContext('2d')!.fillRect(0, 0, 180, 180);
  const samples: Record<string, number[][]> = {};
  const points = [
    [104, 61],
    [104, 60],
    [97, 64],
    [96, 64],
    [79, 52],
    [104, 68],
    [93, 90],
  ];
  const capture = (name: string, scale = 1, tx = 0, ty = 0) => {
    pixi.present();
    const image = document.createElement('canvas');
    image.width = canvas.width;
    image.height = canvas.height;
    const output = image.getContext('2d')!;
    output.drawImage(canvas, 0, 0);
    image.dataset.preview = name;
    document.body.append(image);
    samples[name] = points.map(([x, y]) => {
      return [...output.getImageData(x * scale + tx, y * scale + ty, 1, 1).data];
    });
  };

  const frame = (scale = 1, tx = 0, ty = 0) => {
    pixi.resize(256 * scale, 200 * scale);
    pixi.begin();
    pixi.fillStyle = '#337744';
    pixi.fillRect(0, 0, canvas.width, canvas.height);
    pixi.setTransform(scale, 0, 0, scale, tx, ty);
  };

  const draw = () => {
    pixi.drawImage(pose, 80, 60);
    pixi.occlusion = true;
    pixi.drawImage(wall, 30, 20);
    // Multiple overlapping foreground objects must preserve the same hole.
    pixi.drawImage(wall, 40, 20);
    pixi.occlusion = false;
    pixi.fillStyle = '#2266ff';
    pixi.fillRect(85, 56, 35, 2);
  };

  frame();
  pixi.setPlayerCutout(pose, 80, 60, 48, 48);
  draw();
  capture('silhouette');
  frame(2, 11, 7);
  pixi.setPlayerCutout(pose, 80, 60, 48, 48);
  // The inverse stencil must compose with existing portal/particle clipping.
  pixi.save();
  pixi.beginPath();
  pixi.moveTo(20, 10);
  pixi.lineTo(230, 10);
  pixi.lineTo(230, 180);
  pixi.lineTo(20, 180);
  pixi.closePath();
  pixi.clip();
  draw();
  pixi.restore();
  capture('camera-and-clip', 2, 11, 7);
  frame();
  pixi.setPlayerCutout(pose, 140, 60, 48, 48);
  draw();
  capture('moved');
  frame();
  // With no player configured this frame, pooled objects must lose the hole.
  draw();
  capture('no-player');
  frame();
  pixi.setPlayerCutout(pose, 80, 60, 48, 48);
  pixi.occlusion = true;
  pixi.save();
  pixi.occlusion = false;
  pixi.drawImage(wall, 30, 20);
  pixi.restore();
  pixi.drawImage(wall, 30, 20);
  capture('background-preserved');
  const cached = playerCutoutRuns(pose, 48, 48) === playerCutoutRuns(pose, 48, 48);
  pixi.destroy();

  return { samples, cached };
}
