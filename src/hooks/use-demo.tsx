import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type DemoCtx = {
  isDemo: boolean;
  enableDemo: () => void;
  disableDemo: () => void;
};

const Ctx = createContext<DemoCtx | undefined>(undefined);
const STORAGE_KEY = "wealthia.demo";

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsDemo(window.localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function enableDemo() {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setIsDemo(true);
  }
  function disableDemo() {
    window.localStorage.removeItem(STORAGE_KEY);
    setIsDemo(false);
  }

  return <Ctx.Provider value={{ isDemo, enableDemo, disableDemo }}>{children}</Ctx.Provider>;
}

export function useDemo() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useDemo must be used inside DemoProvider");
  return c;
}
