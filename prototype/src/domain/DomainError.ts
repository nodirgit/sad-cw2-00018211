/**
 * Raised when a business rule refuses an action (e.g. FR-05: no sale while the
 * cross-check is pending). The presentation layer shows the message to the user.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}
