import { EntityState } from './entity-state.ts';
import { schema, t, type SchemaType } from '@colyseus/schema';

export const SessionState = schema(
  { header: t.string(), entities: t.map(EntityState), serverNow: t.float64() },
  'SessionState',
);

export type SessionState = SchemaType<typeof SessionState>;
