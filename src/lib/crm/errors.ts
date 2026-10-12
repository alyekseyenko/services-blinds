export class CRMError extends Error {
  constructor(
    public message: string,
    public originalError?: unknown,
    public status?: number
  ) {
    super(message);
    this.name = "CRMError";
  }
}
