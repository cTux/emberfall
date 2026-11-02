import type { ValidationFailure } from './validation-failure.ts';

export class InvalidDialogueResponse extends Error {
  readonly failure: ValidationFailure;

  constructor(failure: ValidationFailure) {
    super(failure);
    this.failure = failure;
  }
}
