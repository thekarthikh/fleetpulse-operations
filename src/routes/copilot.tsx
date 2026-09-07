import { createFileRoute } from "@tanstack/react-router";
import { CopilotPanel } from "@/components/fleet/copilot-panel";
import { PageHeader } from "@/components/fleet/ui";

export const Route = createFileRoute("/copilot")({
  component: CopilotPage,
});

function CopilotPage() {
  return (
    <>
      <PageHeader
        title="Fleet Copilot"
        subtitle="AI-style operational assistant powered by live fleet data"
      />
      <CopilotPanel />
    </>
  );
}
