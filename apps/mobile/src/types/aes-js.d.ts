// Minimal typing for the subset of `aes-js` we use (AES-CTR + hex/utf8 utils)
// in the Supabase LargeSecureStore adapter. aes-js ships no types and has a
// stable API; a local declaration avoids an extra @types dependency.
declare module "aes-js" {
  class Counter {
    constructor(initialValue?: number);
  }

  namespace ModeOfOperation {
    class ctr {
      constructor(key: Uint8Array, counter: Counter);
      encrypt(bytes: Uint8Array): Uint8Array;
      decrypt(bytes: Uint8Array): Uint8Array;
    }
  }

  namespace utils {
    namespace utf8 {
      function toBytes(text: string): Uint8Array;
      function fromBytes(bytes: Uint8Array): string;
    }
    namespace hex {
      function fromBytes(bytes: Uint8Array): string;
      function toBytes(text: string): Uint8Array;
    }
  }

  const _default: {
    Counter: typeof Counter;
    ModeOfOperation: typeof ModeOfOperation;
    utils: typeof utils;
  };
  export default _default;
}
