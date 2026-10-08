import { DEFAULT_MODEL } from "@/lib/harness/agent/gemini";
import { SYSTEM_PROMPT } from "@/lib/example/agent";
import { SUITE } from "@/lib/example/suite";
import { Workbench } from "./components/workbench";

// Server Component: reads server-only modules, then hands plain,
// serialisable data to the client. Zod schemas and tools never leave the server.
export default function Home() {
  const cases = SUITE.map(({ id, name, input }) => ({ id, name, input }));
  return <Workbench model={DEFAULT_MODEL} defaultPrompt={SYSTEM_PROMPT} cases={cases} />;
}
