import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { StoryCard } from "../../types";
import { useCreateScenarioCard, useImportScenarioCards, useExportScenarioCards } from "../../hooks/useScenario";
import { downloadJson } from "../../lib/downloadJson";
import { CardEditor } from "./CardEditor";

/** Story-card editor for draft scenario cards plus simple card creation. */
export function ScenarioCardEditor({ scenarioId, cards }: { scenarioId: string; cards: StoryCard[] }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("New Card");
  const [importRaw, setImportRaw] = useState("[]");
  const createCard = useCreateScenarioCard(scenarioId);
  const importCards = useImportScenarioCards(scenarioId);
  const exportCards = useExportScenarioCards(scenarioId);

  return <div className="stack">
    <form className="inline-form" onSubmit={(event) => { event.preventDefault(); createCard.mutate({ title, cardType: "concept", activationMode: "triggered", triggerWords: [] }); }}><input value={title} onChange={(event) => setTitle(event.target.value)} /><button>Add Card</button><button type="button" className="ghost" onClick={() => exportCards.mutate()}>Export Cards</button></form>
    <details className="subcard"><summary>Import Cards</summary><textarea value={importRaw} onChange={(event) => setImportRaw(event.target.value)} /><button onClick={() => importCards.mutate({ cards: JSON.parse(importRaw), replace: false })}>Import Cards</button></details>
    {cards.map((card, index) => <CardEditor key={card.id} card={card} scenarioId={scenarioId} cards={cards} index={index} />)}
  </div>;
}
