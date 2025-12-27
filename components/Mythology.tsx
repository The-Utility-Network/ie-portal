'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  getContract,
  readContract,
  createThirdwebClient,
  prepareContractCall,
} from 'thirdweb';
import { useActiveWallet, useActiveAccount, useSendTransaction } from 'thirdweb/react';
import { base } from 'thirdweb/chains';
import { getDiamondAddress } from '../primitives/Diamond';
import { MythologyABI as abi } from './primitives/MythologyABI';
import {
  BookOpenIcon,
  ChevronRightIcon,
  ClockIcon,
  UserIcon,
  TagIcon,
  DocumentPlusIcon,
  ArrowPathIcon,
  SparklesIcon,
  GlobeAltIcon,
  PencilSquareIcon,
  CommandLineIcon,
  XMarkIcon,
  PhotoIcon,
  ListBulletIcon,
  LinkIcon,
  HashtagIcon,
  Cog6ToothIcon,
  ArrowsPointingOutIcon,
  AdjustmentsHorizontalIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon
} from '@heroicons/react/24/outline';

// Client Init
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT as string,
});

// Utility types
interface Story { id: string; title: string; }
interface Chapter { id: string; title: string; }
interface Section {
  id: string;
  title: string;
  body: string;
  mediaURI: string;
  timePublished: bigint;
  author: string;
  sources: string[];
  keywords: string[];
  year?: string | number;
}

export default function Mythology() {
  const [contractAddress, setContractAddress] = useState<string>('');

  // State
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);

  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);

  const [loading, setLoading] = useState(true);
  const [isPublisher, setIsPublisher] = useState(false);

  // UI State
  const [isNavOpen, setIsNavOpen] = useState(true); // Control Left Panel visibility

  // Workshop State
  const [isWorkshopOpen, setIsWorkshopOpen] = useState(false);
  const [showMetadataPanel, setShowMetadataPanel] = useState(false);
  const [workshopMode, setWorkshopMode] = useState<'STORIES' | 'CHAPTERS' | 'SECTIONS'>('SECTIONS');

  const [formData, setFormData] = useState({ title: '', body: '', mediaURI: '', sources: '', keywords: '' });

  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const account = useActiveAccount();
  const { mutate: sendTx, isPending: isTxPending } = useSendTransaction();

  // Load Address
  useEffect(() => {
    getDiamondAddress().then(setContractAddress);
  }, []);

  // Load Stories
  useEffect(() => {
    if (contractAddress) fetchStories();
  }, [contractAddress]);

  // Check Role
  useEffect(() => {
    if (account && contractAddress) {
      checkPublisherRole();
    } else {
      setIsPublisher(false);
    }
  }, [account, contractAddress]);

  // Mobile: Auto-collapse nav when selecting a section to read
  useEffect(() => {
    // Basic check for mobile width
    if (typeof window !== 'undefined' && window.innerWidth < 1024 && selectedSection) {
      setIsNavOpen(false);
    }
  }, [selectedSection]);

  const checkPublisherRole = async () => {
    // Dev Bypass
    if (process.env.NEXT_PUBLIC_PUBLISHER_DEV === 'true') {
      setIsPublisher(true);
      return;
    }

    try {
      const contract = getContract({ client, chain: base, address: contractAddress, abi });
      // Check for Commander role
      const hasRole = await readContract({
        contract,
        method: 'ieHasRole',
        params: ["Commander", account?.address as string]
      });

      setIsPublisher(hasRole as boolean);
    } catch (e) {
      console.error("Failed to check role.", e);
      setIsPublisher(false);
    }
  }

  const fetchStories = async () => {
    try {
      setLoading(true);
      const contract = getContract({ client, chain: base, address: contractAddress, abi });
      const data = await readContract({ contract, method: 'getAllStories', params: [] });

      const formatted = (data as any[]).map((s: any) => ({
        id: s.id.toString(),
        title: s.title
      }));
      setStories(formatted);

      if (formatted.length > 0 && !selectedStory) {
        handleStorySelect(formatted[0]); // Auto-select first
      }
      // No demo fallback - we'll show empty state in UI
      setLoading(false);
    } catch (e) {
      console.error("Failed to load stories", e);
      setLoading(false);
    }
  };

  const handleStorySelect = async (story: Story) => {
    setSelectedStory(story);
    // Don't clear sub-states immediately to avoid flickers if we want to cache, but for now simple:
    setSelectedChapter(null);
    setSections([]);

    // Fetch Chapters
    try {
      const contract = getContract({ client, chain: base, address: contractAddress, abi });
      const data = await readContract({ contract, method: 'getStoryChapters', params: [BigInt(story.id)] });
      const formatted = (data as any[]).map((c: any) => ({
        id: c.id.toString(),
        title: c.title
      }));
      setChapters(formatted);

      if (formatted.length > 0) {
        handleChapterSelect(formatted[0]);
      }
    } catch (e) { console.error(e); }
  };

  const handleChapterSelect = async (chapter: Chapter) => {
    setSelectedChapter(chapter);

    try {
      const contract = getContract({ client, chain: base, address: contractAddress, abi });
      const data = await readContract({ contract, method: 'getChapterSections', params: [BigInt(chapter.id)] });
      const formatted = (data as any[]).map((s: any) => ({
        ...s,
        id: s.id.toString(),
        year: s.timePublished ? new Date(Number(s.timePublished) * 1000).getFullYear() : 'Unknown'
      }));
      setSections(formatted);
      if (formatted.length > 0) setSelectedSection(formatted[0]);
    } catch (e) { console.error(e); }
  };

  // --- WORKSHOP LOGIC ---
  const toggleWorkshop = () => {
    setIsWorkshopOpen(!isWorkshopOpen);
    if (!isWorkshopOpen) {
      // Reset form when opening
      setFormData(prev => ({ ...prev, title: '', body: '' }));
      // Default logic: if viewing a section, go to SECTIONS mode and populate
      if (selectedSection) {
        setWorkshopMode('SECTIONS');
        setFormData({
          title: selectedSection.title,
          body: selectedSection.body,
          mediaURI: selectedSection.mediaURI,
          sources: selectedSection.sources.join(', '),
          keywords: selectedSection.keywords.join(', ')
        });
      }
    }
  };

  const handleWorkshopSubmit = () => {
    if (!isPublisher) return;
    const contract = getContract({ client, chain: base, address: contractAddress, abi });
    const parseList = (str: string) => str.split(',').map(s => s.trim()).filter(s => s.length > 0);

    try {
      let transaction;
      const isUpdate = selectedSection && workshopMode === 'SECTIONS'; // If a section is selected in SECTIONS mode, we are editing it.

      switch (workshopMode) {
        case 'STORIES':
          transaction = prepareContractCall({
            contract,
            method: "createStory",
            params: [formData.title]
          });
          break;
        case 'CHAPTERS':
          if (!selectedStory) return alert("Select a story context first.");
          transaction = prepareContractCall({
            contract,
            method: "createChapter",
            params: [BigInt(selectedStory.id), formData.title]
          });
          break;
        case 'SECTIONS':
          if (!selectedStory || !selectedChapter) return alert("Select story and chapter context first.");

          if (isUpdate && selectedSection) {
            // Update existing
            transaction = prepareContractCall({
              contract,
              method: "updateSection",
              params: [
                BigInt(selectedSection.id),
                formData.title,
                formData.body,
                formData.mediaURI,
                parseList(formData.sources),
                parseList(formData.keywords)
              ]
            });
          } else {
            // Create New
            transaction = prepareContractCall({
              contract,
              method: "publishSection",
              params: [
                BigInt(selectedStory.id),
                BigInt(selectedChapter.id),
                formData.title,
                formData.body,
                formData.mediaURI,
                parseList(formData.sources),
                parseList(formData.keywords)
              ]
            });
          }
          break;
      }

      if (transaction) sendTx(transaction);
    } catch (e) {
      console.error("Tx Error", e);
      alert("Failed to prepare transaction.");
    }
  };

  // --- TOOLBAR LOGIC ---
  const handleToolbarAction = (action: string) => {
    let textToInsert = '';
    switch (action) {
      case 'bold': textToInsert = '**bold**'; break;
      case 'italic': textToInsert = '*italic*'; break;
      case 'h1': textToInsert = '\n# '; break;
      case 'h2': textToInsert = '\n## '; break;
      case 'quote': textToInsert = '\n> '; break;
      case 'list': textToInsert = '\n- '; break;
      case 'link': textToInsert = '[text](url)'; break;
      case 'image': textToInsert = '![alt](url)'; break;
    }

    if (bodyTextareaRef.current) {
      const textarea = bodyTextareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.body;

      const newText = text.substring(0, start) + textToInsert + text.substring(end);
      setFormData(prev => ({ ...prev, body: newText }));

      // Restore focus next tick
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + textToInsert.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    } else {
      // Fallback if ref missing for some reason
      setFormData(prev => ({ ...prev, body: prev.body + textToInsert }));
    }
  };

  // Loading Screen
  if (loading && stories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full relative overflow-hidden font-[family-name:var(--font-rajdhani)]">
        <div className="bg-purple-950/70 backdrop-blur-xl p-8 rounded-2xl border border-purple-400/30 shadow-[0_0_30px_rgba(127,44,255,0.25)]">
          <div className="bg-white/10 p-6 rounded-full animate-ping mb-4 mx-auto w-fit">
            <GlobeAltIcon className="w-12 h-12 text-white" />
          </div>
          <div className="text-white font-bold tracking-[0.3em] text-sm animate-pulse text-center">
            CONNECTING TO ARCHIVES...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col lg:flex-row h-full w-full text-white overflow-hidden font-[family-name:var(--font-rajdhani)]">

      {/* --- COLLAPSIBLE LEFT PANEL (Navigation) --- */}
      <div
        className={`flex-shrink-0 border-r border-purple-400/30 bg-purple-950/70 backdrop-blur-xl flex flex-col z-40 h-full transition-all duration-300 ease-in-out absolute lg:relative shadow-[0_0_20px_rgba(127,44,255,0.15)]
          ${isNavOpen ? 'translate-x-0 w-full lg:w-80' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:border-none lg:overflow-hidden'}
        `}
      >
        <div className="p-4 lg:p-6 border-b border-purple-400/20 relative overflow-hidden shrink-0 flex justify-between items-center">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-white flex items-center gap-2 relative z-10">
            <BookOpenIcon className="w-5 h-5 lg:w-6 lg:h-6 text-purple-400" />
            LORE<span className="text-purple-400">{'//'}</span>DB
          </h1>
          <button onClick={() => setIsNavOpen(false)} className="lg:hidden p-2 text-gray-500 hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Stories List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 min-h-0">
          <div className="text-xs font-bold text-white uppercase tracking-wider mb-2 px-4 mt-4 flex items-center gap-2">
            <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
            Available Archives
          </div>

          <div className="space-y-3 lg:space-y-4 px-2">
            {stories.map(story => (
              <div key={story.id} className="group">
                <button
                  onClick={() => handleStorySelect(story)}
                  className={`w-full text-left px-3 py-2 lg:px-4 lg:py-3 rounded-lg transition-all duration-300 border border-transparent backdrop-blur-sm relative overflow-hidden ${selectedStory?.id === story.id
                    ? 'bg-white/10 border-white/50 text-white shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                    : 'hover:bg-white/5 hover:border-white/10 text-gray-400'
                    }`}
                >
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="font-bold tracking-wide text-xs lg:text-sm">{story.title}</span>
                    <span className="text-[9px] lg:text-[10px] opacity-50">#{story.id.padStart(3, '0')}</span>
                  </div>
                </button>

                {/* Nested Chapters */}
                {selectedStory?.id === story.id && (
                  <div className="mt-2 ml-4 pl-4 border-l border-white/20 space-y-1">
                    {chapters.map(chapter => (
                      <button
                        key={chapter.id}
                        onClick={() => handleChapterSelect(chapter)}
                        className={`w-full text-left px-3 py-2 text-xs rounded-md transition-all duration-200 flex items-center gap-2 group/chapter ${selectedChapter?.id === chapter.id
                          ? 'text-white bg-white/10 font-bold'
                          : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                          }`}
                      >
                        <ChevronRightIcon className={`w-3 h-3 transition-transform ${selectedChapter?.id === chapter.id ? 'rotate-90 text-white' : 'opacity-0 group-hover/chapter:opacity-50'}`} />
                        <span className="truncate">{chapter.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-black/80 shrink-0">
          <button
            disabled={!isPublisher}
            onClick={() => { toggleWorkshop(); if (typeof window !== 'undefined' && window.innerWidth < 1024) setIsNavOpen(false); }}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 border rounded-md text-xs font-bold transition-all duration-300 group ${isPublisher
              ? `cursor-pointer ${isWorkshopOpen ? 'bg-white/10 border-white text-white' : 'border-white text-white hover:bg-white hover:text-black'}`
              : 'border-dashed border-white/20 text-gray-500 cursor-not-allowed hover:bg-white/5'
              }`}
          >
            {isPublisher ? (
              <>
                {isWorkshopOpen ? <XMarkIcon className="w-4 h-4" /> : <PencilSquareIcon className="w-4 h-4" />}
                {isWorkshopOpen ? 'CLOSE WORKSHOP' : "WRITER'S WORKSHOP"}
              </>
            ) : (
              <>
                <DocumentPlusIcon className="w-4 h-4 group-hover:text-white transition-colors" />
                AUTHORIZATION REQUIRED
              </>
            )}
          </button>
        </div>
      </div>

      {/* --- CENTER PANEL: READING SLATE --- */}
      <div className="flex-1 flex flex-col relative z-0 h-full overflow-hidden bg-black/20 border-y border-white/10">

        {/* Mobile Nav Toggle Overlay Button (When Nav Closed) */}
        {!isNavOpen && (
          <button
            onClick={() => setIsNavOpen(true)}
            className="absolute top-4 left-4 z-50 p-2 bg-black/50 backdrop-blur border border-white/10 rounded-full text-white shadow-lg hover:bg-black/80 transition-all"
          >
            <ListBulletIcon className="w-6 h-6" />
          </button>
        )}

        {isWorkshopOpen ? (
          /* --- WORKSHOP MODE --- */
          <div className="fixed inset-0 z-50 lg:relative lg:z-auto lg:h-full flex flex-col bg-black/95 lg:bg-black/80 backdrop-blur-xl">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5 pointer-events-none" />

            {/* Workshop Fixed Header Group */}
            <div className="flex flex-col border-b border-white/20 bg-black/80 backdrop-blur-xl z-20 shrink-0">
              {/* Top Bar: Title & Tabs */}
              <div className="p-4 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-4">
                  <CommandLineIcon className="w-5 h-5 text-white" />
                  <h2 className="text-xs font-bold tracking-widest text-white uppercase">
                    Workshop <span className="text-white">{'//'}</span> {workshopMode}
                  </h2>
                </div>
                {/* Mode Selector Tabs */}
                <div className="flex gap-2">
                  {(['STORIES', 'CHAPTERS', 'SECTIONS'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setWorkshopMode(mode)}
                      className={`px-3 py-1 text-[10px] font-bold border rounded transition-all ${workshopMode === mode
                        ? 'bg-white text-black border-white'
                        : 'border-white/20 text-gray-400 hover:border-white/50 hover:text-white'
                        }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Context Bar (Fixed Dropdowns) */}
              <div className="px-4 py-3 flex items-center gap-4 text-[10px] text-gray-400 bg-black/40 overflow-x-auto whitespace-nowrap border-b border-white/5">
                <div className="flex items-center gap-2">
                  <BookOpenIcon className="w-3 h-3 text-white" />
                  <span className="opacity-50 tracking-widest">STORY::</span>
                  <select
                    value={selectedStory?.id || ''}
                    onChange={(e) => {
                      const story = stories.find(s => s.id === e.target.value);
                      if (story) handleStorySelect(story);
                    }}
                    className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white focus:border-white outline-none min-w-[150px]"
                  >
                    <option value="" disabled>SELECT_ARCHIVE</option>
                    {stories.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                </div>

                <ChevronRightIcon className="w-3 h-3 opacity-30" />

                <div className="flex items-center gap-2">
                  <ListBulletIcon className="w-3 h-3 text-white" />
                  <span className="opacity-50 tracking-widest">CHAPTER::</span>
                  <select
                    value={selectedChapter?.id || ''}
                    onChange={(e) => {
                      const chapter = chapters.find(c => c.id === e.target.value);
                      if (chapter) handleChapterSelect(chapter);
                    }}
                    disabled={!selectedStory}
                    className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white focus:border-white outline-none min-w-[150px] disabled:opacity-30"
                  >
                    <option value="" disabled>SELECT_FRAGMENT</option>
                    {chapters.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>

                {workshopMode === 'SECTIONS' && (
                  <>
                    <ChevronRightIcon className="w-3 h-3 opacity-30" />
                    <div className="flex items-center gap-2">
                      <PencilSquareIcon className="w-3 h-3 text-white" />
                      <span className="opacity-50 tracking-widest">SECTION::</span>
                      <select
                        value={selectedSection?.id || ''}
                        onChange={(e) => {
                          const section = sections.find(s => s.id === e.target.value);
                          if (section) {
                            setSelectedSection(section);
                            setFormData({
                              title: section.title,
                              body: section.body,
                              mediaURI: section.mediaURI,
                              sources: section.sources.join(', '),
                              keywords: section.keywords.join(', ')
                            });
                          } else {
                            // Create new behavior
                            setSelectedSection(null);
                            setFormData({ title: '', body: '', mediaURI: '', sources: '', keywords: '' });
                          }
                        }}
                        disabled={!selectedChapter}
                        className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white focus:border-white outline-none min-w-[150px] disabled:opacity-30"
                      >
                        <option value="">[ CREATE NEW ENTRY ]</option>
                        {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* Toolbar (Only for SECTIONS mode) - Fixed Below Context */}
              {workshopMode === 'SECTIONS' && (
                <div className="px-4 py-2 flex items-center gap-1 bg-black/60 border-b border-white/5">
                  {[
                    { id: 'bold', label: 'B', font: 'font-bold' },
                    { id: 'italic', label: 'I', font: 'italic italic' },
                    { id: 'h1', label: 'H1', font: 'font-bold' },
                    { id: 'h2', label: 'H2', font: 'font-bold' },
                    { id: 'quote', label: '""', font: '' },
                    { id: 'list', icon: ListBulletIcon },
                    { id: 'link', icon: LinkIcon },
                    { id: 'image', icon: PhotoIcon },
                  ].map((tool: any) => (
                    <button
                      key={tool.id}
                      onClick={() => handleToolbarAction(tool.id)}
                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                      {tool.icon ? <tool.icon className="w-3 h-3" /> : <span className={`text-[10px] ${tool.font}`}>{tool.label}</span>}
                    </button>
                  ))}

                  <div className="flex-1" /> {/* Spacer */}

                  <button
                    onClick={() => setShowMetadataPanel(!showMetadataPanel)}
                    className={`px-2 h-7 flex items-center gap-2 rounded transition-colors text-[10px] ${showMetadataPanel ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-gray-400'}`}
                  >
                    <Cog6ToothIcon className="w-3 h-3" />
                    METADATA
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Main Content Area - Layout Switches based on Mode */}
              <div className="flex-1 overflow-y-auto custom-scrollbar relative">

                {workshopMode === 'STORIES' && (
                  <div className="p-8 md:p-12 max-w-3xl mx-auto space-y-8">
                    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <SparklesIcon className="w-4 h-4 text-white" /> CREATE NEW ARCHIVE (STORY)
                      </h3>
                      <div className="space-y-4">
                        <input
                          type="text"
                          placeholder="Story Title..."
                          value={formData.title}
                          onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                          className="w-full bg-black/20 border border-white/10 rounded px-4 py-3 text-white focus:border-white outline-none"
                        />
                        <button onClick={handleWorkshopSubmit} disabled={isTxPending || !formData.title} className="w-full py-3 bg-white hover:bg-gray-200 text-black font-bold rounded">
                          {isTxPending ? 'CREATING...' : 'CREATE STORY'}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-gray-500 uppercase">Existing Archives</label>
                      {stories.map(s => (
                        <div key={s.id} className="p-4 border border-white/5 bg-white/5 rounded flex justify-between items-center text-sm text-gray-300">
                          <span>{s.title}</span>
                          <span className="text-xs opacity-50">#{s.id}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {workshopMode === 'CHAPTERS' && (
                  <div className="p-8 md:p-12 max-w-3xl mx-auto space-y-8">
                    {!selectedStory ? (
                      <div className="flex items-center justify-center h-64 text-gray-500 text-xs">select_story_context_required</div>
                    ) : (
                      <>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <SparklesIcon className="w-4 h-4 text-white" /> ADD FRAGMENT TO: {selectedStory.title}
                          </h3>
                          <div className="space-y-4">
                            <input
                              type="text"
                              placeholder="Chapter Title..."
                              value={formData.title}
                              onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                              className="w-full bg-black/20 border border-white/10 rounded px-4 py-3 text-white focus:border-white outline-none"
                            />
                            <button onClick={handleWorkshopSubmit} disabled={isTxPending || !formData.title} className="w-full py-3 bg-white hover:bg-gray-200 text-black font-bold rounded">
                              {isTxPending ? 'CREATING...' : 'CREATE CHAPTER'}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs text-gray-500 uppercase">Existing Fragments</label>
                          {chapters.map(c => (
                            <div key={c.id} className="p-4 border border-white/5 bg-white/5 rounded flex justify-between items-center text-sm text-gray-300">
                              <span>{c.title}</span>
                              <span className="text-xs opacity-50">#{c.id}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {workshopMode === 'SECTIONS' && (
                  <div className="p-8 md:p-16 max-w-3xl mx-auto space-y-6">
                    {(selectedStory && selectedChapter) ? (
                      <>
                        {/* Hero Editor UI - Static Preview */}
                        {formData.mediaURI && (
                          <div className="relative w-full bg-[#05050a] border-b border-white/10 overflow-hidden mb-12 select-none rounded-b-[2rem] shadow-2xl">
                            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-white/20 to-transparent z-10 pointer-events-none" />
                            <img
                              src={formData.mediaURI.replace('ipfs://', 'https://ipfs.io/ipfs/')}
                              alt="Hero"
                              className="w-full h-auto block"
                              draggable={false}
                            />
                          </div>
                        )}
                        <input
                          value={formData.title}
                          onChange={e => setFormData({ ...formData, title: e.target.value })}
                          type="text"
                          className="w-full bg-transparent border-none p-0 text-4xl md:text-5xl font-black text-white focus:outline-none focus:ring-0 placeholder:text-white/10 tracking-tight leading-tight"
                          placeholder="Untitled Entry"
                        />

                        <textarea
                          ref={bodyTextareaRef}
                          value={formData.body}
                          onChange={e => setFormData({ ...formData, body: e.target.value })}
                          className="w-full h-[calc(100vh-400px)] bg-transparent border-none p-0 text-lg text-gray-300 font-serif leading-8 focus:outline-none focus:ring-0 placeholder:text-white/10 resize-none"
                          placeholder="Tell the story..."
                        />

                        <div className="pt-8 flex justify-end">
                          <button
                            onClick={handleWorkshopSubmit}
                            disabled={isTxPending || !formData.title}
                            className="px-6 py-3 bg-white hover:bg-gray-200 text-black text-xs font-bold tracking-widest rounded transition-all shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:shadow-[0_0_40px_rgba(255,255,255,0.6)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {isTxPending ? (
                              <>
                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                TRANSMITTING...
                              </>
                            ) : (
                              <>
                                <SparklesIcon className="w-4 h-4" />
                                {selectedSection ? 'UPDATE ENTRY' : 'PUBLISH NEW ENTRY'}
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                        select_story_and_chapter_context_required
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Side Metadata Panel */}
              {showMetadataPanel && (
                <div className="w-80 bg-black/60 backdrop-blur-md border-l border-white/10 p-6 overflow-y-auto shrink-0 animate-in slide-in-from-right duration-300">
                  <h3 className="text-xs font-bold tracking-widest text-white mb-6 flex items-center gap-2">
                    <TagIcon className="w-4 h-4" /> METADATA_FIELDS
                  </h3>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white flex items-center gap-2">
                        <PhotoIcon className="w-3 h-3" />
                        Cover Image (URI)
                      </label>
                      <input
                        value={formData.mediaURI}
                        onChange={e => setFormData({ ...formData, mediaURI: e.target.value })}
                        type="text"
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-white transition-colors"
                        placeholder="ipfs://..."
                      />

                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white flex items-center gap-2">
                        <HashtagIcon className="w-3 h-3" />
                        Tags (CSV)
                      </label>
                      <textarea
                        value={formData.keywords}
                        onChange={e => setFormData({ ...formData, keywords: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-white transition-colors resize-none h-20"
                        placeholder="myth, legend, ..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white flex items-center gap-2">
                        <LinkIcon className="w-3 h-3" />
                        Sources (CSV)
                      </label>
                      <textarea
                        value={formData.sources}
                        onChange={e => setFormData({ ...formData, sources: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-white transition-colors resize-none h-20"
                        placeholder="Book A, Website B..."
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : selectedSection ? (
          <div className="h-full overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto w-full">

              {/* HERO IMAGE SECTION */}
              {selectedSection.mediaURI && (
                <div className="relative w-full h-64 lg:h-96 overflow-hidden select-none shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#05050a] via-transparent to-transparent z-10" />
                  <img
                    src={selectedSection.mediaURI.replace('ipfs://', 'https://ipfs.io/ipfs/')}
                    alt={selectedSection.title}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-12 z-20">
                    <h1 className="text-4xl lg:text-6xl font-black text-white/90 drop-shadow-md tracking-tight uppercase mb-2">
                      {selectedSection.title}
                    </h1>
                    {/* Metadata Pill */}
                    <div className="flex flex-wrap gap-2 text-[10px] font-bold tracking-widest text-white/60 uppercase">
                      <span className="bg-white/10 px-2 py-1 rounded backdrop-blur">
                        ID: {selectedSection.id}
                      </span>
                      <span className="bg-white/10 px-2 py-1 rounded backdrop-blur flex items-center gap-1">
                        <UserIcon className="w-3 h-3" /> {selectedSection.author.substring(0, 6)}
                      </span>
                      <span className="bg-white/10 px-2 py-1 rounded backdrop-blur flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" /> {selectedSection.year}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-8 lg:p-16 relative">
                {!selectedSection.mediaURI && (
                  <div className="mb-12 border-b border-white/10 pb-8">
                    <h1 className="text-4xl lg:text-6xl font-black text-white tracking-tight uppercase mb-4">
                      {selectedSection.title}
                    </h1>
                    <div className="flex flex-wrap gap-4 text-xs font-bold tracking-widest text-gray-500 uppercase">
                      <span className="flex items-center gap-1"><HashtagIcon className="w-3 h-3" /> ID: {selectedSection.id}</span>
                      <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" /> {selectedSection.author}</span>
                      <span className="flex items-center gap-1"><ClockIcon className="w-3 h-3" /> {selectedSection.year}</span>
                    </div>
                  </div>
                )}

                {/* Main Text Content */}
                <div className="prose prose-invert prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-p:leading-relaxed prose-p:text-gray-300 prose-blockquote:border-l-2 prose-blockquote:border-white/50 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-400">
                  {selectedSection.body.split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                      {line.startsWith('# ') ? <h1 className="text-3xl font-black mt-8 mb-4">{line.replace('# ', '')}</h1> :
                        line.startsWith('## ') ? <h2 className="text-2xl font-bold mt-6 mb-3">{line.replace('## ', '')}</h2> :
                          line.startsWith('> ') ? <blockquote className="my-4 pl-4 border-l-2 border-white/30 italic text-gray-400">{line.replace('> ', '')}</blockquote> :
                            line.trim() === '' ? <br /> :
                              <p className="mb-4">{line}</p>}
                    </React.Fragment>
                  ))}
                </div>

                {/* Footer Metadata */}
                {(selectedSection.sources.length > 0 || selectedSection.keywords.length > 0) && (
                  <div className="mt-16 pt-8 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {selectedSection.keywords.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <TagIcon className="w-3 h-3" /> Semantic Tags
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedSection.keywords.map((k, i) => (
                            <span key={i} className="px-2 py-1 rounded bg-white/5 border border-white/5 text-[10px] font-medium text-gray-400">
                              {k}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedSection.sources.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <LinkIcon className="w-3 h-3" /> Citations
                        </h4>
                        <ul className="space-y-1">
                          {selectedSection.sources.map((s, i) => (
                            <li key={i} className="text-xs text-gray-500 truncate flex items-center gap-2">
                              <span className="w-1 h-1 bg-white/30 rounded-full" /> {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-600 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
            <BookOpenIcon className="w-16 h-16 mb-4 opacity-20" />
            <h3 className="text-sm font-bold tracking-[0.2em] uppercase mb-2">Secure Archives Locked</h3>
            <p className="text-xs max-w-xs leading-relaxed opacity-50">
              Select an encrypted fragment from the directory to begin decryption sequence.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
