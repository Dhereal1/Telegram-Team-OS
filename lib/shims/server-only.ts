// Shim for the `server-only` marker when running outside Next.js (e.g. `tsx` workers).
// Next.js uses `server-only` as a compile-time guard; executing the actual package in Node throws.
export {};
