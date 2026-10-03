# Communication and task progress

Lead with the answer and use plain language without losing technical accuracy.

After every intermediate agent message, append a separate final line in exactly this format:

`Finished: N%, ETA: M(h/m/s)`

Replace N with approximate task completion and M(h/m/s) with time remaining using h, m or s, for example `Finished: 40%, ETA: 5m`. Keep the line immediately after the message text and update both estimates as work progresses.

For each main Codex task, keep its sidebar title synchronized. The text after an existing leading `[N%, M]` or `[APPROVE]` prefix is the base title. Immediately after each intermediate message, call `set_thread_title` for the current task with `[N%, M] Base title`, using the same N and M as the Finished line. Replace the prior prefix rather than stacking prefixes.

When user approval is required, use `[APPROVE] Base title`. After approval or when it is no longer pending, resume the estimate prefix. Before the final response for completed work, remove only the leading status prefix and keep the current base title unchanged.

Subagents do not rename the parent task; the main agent updates it when reporting their progress. If `set_thread_title` is unavailable, leave the title unchanged rather than using a workaround. These communication rules apply to all tasks in this repository.
