import { schema, t, type SchemaType } from '@colyseus/schema';

export const EntityState = schema(
  {
    x: t.float64(),
    y: t.float64(),
    angle: t.float64(),
    attackAngle: t.float64(),
    inputSeq: t.float64(),
    inputElapsed: t.float64(),
    inputAt: t.float64(),
    fields: t.uint8(),
    order: t.uint16(),
    payload: t.string(),
  },
  'EntityState',
);

export type EntityState = SchemaType<typeof EntityState>;
