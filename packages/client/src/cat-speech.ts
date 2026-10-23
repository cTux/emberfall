/** Local, bounded by the village's cats; no timers or shared chat state. */
export class CatSpeech {
  private readonly responses = new Map<string, { at: number; text: string }>();

  pet(id: string, now: number) {
    const previous = this.responses.get(id);
    if (previous && now - previous.at < 2000) return;
    this.responses.set(id, {
      at: now,
      text: previous?.text === 'purrr' ? 'meow' : 'purrr',
    });
  }

  message(id: string, now: number) {
    const response = this.responses.get(id);
    return response && now - response.at < 2000 ? response.text : undefined;
  }
}
