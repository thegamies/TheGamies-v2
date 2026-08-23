"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type ResultsBoardLayout = "ranked" | "comparison";

type EditionResultsLayoutValue = {
  layout: ResultsBoardLayout;
  setLayout: (next: ResultsBoardLayout) => void;
};

const EditionResultsLayoutCtx =
  createContext<EditionResultsLayoutValue | null>(null);

export function EditionResultsLayoutProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [layout, setLayout] = useState<ResultsBoardLayout>("ranked");
  const value = useMemo(() => ({ layout, setLayout }), [layout]);
  return (
    <EditionResultsLayoutCtx.Provider value={value}>
      {children}
    </EditionResultsLayoutCtx.Provider>
  );
}

export function useEditionResultsLayout(): EditionResultsLayoutValue | null {
  return useContext(EditionResultsLayoutCtx);
}
