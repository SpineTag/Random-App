export type Rng = {
  next(): number; // 0..1
  int(minInclusive: number, maxInclusive: number): number;
  pick<T>(arr: readonly T[]): T;
};

// Mulberry32 PRNG: small, fast, deterministic.
export function createRng(seed: number): Rng {
  let t = seed >>> 0;
  const next = () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int(minInclusive, maxInclusive) {
      const r = next();
      return minInclusive + Math.floor(r * (maxInclusive - minInclusive + 1));
    },
    pick(arr) {
      if (arr.length === 0) throw new Error("pick() from empty array");
      return arr[Math.floor(next() * arr.length)];
    },
  };
}

export function hashSeedFromString(s: string): number {
  // FNV-1a 32-bit
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

