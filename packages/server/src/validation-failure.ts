export type ValidationFailure =
  | 'missing_body'
  | 'response_too_large'
  | 'invalid_json'
  | 'incomplete'
  | 'missing_text'
  | 'empty_text'
  | 'text_too_long'
  | 'control_characters';
