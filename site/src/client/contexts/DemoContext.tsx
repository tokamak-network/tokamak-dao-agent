import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export interface DemoState {
  agentId: `0x${string}` | null;
  delegationId: `0x${string}` | null;
  proposalId: bigint | null;
  rationaleURI: string;
  salt: `0x${string}` | null;
  commitHash: `0x${string}` | null;
  hasVoted: boolean;
  isRevealed: boolean;
  isResolved: boolean;
  credibility: { totalScore: bigint; totalPredictions: bigint } | null;
  currentStep: number;
  completedSteps: number[];
}

interface DemoContextValue extends DemoState {
  setStep: (step: number) => void;
  completeStep: (step: number) => void;
  update: (partial: Partial<DemoState>) => void;
  reset: () => void;
}

const STORAGE_KEY = "erc-ai-gov-demo-state";

const defaultState: DemoState = {
  agentId: null,
  delegationId: null,
  proposalId: null,
  rationaleURI: "",
  salt: null,
  commitHash: null,
  hasVoted: false,
  isRevealed: false,
  isResolved: false,
  credibility: null,
  currentStep: 0,
  completedSteps: [],
};

function loadState(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    // Restore bigint fields
    if (parsed.proposalId) parsed.proposalId = BigInt(parsed.proposalId);
    if (parsed.credibility) {
      parsed.credibility.totalScore = BigInt(parsed.credibility.totalScore);
      parsed.credibility.totalPredictions = BigInt(parsed.credibility.totalPredictions);
    }
    return { ...defaultState, ...parsed };
  } catch {
    return defaultState;
  }
}

function saveState(state: DemoState) {
  try {
    const serializable = {
      ...state,
      proposalId: state.proposalId?.toString() ?? null,
      credibility: state.credibility
        ? {
            totalScore: state.credibility.totalScore.toString(),
            totalPredictions: state.credibility.totalPredictions.toString(),
          }
        : null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch {}
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const setStep = useCallback((step: number) => {
    setState((s) => ({ ...s, currentStep: step }));
  }, []);

  const completeStep = useCallback((step: number) => {
    setState((s) => ({
      ...s,
      completedSteps: s.completedSteps.includes(step)
        ? s.completedSteps
        : [...s.completedSteps, step],
      currentStep: step + 1,
    }));
  }, []);

  const update = useCallback((partial: Partial<DemoState>) => {
    setState((s) => ({ ...s, ...partial }));
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(defaultState);
  }, []);

  return (
    <DemoContext.Provider value={{ ...state, setStep, completeStep, update, reset }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used within DemoProvider");
  return ctx;
}
