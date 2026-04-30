"use client";
import { createContext, useContext, useState, useEffect } from "react";

const BootstrapContext = createContext(null);

export function BootstrapProvider({ children }) {
  const [bootstrap, setBootstrap] = useState(null);

  useEffect(() => {
    fetch("/api/bootstrap")
      .then((r) => r.json())
      .then(setBootstrap)
      .catch(console.error);
  }, []);

  return (
    <BootstrapContext.Provider
      value={{
        bootstrap,
        reload: () =>
          fetch("/api/bootstrap")
            .then((r) => r.json())
            .then(setBootstrap),
      }}
    >
      {children}
    </BootstrapContext.Provider>
  );
}

export function useBootstrap() {
  return useContext(BootstrapContext).bootstrap;
}

export function useBootstrapReload() {
  return useContext(BootstrapContext).reload;
}
