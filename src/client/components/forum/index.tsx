import { useState, useEffect, useCallback } from "react";
import type { ViewState } from "./types.ts";
import { deriveInitialState } from "./helpers.ts";
import { AgendaListView } from "./AgendaListView.tsx";
import { AgendaWizard } from "./AgendaWizard.tsx";
import { AgendaDetailView } from "./AgendaDetailView.tsx";
import { useTabContext } from "../../contexts/TabContext.tsx";

export function ForumTab() {
  const { pendingChatMessage } = useTabContext();
  const [state, setState] = useState<ViewState>(() =>
    pendingChatMessage ? { view: "create" } : deriveInitialState()
  );

  const goToList = useCallback(() => {
    setState({ view: "list" });
    history.pushState(null, "", "/forum");
  }, []);

  const goToCreate = useCallback(() => {
    setState({ view: "create" });
    history.pushState(null, "", "/forum/new");
  }, []);

  const goToDetail = useCallback((id: number) => {
    setState({ view: "detail", agendaId: id });
    history.pushState(null, "", `/forum/${id}`);
  }, []);

  useEffect(() => {
    const onPopState = () => setState(deriveInitialState());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  if (state.view === "create") {
    return <AgendaWizard onBack={goToList} onCreated={goToDetail} />;
  }

  if (state.view === "detail") {
    return <AgendaDetailView agendaId={state.agendaId} onBack={goToList} />;
  }

  return <AgendaListView onSelect={goToDetail} onCreate={goToCreate} />;
}
