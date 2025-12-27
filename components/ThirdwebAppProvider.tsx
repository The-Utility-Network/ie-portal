"use client";

import React from 'react';
import { ThirdwebProvider } from 'thirdweb/react';

export default function ThirdwebAppProvider({ children }: { children: React.ReactNode }) {
  return <ThirdwebProvider>{children}</ThirdwebProvider>;
}


