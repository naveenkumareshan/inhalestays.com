
import React from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import inhalestaysLogo from '@/assets/inhalestays-logo.png';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gradient-hero text-white">
      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src={inhalestaysLogo} alt="InhaleStays" className="w-12 h-12 object-contain bg-white rounded-xl p-1" />
              <span className="text-xl font-bold">InhaleStays</span>
            </div>
            <p className="text-white/70 text-sm leading-relaxed">
              Your Home Away From Home. Providing the perfect environment for focused reading, study, and personal growth.
            </p>
          </div>
          
          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-brand-green-light">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="text-white/70 hover:text-white transition-colors text-sm">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/cabins" className="text-white/70 hover:text-white transition-colors text-sm">
                  Reading Rooms
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-white/70 hover:text-white transition-colors text-sm">
                  About Us
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-white/10 mt-10 pt-8 text-center">
          <p className="text-white/50 text-sm">
            © {new Date().getFullYear()} InhaleStays. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};