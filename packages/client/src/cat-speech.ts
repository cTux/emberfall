const responses = ['Purrr', 'Meow', 'Mrrp', 'Mew', 'Prrrt', 'Mrrrow'];

/** Local, bounded by the village's cats; no timers or shared chat state. */
export class CatSpeech {
  private readonly responses = new Map<string, { at: number; text: string; index: number }>();

  pet(id: string, now: number) {
    const previous = this.responses.get(id);
    if (previous && now - previous.at < 2000) return;
    const index = previous ? (previous.index + 1) % responses.length : 0;
    const text = responses[index];
    this.responses.set(id, {
      at: now,
      text,
      index,
    });
    return text;
  }

  message(id: string, now: number) {
    const response = this.responses.get(id);
    return response && now - response.at < 2000 ? response.text : undefined;
  }
}
