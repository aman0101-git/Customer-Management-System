// ============================================================================
// frontend/src/components/system/PageTransition.tsx
// ----------------------------------------------------------------------------
// Phase 1 (May 2026):
//   Subtle 150ms fade for route transitions. Intentionally small — enterprise
//   SaaS, not a marketing site. No slide / scale / blur.
//
//   Used by AppRoutes inside <AnimatePresence mode="wait">. The wrapper is a
//   plain div so it does not interfere with sticky positioning, scroll
//   containers, or fixed layouts used inside AppShell.
// ============================================================================

import { motion } from "framer-motion";
import type { ReactNode } from "react";

const VARIANTS = {
  initial: { opacity: 0 },
  enter: { opacity: 1 },
  exit: { opacity: 0 },
} as const;

const TRANSITION = { duration: 0.15, ease: "easeOut" as const };

export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={VARIANTS}
      transition={TRANSITION}
      style={{ minHeight: "100%" }}
    >
      {children}
    </motion.div>
  );
}
