// src/utils/createThirdwebClient.ts (this is a server-side utility)

import { createThirdwebClient } from "thirdweb";

// This utility will only be executed server-side
export const getThirdwebClient = () => {
  // Prefer server-side secret key when available
  const secretKey = process.env.THIRDWEB_SECRET_KEY;
  if (secretKey) {
    return createThirdwebClient({ secretKey });
  }
  // Fallback to clientId for environments that haven't set a secret key yet
  const clientId = process.env.THIRDWEB_CLIENT_ID || process.env.NEXT_PUBLIC_THIRDWEB_CLIENT;
  if (!clientId) {
    throw new Error('THIRDWEB_SECRET_KEY or THIRDWEB_CLIENT_ID must be configured on the server');
  }
  return createThirdwebClient({ clientId });
};