import { internalMutation, query } from "./_generated/server";

const DEFAULT_MDAS = [
  { acronym: "NPA", name: "Nigerian Ports Authority" },
  { acronym: "NCS", name: "Nigeria Customs Service" },
  { acronym: "CAC", name: "Corporate Affairs Commission" },
  { acronym: "NIS", name: "Nigeria Immigration Service" },
  { acronym: "FIRS", name: "Federal Inland Revenue Service" },
  { acronym: "SON", name: "Standards Organisation of Nigeria" },
  { acronym: "NAFDAC", name: "National Agency for Food and Drug Administration and Control" },
];

/** Public list for the complaint form. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const mdas = await ctx.db.query("mdas").collect();
    return mdas.sort((a, b) => a.acronym.localeCompare(b.acronym));
  },
});

/** One-off setup: npx convex run mdas:seed */
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    let added = 0;
    for (const mda of DEFAULT_MDAS) {
      const exists = await ctx.db
        .query("mdas")
        .withIndex("by_acronym", (q) => q.eq("acronym", mda.acronym))
        .unique();
      if (!exists) {
        await ctx.db.insert("mdas", mda);
        added++;
      }
    }
    return `Added ${added} MDAs.`;
  },
});
