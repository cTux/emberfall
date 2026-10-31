import { Matrix, type Graphics } from 'pixi.js';
import { Gradient, type Paint } from './paints';

type State = {
  imageSmoothingEnabled: boolean;
  matrix: Matrix;
  fillStyle: Paint;
  strokeStyle: Paint;
  globalAlpha: number;
  occlusion: boolean;
  globalCompositeOperation: string;
  lineWidth: number;
  lineJoin: CanvasLineJoin;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  shadowBlur: number;
  shadowColor: string;
  spriteTint: string;
  shadowOffsetY: number;
  mask: Graphics | null;
  dash: number[];
};

/** Shared drawing state for the command adapter; reset once per rendered frame. */
export class DrawingState {
  private metrics = document.createElement('canvas').getContext('2d')!;
  fontFamily = '"Alegreya Sans", sans-serif';
  protected state: State = this.defaults();
  protected drawMatrix = new Matrix();
  private stack: State[] = [];
  private stackDepth = 0;

  protected resetState() {
    this.state = this.defaults();
    this.stackDepth = 0;
  }

  get imageSmoothingEnabled() {
    return this.state.imageSmoothingEnabled;
  }

  set imageSmoothingEnabled(value: boolean) {
    this.state.imageSmoothingEnabled = value;
  }

  private defaults(): State {
    return {
      imageSmoothingEnabled: false,
      matrix: new Matrix(),
      fillStyle: '#000',
      strokeStyle: '#000',
      globalAlpha: 1,
      occlusion: false,
      globalCompositeOperation: 'source-over',
      lineWidth: 1,
      lineJoin: 'miter',
      font: '10px sans-serif',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      shadowBlur: 0,
      spriteTint: '#ffffff',
      shadowColor: 'transparent',
      shadowOffsetY: 0,
      mask: null,
      dash: [],
    };
  }

  get occlusion() {
    return this.state.occlusion;
  }

  set occlusion(enabled: boolean) {
    this.state.occlusion = enabled;
  }

  save() {
    const saved = (this.stack[this.stackDepth++] ??= this.defaults());
    this.copyState(saved, this.state);
  }

  restore() {
    if (this.stackDepth) {
      this.copyState(this.state, this.stack[--this.stackDepth]);
    }
  }

  private copyState(target: State, source: State) {
    const matrix = target.matrix;
    Object.assign(target, source);
    target.matrix = matrix.copyFrom(source.matrix);
  }

  setTransform(a: number, b: number, c: number, d: number, e: number, f: number) {
    this.state.matrix.set(a, b, c, d, e, f);
  }

  resetTransform() {
    this.state.matrix.identity();
  }

  getTransform() {
    const m = this.state.matrix;

    return new DOMMatrix([m.a, m.b, m.c, m.d, m.tx, m.ty]);
  }

  transform(a: number, b: number, c: number, d: number, e: number, f: number) {
    this.state.matrix.append(this.drawMatrix.set(a, b, c, d, e, f));
  }

  translate(x: number, y: number) {
    this.transform(1, 0, 0, 1, x, y);
  }

  scale(x: number, y: number) {
    this.transform(x, 0, 0, y, 0, 0);
  }

  rotate(angle: number) {
    this.transform(Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0);
  }

  setLineDash(values: number[]) {
    this.state.dash = [...values];
  }

  get fillStyle() {
    return this.state.fillStyle;
  }

  set fillStyle(v: Paint) {
    this.state.fillStyle = v;
  }

  get strokeStyle() {
    return this.state.strokeStyle;
  }

  set strokeStyle(v: Paint) {
    this.state.strokeStyle = v;
  }

  get spriteTint() {
    return this.state.spriteTint;
  }

  set spriteTint(value: string) {
    this.state.spriteTint = value;
  }

  get globalAlpha() {
    return this.state.globalAlpha;
  }

  set globalAlpha(v: number) {
    this.state.globalAlpha = v;
  }

  get globalCompositeOperation() {
    return this.state.globalCompositeOperation;
  }

  set globalCompositeOperation(v: string) {
    this.state.globalCompositeOperation = v;
  }

  get lineWidth() {
    return this.state.lineWidth;
  }

  set lineWidth(v: number) {
    this.state.lineWidth = v;
  }

  get lineJoin() {
    return this.state.lineJoin;
  }

  set lineJoin(v: CanvasLineJoin) {
    this.state.lineJoin = v;
  }

  get font() {
    return this.state.font;
  }

  set font(v: string) {
    this.state.font = v.replace('"Alegreya Sans", sans-serif', this.fontFamily);
  }

  get textAlign() {
    return this.state.textAlign;
  }

  set textAlign(v: CanvasTextAlign) {
    this.state.textAlign = v;
  }

  get textBaseline() {
    return this.state.textBaseline;
  }

  set textBaseline(v: CanvasTextBaseline) {
    this.state.textBaseline = v;
  }

  get shadowBlur() {
    return this.state.shadowBlur;
  }

  set shadowBlur(v: number) {
    this.state.shadowBlur = v;
  }

  get shadowColor() {
    return this.state.shadowColor;
  }

  set shadowColor(v: string) {
    this.state.shadowColor = v;
  }

  get shadowOffsetY() {
    return this.state.shadowOffsetY;
  }

  set shadowOffsetY(v: number) {
    this.state.shadowOffsetY = v;
  }

  createLinearGradient(x0: number, y0: number, x1: number, y1: number) {
    return new Gradient({
      type: 'linear',
      textureSpace: 'global',
      start: { x: x0, y: y0 },
      end: { x: x1, y: y1 },
    });
  }

  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number) {
    return new Gradient({
      type: 'radial',
      textureSpace: 'global',
      center: { x: x0, y: y0 },
      innerRadius: r0,
      outerCenter: { x: x1, y: y1 },
      outerRadius: r1,
    });
  }

  measureText(value: string) {
    this.metrics.font = this.state.font;

    return this.metrics.measureText(value);
  }
}
