# Shared rules

Read [the package guide](README.md) and the relevant existing gameplay spec.
Keep definitions serializable, entity state mutable, and presentation separate.
Keep browser, database and server transport code outside common. Use the collection
membership API so the same kernels work with authoritative ECS and prediction
snapshots. Preserve wrapped geometry and forest/training parity. Validate content
references, run affected rule tests, and report actual checks.
