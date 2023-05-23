declare module 'leb' {
  // https://www.npmjs.com/package/leb
  export function encodeInt32(num: Number): Uint8Array;

  // Takes a bigint-style buffer representing a signed integer, returning the signed LEB128 representation of it.
  export function encodeUInt32(num: Number): Uint8Array;

  export function decodeInt32(
    input: Buffer | Uint8Array,
    offset: number
  ): {
    value: number;
    nextIndex: number;
  };
}
