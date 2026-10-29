/** Compile-time exhaustiveness check: calling this with anything but `never` is a type error. */
export function assertNever(value: never, message = 'Unexpected value'): never {
  throw new Error(`${message}: ${JSON.stringify(value)}`)
}
