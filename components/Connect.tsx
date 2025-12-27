'use client';

import { useSetActiveWallet, ConnectButton, darkTheme } from 'thirdweb/react';
import { createWallet, inAppWallet, walletConnect } from 'thirdweb/wallets';
import { useEffect, useState } from 'react';
import { createThirdwebClient } from 'thirdweb';
import { base } from 'thirdweb/chains';

const wallets = [
  inAppWallet({
    auth: {
      options: [
        "google",
        "discord",
        "telegram",
        "farcaster",
        "email",
        "x",
        "passkey",
        "phone",
        "github",
        "steam",
        "twitch",
        "line",
        "apple",
        "facebook",
        "tiktok",
        "coinbase",
      ],
    },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("io.rabby"),
  createWallet("com.trustwallet.app"),
  createWallet("global.safe"),
];

export default function Wallet() {
  const setActiveAccount = useSetActiveWallet();
  const [walletAddress, setWalletAddress] = useState(null);
  const [client, setClient] = useState<any>(null);

  // Create client in-browser from server-provided clientId
  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch('/api/thirdweb/client', { cache: 'no-store' });
        const json = await resp.json();
        if (json?.clientId) {
          setClient(createThirdwebClient({ clientId: json.clientId }));
        }
      } catch (e) {
        console.error('Error creating thirdweb client:', e);
      }
    })();
  }, []);

  const handleConnect = async (account: any) => {
    await setActiveAccount(account);
    setWalletAddress(account);
  };

  if (!client) {
    return <div>Loading...</div>; // Add a loading state while the client is being fetched
  }

  return (
    <ConnectButton
      client={client}
      wallets={wallets}
      accountAbstraction={{
        chain: base,
        sponsorGas: true,
      }}
      theme={darkTheme({
        colors: {
          accentText: '#7f2cff',
          accentButtonBg: '#7f2cff',
          primaryButtonBg: '#7f2cff',
          primaryButtonText: '#ffffff',
          secondaryButtonBg: 'rgba(127, 44, 255, 0.2)',
          secondaryButtonHoverBg: 'rgba(127, 44, 255, 0.4)',
          secondaryButtonText: '#ffffff',
          secondaryText: '#c4b5fd',
          modalBg: 'rgba(10, 5, 25, 0.95)',
          connectedButtonBg: 'rgba(127, 44, 255, 0.3)',
          borderColor: 'rgba(127, 44, 255, 0.4)',
          separatorLine: 'rgba(127, 44, 255, 0.2)',
          selectedTextBg: '#7f2cff',
          tooltipBg: '#1a0035',
          tooltipText: '#ffffff',
          skeletonBg: 'rgba(127, 44, 255, 0.1)',
          tertiaryBg: 'rgba(127, 44, 255, 0.15)',
          inputAutofillBg: 'rgba(127, 44, 255, 0.1)',
        },
      })}
      connectModal={{
        size: 'wide',
        titleIcon:
          'https://storage.googleapis.com/tgl_cdn/images/Medallions/IE.png',
        welcomeScreen: {
          title: 'Mint an RWA today!',
          subtitle: 'Connect a wallet to build your portfolio',
          img: {
            src: 'https://storage.googleapis.com/tgl_cdn/images/Medallions/IE.png',
            width: 150,
            height: 150,
          },
        },
        showThirdwebBranding: false,
      }}
      onConnect={handleConnect}
    />
  );
}
