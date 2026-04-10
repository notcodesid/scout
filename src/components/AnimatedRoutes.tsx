import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PageTransition from './PageTransition';
import Index from '@/pages/Index';
import JobsPage from '@/pages/JobsPage';
import ApplyPage from '@/pages/ApplyPage';
import TermsPage from '@/pages/TermsPage';
import PrivacyPage from '@/pages/PrivacyPage';
import RefundPage from '@/pages/RefundPage';
import NotFound from '@/pages/NotFound';

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Index /></PageTransition>} />
        <Route path="/jobs" element={<PageTransition><JobsPage /></PageTransition>} />
        <Route path="/apply" element={<PageTransition><ApplyPage /></PageTransition>} />
        <Route path="/terms" element={<PageTransition><TermsPage /></PageTransition>} />
        <Route path="/privacy" element={<PageTransition><PrivacyPage /></PageTransition>} />
        <Route path="/refund" element={<PageTransition><RefundPage /></PageTransition>} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

export default AnimatedRoutes;
