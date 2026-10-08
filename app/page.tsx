import { Button, Card, CardContent, CardTitle, ModeToggle, PaletteSwitcher } from "@heyitscharlie/design-system";

// Temporary page to prove the design system is wired up. Replaced in Step 7.
export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">Eval Harness</h1>
        <div className="flex gap-2">
          <PaletteSwitcher />
          <ModeToggle />
        </div>
      </div>
      <Card>
        <CardTitle>Design system check</CardTitle>
        <CardContent className="flex gap-2">
          <Button>Primary</Button>
          <Button variant="outline">Outline</Button>
        </CardContent>
      </Card>
    </main>
  );
}
