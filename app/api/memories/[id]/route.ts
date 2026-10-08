import { deleteMemory } from "@/lib/memory";

/** Forget one saved memory. */
export async function DELETE(_request: Request, { params }: RouteContext<"/api/memories/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "Invalid id" }, { status: 400 });
  const deleted = await deleteMemory(id);
  if (!deleted) return Response.json({ error: "Memory not found" }, { status: 404 });
  return Response.json({ ok: true });
}
