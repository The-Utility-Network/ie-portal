// src/utils/getReservoirApiKey.ts (Server-side utility)
export const getReservoirApiKey = () => {
    const key = process.env.NEXT_PUBLIC_RESERVOIR_API_KEY;
    if (!key) {
      throw new Error("RESERVOIR_API_KEY environment variable is not set.");
    }
    return key;
  };  