'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useActiveAccount, ConnectButton, darkTheme } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { base } from "thirdweb/chains";
import {
    ChatBubbleLeftRightIcon,
    CurrencyDollarIcon,
    BeakerIcon,
    GlobeAltIcon,
    BookOpenIcon,
    MicrophoneIcon,
    DocumentTextIcon,
    ShieldExclamationIcon,
    SparklesIcon
} from "@heroicons/react/24/outline";

// Define Utility Monochrome constant
const UTILITY_MONO = '#ffffff';

const client = createThirdwebClient({
    clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT as string,
});

interface PortalHUDProps {
    onNavigate: (view: string) => void;
    currentView: string;
}

const PortalHUD: React.FC<PortalHUDProps> = ({ onNavigate, currentView }) => {
    const account = useActiveAccount();
    const [time, setTime] = useState<string>('');
    const [medallionOpen, setMedallionOpen] = useState(false);
    const medallionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const tick = () => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, []);

    // Close medallion menu on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (medallionRef.current && !medallionRef.current.contains(event.target as Node)) {
                setMedallionOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const navItems = [
        { id: 'Diamond Viewer', icon: GlobeAltIcon, label: 'NET' },
        { id: 'Chat', icon: ChatBubbleLeftRightIcon, label: 'CHAT' },
        { id: 'Directory', icon: BeakerIcon, label: 'DIR' },
        { id: 'Learn', icon: BookOpenIcon, label: 'LEARN' },
        { id: 'Buy', icon: CurrencyDollarIcon, label: 'BUY' },
        { id: 'Reserve', icon: ShieldExclamationIcon, label: 'RES' }, // Changed from Blacklist/OPS
        { id: 'Mythology', icon: SparklesIcon, label: 'LORE' },
    ];

    const socialLinks = [
        { label: 'COLLECTION', url: 'https://invisibleenemiesofficial.io', icon: GlobeAltIcon },
        { label: 'WHITEPAPER', url: 'https://invisibleenemiesofficial.io', icon: DocumentTextIcon },
        { label: 'ABOUT US', url: 'https://invisibleenemiesofficial.io', icon: MicrophoneIcon },
    ];

    return (
        <>
            {/* TOP STATUS BAR */}
            <div className="fixed top-0 left-0 w-full z-[2000] px-3 md:px-6 py-2 flex justify-between items-center pointer-events-none">
                {/* Left: System Status */}
                <div className="flex items-center space-x-2 md:space-x-4 pointer-events-auto">
                    <div className="flex flex-col">
                        <span className="hidden md:block text-xs font-mono text-white tracking-widest opacity-80">SYS.ONLINE</span>
                        <span className="text-sm md:text-md font-bold text-white tracking-widest font-mono">IE<span className="text-purple-400">{'//'}</span>PORTAL</span>
                    </div>
                </div>

                {/* Right: Wallet & Time */}
                <div className="flex items-center space-x-2 md:space-x-6 pointer-events-auto">
                    <div className="hidden md:block text-xs font-mono text-white tracking-wider">
                        {time}
                    </div>
                    <div id="portal-connect-wrapper">
                        <ConnectButton
                            client={client}
                            wallets={[
                                inAppWallet({
                                    auth: {
                                        options: [
                                            "google", "discord", "telegram", "farcaster", "email",
                                            "x", "passkey", "phone", "twitch", "github", "steam",
                                            "coinbase", "line", "apple", "facebook", "guest", "tiktok"
                                        ],
                                    },
                                }),
                                createWallet("io.rabby"),
                                createWallet("io.metamask"),
                                createWallet("com.coinbase.wallet"),
                                createWallet("me.rainbow"),
                                createWallet("io.zerion.wallet"),
                            ]}
                            chain={base}
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
                                titleIcon: '/Medallions/IE.png',
                                welcomeScreen: {
                                    title: 'Welcome to Invisible Enemies',
                                    subtitle: 'Connect your wallet to proceed',
                                    img: {
                                        src: '/Medallions/IE.png',
                                        width: 150,
                                        height: 150,
                                    },
                                },
                                showThirdwebBranding: false,
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* BOTTOM DOCK */}
            <div className="fixed bottom-[env(safe-area-inset-bottom,16px)] md:bottom-8 left-1/2 transform -translate-x-1/2 z-[2000] pointer-events-auto max-w-[95vw] pb-2 md:pb-0">
                {/* 
                     Added overflow-x-auto for horizontal scrolling on mobile. 
                     Added scrollbar-hide (assuming typical Tailwind plugin or global style).
                */}
                <div className="flex items-center space-x-1 md:space-x-2 px-2 md:px-6 py-2 md:py-3 bg-purple-900/40 backdrop-blur-xl border border-purple-500/30 rounded-full shadow-[0_0_30px_rgba(127,44,255,0.2)] overflow-x-auto no-scrollbar">

                    {/* MEDALLION MENU */}
                    <div className="relative mr-1 md:mr-2 flex-shrink-0" ref={medallionRef}>
                        {medallionOpen && (
                            <div className="absolute bottom-full left-0 mb-4 w-40 bg-black/90 border border-white/30 rounded-lg p-2 backdrop-blur-md animate-in slide-in-from-bottom-2 fade-in duration-200">
                                <div className="space-y-1">
                                    {socialLinks.map((link) => (
                                        <a
                                            key={link.label}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block px-3 py-2 text-xs font-mono text-gray-300 hover:text-black hover:bg-white rounded transition-colors flex items-center justify-between group"
                                        >
                                            {link.label}
                                            <link.icon className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                                        </a>
                                    ))}
                                </div>
                                {/* Decorative pointer */}
                                <div className="absolute -bottom-1 left-6 w-2 h-2 bg-black/90 border-r border-b border-white/30 transform rotate-45"></div>
                            </div>
                        )}

                        <button
                            onClick={() => setMedallionOpen(!medallionOpen)}
                            className="pr-2 md:pr-4 border-r border-white/10 flex items-center transition-opacity hover:opacity-80 outline-none"
                        >
                            <img
                                src="/Medallions/IE.png"
                                alt="IE Medallion"
                                className="w-8 h-8 md:w-10 md:h-10 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] animate-pulse-slow max-w-[40px] max-h-[40px]"
                                style={{ width: '40px', height: '40px' }}
                            />
                        </button>
                    </div>

                    {navItems.map((item) => {
                        const isActive = currentView === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onNavigate(item.id)}
                                className={`group relative flex-shrink-0 flex flex-col items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-lg transition-all duration-300 ${isActive
                                    ? 'bg-white/20 border border-white/50 shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                                    : 'hover:bg-white/5 border border-transparent hover:border-white/10'
                                    }`}
                            >
                                <item.icon className={`w-4 h-4 md:w-5 md:h-5 mb-0.5 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                                <span className={`text-[8px] md:text-[9px] font-mono tracking-wider ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>
                                    {item.label}
                                </span>

                                {/* Active Indicator */}
                                {isActive && (
                                    <div className="absolute -bottom-1 w-1/2 h-[2px] bg-white shadow-[0_0_8px_#ffffff]" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* DECORATIVE HUD LINES */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-12 left-6 w-[200px] h-[1px] bg-gradient-to-r from-white/20 to-transparent" />
                <div className="absolute top-12 right-6 w-[200px] h-[1px] bg-gradient-to-l from-white/20 to-transparent" />
                <div className="absolute bottom-12 left-6 w-[100px] h-[1px] bg-gradient-to-r from-white/20 to-transparent" />
                <div className="absolute bottom-12 right-6 w-[100px] h-[1px] bg-gradient-to-l from-white/20 to-transparent" />
            </div>
        </>
    );
};

export default PortalHUD;
