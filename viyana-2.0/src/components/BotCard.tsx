'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Bot, 
  ShoppingCart, 
  Zap, 
  Star, 
  TrendingUp,
  ShieldCheck,
  Globe
} from 'lucide-react';

interface BotCardProps {
  name: string;
  category: string;
  description: string;
  price: string;
  rentPrice: string;
  rating: string;
  icon: React.ReactNode;
}

const BotCard = ({ name, category, description, price, rentPrice, rating, icon }: BotCardProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="group relative bg-[#0a0a0a] border border-white/5 rounded-3xl overflow-hidden transition-all hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/10"
    >
      {/* Visual Header */}
      <div className="h-32 bg-gradient-to-br from-blue-600/10 to-indigo-600/10 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl flex items-center justify-center text-blue-400 group-hover:scale-110 group-hover:text-blue-300 transition-all duration-500">
          {icon}
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{category}</span>
          <div className="flex items-center gap-1 text-[10px] text-yellow-500 font-bold">
            <Star size={10} fill="currentColor" />
            <span>{rating}</span>
          </div>
        </div>

        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{name}</h3>
        <p className="text-sm text-gray-500 mb-6 line-clamp-2 leading-relaxed">{description}</p>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
            <div>
              <div className="text-[10px] text-gray-500 font-medium">Monthly Rent</div>
              <div className="text-lg font-bold text-white">{rentPrice}</div>
            </div>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-2">
              <Zap size={14} />
              Hire Now
            </button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl border border-white/5 hover:bg-white/5 transition-colors cursor-pointer">
            <div>
              <div className="text-[10px] text-gray-500 font-medium">Lifetime License</div>
              <div className="text-lg font-bold text-white">{price}</div>
            </div>
            <ShoppingCart size={18} className="text-gray-500 group-hover:text-white transition-colors" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default BotCard;
