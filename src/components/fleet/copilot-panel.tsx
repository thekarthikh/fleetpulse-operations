"use client";
import { useState } from "react";
import { Panel } from "@/components/fleet/ui";
import { Link } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const suggested = [
  "Which vehicles need attention right now?",
  "What are the most serious active alerts?",
  "Which vehicles have low fuel?",
  "Which vehicles are overheating?",
  "Summarize the current fleet health.",
];

export function CopilotPanel() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<null | { answer: string; viewAllLink?: string; count?: number }>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async (q: string) => {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await fetch("/api/public/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Request failed");
      }
      const data = await res.json();
      setResponse(data);
    } catch (e:any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    ask(question.trim());
  };

  return (
    <Panel className="p-4">
      <h2 className="text-lg font-semibold mb-2">Fleet Copilot</h2>
      <p className="text-sm text-muted-foreground mb-3">Ask operational questions about the current fleet. Answers are generated from live telemetry and alerts.</p>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
        <Input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Enter question..." className="flex-1" />
        <Button type="submit" disabled={loading}>Ask</Button>
      </form>
      <div className="flex flex-wrap gap-2 mb-3">
        {suggested.map(s => (
          <Button key={s} variant="outline" size="sm" onClick={() => { setQuestion(s); ask(s); }} disabled={loading}>
            {s}
          </Button>
        ))}
      </div>
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Generating answer…
        </div>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {response && (
        <div className="mt-2 p-2 bg-muted/30 rounded">
          <p className="whitespace-pre-wrap">{response.answer}</p>
          {response.viewAllLink && response.count !== undefined && (
            <div className="mt-2">
              <Link to={response.viewAllLink} className="text-primary underline">
                View all {response.count} vehicles
              </Link>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
