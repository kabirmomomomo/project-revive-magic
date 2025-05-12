import { useState, useEffect } from 'react';
import { Menu, X, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'About Us', id: 'about' },
  { label: 'Work', id: 'work' },
  { label: 'Team', id: 'team' },
  { label: 'Contact Us', id: 'contact' },
];

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [shouldShowMenu, setShouldShowMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled ? "bg-[#0f172a]/90 backdrop-blur-md shadow-md py-3 border-b border-gray-700" : "py-6"
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6">
        {/* Logo */}
        <a href="/" className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
        Dine<span className="text-white">Tree</span>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center space-x-10 text-gray-300 font-medium">
          {NAV_ITEMS.map((item, idx) => (
            <a
              key={idx}
              href={`#${item.id}`}
              className="relative group hover:text-blue-400"
              onClick={e => {
                e.preventDefault();
                const el = document.querySelector(`#${item.id}`);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              <span>{item.label}</span>
              <span className="block h-0.5 bg-blue-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
            </a>
          ))}
          <Link
            to="/login"
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 shadow-sm transition"
          >
            <LogIn className="h-4 w-4" />
            <span>Login</span>
          </Link>
        </nav>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-white"
          onClick={() => {
            if (!isMenuOpen) {
              setShouldShowMenu(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setTimeout(() => {
                setShouldShowMenu(true);
                setIsMenuOpen(true);
              }, 300);
            } else {
              setIsMenuOpen(false);
              setShouldShowMenu(false);
            }
          }}
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>

        {/* Mobile Menu */}
        <AnimatePresence>
          {shouldShowMenu && isMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex flex-col items-center justify-center bg-[#0f172a]/95 backdrop-blur-md md:hidden z-40"
            >
              {/* Close button inside overlay */}
              <button
                className="absolute top-6 right-6 text-white"
                onClick={() => {
                  setIsMenuOpen(false);
                  setShouldShowMenu(false);
                }}
                aria-label="Close menu"
              >
                <X size={32} />
              </button>
              <motion.nav
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col space-y-10 text-center text-2xl font-semibold text-white"
              >
                {NAV_ITEMS.map((item, idx) => (
                  <a
                    key={idx}
                    href={`#${item.id}`}
                    className="hover:text-blue-400"
                    onClick={e => {
                      e.preventDefault();
                      setIsMenuOpen(false);
                      setShouldShowMenu(false);
                      setTimeout(() => {
                        const el = document.querySelector(`#${item.id}`);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth' });
                        }
                      }, 200);
                    }}
                  >
                    {item.label}
                  </a>
                ))}
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 shadow"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setShouldShowMenu(false);
                  }}
                >
                  <LogIn className="h-5 w-5" />
                  <span>Login</span>
                </Link>
              </motion.nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
};

export default Navbar;
