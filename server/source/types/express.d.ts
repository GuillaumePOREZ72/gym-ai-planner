// Augment Express Request type to include authenticated userId.
// The `export {}` makes this a module, required for proper namespace augmentation.
export {};

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}
