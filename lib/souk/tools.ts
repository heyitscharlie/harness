import { z } from "zod";
import { defineTool } from "@/lib/harness/agent/tool";
import { DIRECTORY, findPartner } from "./directory";

/** This is "the form": the same validation a partnership form would have. */
export const PartnershipSchema = z.object({
  partnerId: z.string().describe("The partner's id from search_partners. Never guess it."),
  type: z.enum(["distribution", "integration", "channel", "referral"]),
  ownerEmail: z.email().describe("Email of the person on our side who owns the partnership."),
  notes: z.string().optional(),
});

export type Partnership = z.infer<typeof PartnershipSchema> & {
  id: string;
  partnerName: string;
  status: "proposed";
};

export type Email = { to: string; subject: string; body: string };

/**
 * Where tools write to. Injected rather than global so each eval case gets
 * a fresh, isolated store, and the same tools could later write to a database.
 */
export type Store = { partnerships: Partnership[]; outbox: Email[] };
export const createStore = (): Store => ({ partnerships: [], outbox: [] });

export function createTools(store: Store) {
  return [
    defineTool({
      name: "search_partners",
      description:
        "Search the partner directory. All filters are optional; combine them to narrow results. Returns matching partners with their ids.",
      schema: z.object({
        query: z.string().optional().describe("Free text matched against name, category and description."),
        region: z.enum(["EU", "UK", "US", "APAC"]).optional(),
        category: z.string().optional().describe("e.g. payments, logistics, infrastructure, distribution, software, marketing"),
      }),
      execute: ({ query, region, category }) => {
        const q = query?.toLowerCase();
        const results = DIRECTORY.filter(
          (p) =>
            (!region || p.region === region) &&
            (!category || p.category === category.toLowerCase()) &&
            (!q || `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(q)),
        ).map(({ id, name, category, region, description }) => ({ id, name, category, region, description })); // no contact details
        return { count: results.length, results };
      },
    }),

    defineTool({
      name: "create_partnership",
      description:
        "Create a proposed partnership record. Only call this once you know the partnerId (from search_partners), the type and the owner's email.",
      schema: PartnershipSchema,
      execute: (args) => {
        // Hallucination guard: the schema can check that partnerId is a
        // string, but only the data can check that it's a real partner.
        const partner = findPartner(args.partnerId);
        if (!partner) throw new Error(`Unknown partnerId "${args.partnerId}". Use search_partners to find a valid id.`);
        const record: Partnership = {
          ...args,
          id: `ps_${store.partnerships.length + 1}`,
          partnerName: partner.name,
          status: "proposed",
        };
        store.partnerships.push(record);
        return record;
      },
    }),

    defineTool({
      name: "list_partnerships",
      description: "List partnerships created so far.",
      schema: z.object({}),
      execute: () => ({ partnerships: store.partnerships }),
    }),

    defineTool({
      name: "send_intro_email",
      description: "Send an introduction email to a partner's contact. Only call this when the user asks you to.",
      schema: z.object({
        partnerId: z.string(),
        subject: z.string().min(1).max(120),
        body: z.string().min(1).max(2000),
      }),
      execute: ({ partnerId, subject, body }) => {
        const partner = findPartner(partnerId);
        if (!partner) throw new Error(`Unknown partnerId "${partnerId}".`);
        store.outbox.push({ to: partner.contactEmail, subject, body });
        return { sent: true, to: partner.contactEmail, note: "Demo outbox: nothing was really sent." };
      },
    }),
  ];
}
