// Standard WebSocket normal closure; Colyseus uses its own application leave code.
export const NORMAL_CLOSE = 1000;
// Standard local-only abnormal closure sentinel; never transmit it in a close frame.
export const ABNORMAL_CLOSE = 1006;
// Standard policy violation: reject invalid credentials, flooding or capacity overflow.
export const POLICY_VIOLATION = 1008;
// Preserve the Colyseus consented-leave code used to distinguish intentional departures.
export const CONSENTED_LEAVE = 4000;
// Map abnormal closure to the existing transmittable application code.
export const CONNECTION_LOST = 4001;
// Preserve the application's incompatible-protocol code for clients that must reload.
export const INCOMPATIBLE_PROTOCOL = 4002;
