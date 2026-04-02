/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  Gamepad2, Search, X, Maximize2, ExternalLink, Play, 
  Shield, Trash2, Edit2, Plus, Sparkles, UserX, Key,
  Check, AlertCircle, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import gamesData from './games.json';

// Initialize Gemini for "AI Game Finder"
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Game {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  description: string;
}

interface RoleCode {
  role: 'OWNER' | 'ADMIN' | 'MODERATOR';
  code: string;
}

export default function App() {
  const [games, setGames] = useState<Game[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Role & Admin State
  const [userRole, setUserRole] = useState<'USER' | 'MODERATOR' | 'ADMIN' | 'OWNER'>('USER');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminCodeInput, setAdminCodeInput] = useState('');
  const [roleCodes, setRoleCodes] = useState<RoleCode[]>([
    { role: 'OWNER', code: '1010979' },
    { role: 'ADMIN', code: 'admin123' },
    { role: 'MODERATOR', code: 'mod123' }
  ]);
  const [bannedPlayers, setBannedPlayers] = useState<string[]>([]);
  const [showOwnerDashboard, setShowOwnerDashboard] = useState(false);

  // Game Management State
  const [isAddingGame, setIsAddingGame] = useState(false);
  const [newGame, setNewGame] = useState<Partial<Game>>({ title: '', url: '', description: '', thumbnail: '' });
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    const savedGames = localStorage.getItem('unblocked_games');
    if (savedGames) {
      setGames(JSON.parse(savedGames));
    } else {
      setGames(gamesData);
    }

    const savedBanned = localStorage.getItem('banned_players');
    if (savedBanned) setBannedPlayers(JSON.parse(savedBanned));

    const savedCodes = localStorage.getItem('role_codes');
    if (savedCodes) setRoleCodes(JSON.parse(savedCodes));
  }, []);

  const saveGames = (updatedGames: Game[]) => {
    setGames(updatedGames);
    localStorage.setItem('unblocked_games', JSON.stringify(updatedGames));
  };

  const handleAdminLogin = () => {
    const foundRole = roleCodes.find(rc => rc.code === adminCodeInput);
    if (foundRole) {
      setUserRole(foundRole.role);
      setShowAdminModal(false);
      setAdminCodeInput('');
      if (foundRole.role === 'OWNER') setShowOwnerDashboard(true);
    } else {
      alert('Invalid Code');
    }
  };

  const deleteGame = (id: string) => {
    if (confirm('Are you sure you want to delete this game?')) {
      const updated = games.filter(g => g.id !== id);
      saveGames(updated);
    }
  };

  const updateGame = (id: string, updates: Partial<Game>) => {
    const updated = games.map(g => g.id === id ? { ...g, ...updates } : g);
    saveGames(updated);
  };

  const addGame = () => {
    if (!newGame.title || !newGame.url) return;
    const gameToAdd: Game = {
      id: Date.now().toString(),
      title: newGame.title || 'Untitled Game',
      url: newGame.url || '',
      thumbnail: newGame.thumbnail || 'https://picsum.photos/seed/game/400/300',
      description: newGame.description || 'No description provided.'
    };
    saveGames([...games, gameToAdd]);
    setIsAddingGame(false);
    setNewGame({ title: '', url: '', description: '', thumbnail: '' });
  };

  const suggestGameWithAi = async () => {
    setIsAiLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Suggest a popular unblocked web game. Provide the title, a working embed URL (if known, otherwise a placeholder), a descriptive thumbnail URL, and a short description. Format as JSON.",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              url: { type: Type.STRING },
              thumbnail: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["title", "url", "thumbnail", "description"]
          }
        }
      });
      
      const suggested = JSON.parse(response.text);
      setNewGame(suggested);
    } catch (error) {
      console.error("AI Suggestion failed", error);
      alert("AI failed to suggest a game. Please try again.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const banPlayer = (ip: string) => {
    if (!ip) return;
    const updated = [...bannedPlayers, ip];
    setBannedPlayers(updated);
    localStorage.setItem('banned_players', JSON.stringify(updated));
  };

  const filteredGames = games.filter(game =>
    game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    game.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white hidden sm:block">
              Unblocked<span className="text-indigo-400">Games</span>
            </h1>
          </div>

          <div className="relative max-w-md w-full mx-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search games..."
              className="w-full bg-slate-900 border border-slate-700 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <button className="text-sm font-medium hover:text-indigo-400 transition-colors hidden md:block px-3">
              Request Game
            </button>
            
            {userRole === 'USER' ? (
              <button 
                onClick={() => setShowAdminModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-bold transition-all border border-slate-700"
              >
                <Shield className="w-4 h-4 text-indigo-400" />
                Admin
              </button>
            ) : (
              <button 
                onClick={() => setShowOwnerDashboard(!showOwnerDashboard)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-bold transition-all shadow-lg shadow-indigo-500/20"
              >
                <Shield className="w-4 h-4" />
                {userRole} Panel
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Owner Dashboard Overlay */}
      <AnimatePresence>
        {showOwnerDashboard && (userRole === 'OWNER' || userRole === 'ADMIN') && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-slate-900 border-b border-slate-800 p-6 shadow-2xl"
          >
            <div className="container mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Shield className="w-6 h-6 text-indigo-400" />
                  {userRole} Control Center
                </h2>
                <button onClick={() => setShowOwnerDashboard(false)} className="p-2 hover:bg-slate-800 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Game Management */}
                <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Gamepad2 className="w-5 h-5 text-indigo-400" />
                    Manage Games
                  </h3>
                  <button 
                    onClick={() => setIsAddingGame(true)}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold flex items-center justify-center gap-2 mb-4 transition-all"
                  >
                    <Plus className="w-5 h-5" /> Add New Game
                  </button>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {games.map(game => (
                      <div key={game.id} className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-3">
                          <img src={game.thumbnail} className="w-8 h-8 rounded object-cover" referrerPolicy="no-referrer" />
                          <span className="text-sm font-medium truncate max-w-[120px]">{game.title}</span>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => {
                            const newTitle = prompt('New title:', game.title);
                            if (newTitle) updateGame(game.id, { title: newTitle });
                          }} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteGame(game.id)} className="p-1.5 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Role & Security */}
                <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Key className="w-5 h-5 text-indigo-400" />
                    Role Management
                  </h3>
                  <div className="space-y-4">
                    {roleCodes.map((rc, idx) => (
                      <div key={rc.role} className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                        <span className="text-xs font-bold text-indigo-400">{rc.role}</span>
                        <div className="flex items-center gap-2">
                          <input 
                            type="text" 
                            value={rc.code} 
                            onChange={(e) => {
                              const updated = [...roleCodes];
                              updated[idx].code = e.target.value;
                              setRoleCodes(updated);
                              localStorage.setItem('role_codes', JSON.stringify(updated));
                            }}
                            className="bg-transparent border-none text-right text-sm focus:ring-0 w-24"
                          />
                          <Edit2 className="w-3 h-3 text-slate-600" />
                        </div>
                      </div>
                    ))}
                  </div>

                  <h3 className="text-lg font-bold mt-8 mb-4 flex items-center gap-2">
                    <UserX className="w-5 h-5 text-red-400" />
                    Ban Players
                  </h3>
                  <div className="flex gap-2 mb-4">
                    <input 
                      type="text" 
                      placeholder="Enter IP or Username" 
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          banPlayer(e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <button className="p-2 bg-red-600 rounded-lg"><Plus className="w-5 h-5" /></button>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {bannedPlayers.map(p => (
                      <div key={p} className="flex items-center justify-between p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                        <span className="text-xs text-red-400">{p}</span>
                        <button onClick={() => {
                          const updated = bannedPlayers.filter(bp => bp !== p);
                          setBannedPlayers(updated);
                          localStorage.setItem('banned_players', JSON.stringify(updated));
                        }} className="text-red-400 hover:text-red-300"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI & Stats */}
                <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                    AI Insights
                  </h3>
                  <div className="p-4 bg-indigo-600/10 rounded-xl border border-indigo-500/20 mb-4">
                    <p className="text-sm text-indigo-300 italic">
                      "Slope Game is currently the most popular. Consider adding more high-speed arcade games to increase engagement."
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-center">
                      <div className="text-2xl font-bold text-white">{games.length}</div>
                      <div className="text-xs text-slate-500 uppercase">Games</div>
                    </div>
                    <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-center">
                      <div className="text-2xl font-bold text-white">{bannedPlayers.length}</div>
                      <div className="text-xs text-slate-500 uppercase">Banned</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        {!searchQuery && (
          <section className="mb-12">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 p-8 md:p-12">
              <div className="relative z-10 max-w-2xl">
                <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
                  Play Your Favorite Games Anywhere.
                </h2>
                <p className="text-indigo-100 text-lg mb-8 opacity-90">
                  Access a curated collection of unblocked web games. No downloads, no filters, just pure fun.
                </p>
                <div className="flex flex-wrap gap-4">
                  <button 
                    onClick={() => setSelectedGame(games[0])}
                    className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-50 transition-colors shadow-lg"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    Play Featured
                  </button>
                </div>
              </div>
              <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-64 h-64 bg-indigo-400/20 rounded-full blur-2xl" />
            </div>
          </section>
        )}

        {/* Games Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              {searchQuery ? `Search Results for "${searchQuery}"` : "Popular Games"}
              <span className="text-sm font-normal text-slate-500 ml-2">({filteredGames.length})</span>
            </h3>
          </div>

          {filteredGames.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredGames.map((game) => (
                <motion.div
                  key={game.id}
                  layoutId={game.id}
                  whileHover={{ y: -5 }}
                  className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-indigo-500/50 transition-all cursor-pointer shadow-xl"
                  onClick={() => setSelectedGame(game)}
                >
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={game.thumbnail}
                      alt={game.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="bg-indigo-600 p-3 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform">
                        <Play className="w-6 h-6 text-white fill-current" />
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">
                      {game.title}
                    </h4>
                    <p className="text-sm text-slate-400 line-clamp-2">
                      {game.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-dashed border-slate-800">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-4">
                <Search className="w-8 h-8 text-slate-500" />
              </div>
              <h4 className="text-xl font-bold text-white mb-2">No games found</h4>
              <p className="text-slate-400">Try searching for something else or request a game.</p>
            </div>
          )}
        </section>
      </main>

      {/* Admin Login Modal */}
      <AnimatePresence>
        {showAdminModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/20">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Admin Access</h2>
              <p className="text-slate-400 text-sm mb-6">Enter your secret code to access administrative features.</p>
              
              <input 
                type="password"
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-center text-xl tracking-widest focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-6"
                value={adminCodeInput}
                onChange={(e) => setAdminCodeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
              />
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowAdminModal(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAdminLogin}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
                >
                  Verify
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Game Modal */}
      <AnimatePresence>
        {isAddingGame && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-lg w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Add New Game</h2>
                <button 
                  onClick={suggestGameWithAi}
                  disabled={isAiLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-lg text-sm font-bold border border-indigo-500/20 transition-all disabled:opacity-50"
                >
                  {isAiLoading ? <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  AI Suggest
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Game Title</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={newGame.title}
                    onChange={(e) => setNewGame({...newGame, title: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Embed URL</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={newGame.url}
                    onChange={(e) => setNewGame({...newGame, url: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Thumbnail URL</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={newGame.thumbnail}
                    onChange={(e) => setNewGame({...newGame, thumbnail: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                  <textarea 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none h-24 resize-none"
                    value={newGame.description}
                    onChange={(e) => setNewGame({...newGame, description: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setIsAddingGame(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={addGame}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
                >
                  Save Game
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Modal */}
      <AnimatePresence>
        {selectedGame && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-slate-950/95 backdrop-blur-sm"
          >
            <motion.div
              layoutId={selectedGame.id}
              className={`bg-slate-900 w-full max-w-6xl rounded-3xl overflow-hidden shadow-2xl flex flex-col transition-all duration-300 ${
                isFullscreen ? 'h-full max-w-none rounded-none' : 'h-[85vh]'
              }`}
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden hidden sm:block">
                    <img src={selectedGame.thumbnail} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white leading-none mb-1">{selectedGame.title}</h3>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Playing Now</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    title="Toggle Fullscreen"
                  >
                    <Maximize2 className="w-5 h-5" />
                  </button>
                  <a
                    href={selectedGame.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    title="Open in New Tab"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                  <button
                    onClick={() => {
                      setSelectedGame(null);
                      setIsFullscreen(false);
                    }}
                    className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-slate-400 transition-colors ml-2"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Game Iframe */}
              <div className="flex-1 bg-black relative">
                <iframe
                  src={selectedGame.url}
                  className="w-full h-full border-none"
                  title={selectedGame.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              {/* Modal Footer (only if not fullscreen) */}
              {!isFullscreen && (
                <div className="p-4 bg-slate-900 border-t border-slate-800 hidden md:block">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-400 max-w-2xl">
                      {selectedGame.description}
                    </p>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-medium text-slate-300">Web Game</span>
                      <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-xs font-medium border border-indigo-500/20">Verified</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 mt-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-slate-800 rounded-lg">
                <Gamepad2 className="w-5 h-5 text-indigo-400" />
              </div>
              <span className="text-lg font-bold text-white">Unblocked Games</span>
            </div>
            
            <div className="flex gap-8 text-sm text-slate-400">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Contact Us</a>
            </div>

            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} Unblocked Games Hub. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
