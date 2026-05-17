'use client';

import React from 'react';
import Sidebar from '@/components/Sidebar';
import BotCard from '@/components/BotCard';
import { 
  Search, 
  Filter, 
  ShoppingBag, 
  Flame, 
  Sparkles,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';

const MARKETPLACE_BOTS = [
  {
    name: 'Medical Receptionist Pro',
    category: 'Healthcare',
    description: 'Automates patient scheduling, insurance verification, and FAQ handling via WhatsApp and Web.',
    price: '₹24,999',
    rentPrice: '₹2,499/mo',
    rating: '4.9',
    icon: <Zap size={32} />
  },
  {
    name: 'RealEstate Closer',
    category: 'Sales',
    description: 'Qualification bot that nurtures leads from Facebook Ads and schedules site visits automatically.',
    price: '₹34,999',
    rentPrice: '₹3,999/mo',
    rating: '4.8',
    icon: <Flame size={32} />
  },
  {
    name: 'Ecom Support Ninja',
    category: 'E-commerce',
    description: 'Handles order tracking, returns, and product recommendations using your Shopify data.',
    price: '₹19,999',
    rentPrice: '₹1,999/mo',
    rating: '5.0',
    icon: <ShoppingBag size={32} />
  },
  {
    name: 'Lawyer Assistant AI',
    category: 'Legal',
    description: 'Scans documents for key clauses and prepares legal summaries for clients automatically.',
    price: '₹49,999',
    rentPrice: '₹4,999/mo',
    rating: '4.7',
    icon: <Sparkles size={32} />
  }
];

const MarketplacePage = () => {
  return (
    <main className="flex min-h-screen bg-[#0a0a0a]">
      <Sidebar />

      <div className="flex-1 flex flex-col bg-[#171717] h-screen overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-8 bg-[#171717]/80 backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            <ShoppingBag size={18} className="text-blue-500" />
            <h1 className="text-sm font-bold text-white tracking-tight">AI Agent Marketplace</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
              <input 
                type="text" 
                placeholder="Search models..."
                className="bg-white/5 border border-white/10 rounded-xl py-1.5 pl-9 pr-4 text-xs text-white focus:ring-1 focus:ring-blue-500/50 transition-all w-64"
              />
            </div>
            <button className="p-2 hover:bg-white/5 rounded-xl text-gray-500 transition-colors">
              <Filter size={18} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12">
          {/* Hero Section */}
          <div className="mb-12 relative rounded-[2rem] p-10 overflow-hidden bg-blue-600/5 border border-blue-500/10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider mb-6">
                <Sparkles size={12} />
                <span>New Arrival: Multi-Model Support</span>
              </div>
              <h2 className="text-4xl font-black text-white mb-4 leading-tight">
                Hire Elite AI Agents <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
                  Ready to Automate.
                </span>
              </h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                Deploy pre-trained industrial bots on your own server. No extra APIs needed—everything runs on Gemma and Llama.
              </p>
              <div className="flex items-center gap-4">
                <button className="px-8 py-3 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition-all active:scale-95 shadow-xl">
                  Browse Categories
                </button>
                <button className="px-8 py-3 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-all active:scale-95">
                  Become a Creator
                </button>
              </div>
            </div>
          </div>

          {/* Grid Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {MARKETPLACE_BOTS.map((bot) => (
              <BotCard key={bot.name} {...bot} />
            ))}
          </div>

          <div className="mt-20 py-10 border-t border-white/5 text-center">
            <p className="text-gray-600 text-sm">© 2026 Viyana AI Marketplace. Powered by Open Source Gemma.</p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default MarketplacePage;
