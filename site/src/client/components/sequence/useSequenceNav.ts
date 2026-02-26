import { useState, useEffect, useCallback } from "react";
import { STEPS } from "./data";

export function useSequenceNav() {
  const [activeStep, setActiveStep] = useState(-1);
  const [detailId, setDetailId] = useState<number | null>(null);

  const goToStep = useCallback((n: number) => {
    setActiveStep(n);
    setDetailId(null);
  }, []);

  const nextStep = useCallback(() => {
    setActiveStep((prev) => {
      if (prev < STEPS.length - 1) {
        setDetailId(null);
        return prev + 1;
      }
      return prev;
    });
  }, []);

  const resetAll = useCallback(() => {
    setActiveStep(-1);
    setDetailId(null);
  }, []);

  const showDetail = useCallback((id: number) => {
    setDetailId(id);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailId(null);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        nextStep();
      }
      if (e.key === "ArrowLeft" && activeStep > 0) {
        e.preventDefault();
        goToStep(activeStep - 1);
      }
      if (e.key === "Escape") closeDetail();
      if (e.key === "r" || e.key === "R") resetAll();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeStep, nextStep, goToStep, closeDetail, resetAll]);

  return {
    activeStep,
    detailId,
    goToStep,
    nextStep,
    resetAll,
    showDetail,
    closeDetail,
    isComplete: activeStep >= STEPS.length - 1,
  };
}
