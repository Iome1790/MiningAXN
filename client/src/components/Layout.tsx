import { motion, AnimatePresence } from "framer-motion";

interface LayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export default function Layout({ children, hideNav }: LayoutProps) {
  return (
    <div
      className="text-foreground font-sans selection:bg-[#4cd3ff]/30 relative"
      style={{
        height: '100dvh',
        width: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        backgroundImage: 'url(/app-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'local',
      }}
    >
      {/* Dark overlay so UI cards/text stay readable */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{ background: 'rgba(0,0,0,0.38)' }}
      />
      <AnimatePresence mode="wait">
        <motion.div
          className="relative flex-1 flex flex-col overflow-hidden"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          style={{ flex: 1, minHeight: 0, zIndex: 1 }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
