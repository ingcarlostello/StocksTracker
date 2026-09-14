import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { portfolioFields } from "./schema";
import { validatePortfolioName } from "../domain/portfolio/portfolio-name.service";
import { PORTFOLIO_ERROR_CODES } from "../domain/portfolio/portfolio.constants";
import type { PortfolioErrorData } from "../domain/portfolio/portfolio.type";

const portfolioDocValidator = v.object({
  _id: v.id("portfolios"),
  _creationTime: v.number(),
  ...portfolioFields,
});

function fail(data: PortfolioErrorData): never {
  throw new ConvexError(data);
}

function validNameOrFail(name: string): { name: string; nameKey: string } {
  const result = validatePortfolioName(name);
  if (!result.ok) fail({ code: PORTFOLIO_ERROR_CODES.VALIDATION, issue: result.code });
  return { name: result.name, nameKey: result.nameKey };
}

// Mutations are serializable, so this read-then-write cannot race another create or rename.
async function assertNameAvailable(ctx: MutationCtx, nameKey: string, exceptId?: Id<"portfolios">): Promise<void> {
  const existing = await ctx.db
    .query("portfolios")
    .withIndex("by_name_key", (q) => q.eq("nameKey", nameKey))
    .first();
  if (existing && existing._id !== exceptId) {
    fail({ code: PORTFOLIO_ERROR_CODES.DUPLICATE_NAME, name: existing.name });
  }
}

// Creation order, so the selector keeps a stable order as portfolios are added or renamed.
export const list = query({
  args: {},
  returns: v.array(portfolioDocValidator),
  handler: async (ctx) => {
    return await ctx.db.query("portfolios").collect();
  },
});

export const create = mutation({
  args: { name: v.string() },
  returns: v.id("portfolios"),
  handler: async (ctx, args) => {
    const { name, nameKey } = validNameOrFail(args.name);
    await assertNameAvailable(ctx, nameKey);
    return await ctx.db.insert("portfolios", { name, nameKey, createdAt: Date.now() });
  },
});

export const rename = mutation({
  args: { id: v.id("portfolios"), name: v.string() },
  returns: v.null(),
  handler: async (ctx, { id, ...args }) => {
    const existing = await ctx.db.get("portfolios", id);
    if (!existing) fail({ code: PORTFOLIO_ERROR_CODES.NOT_FOUND, id });
    const { name, nameKey } = validNameOrFail(args.name);
    await assertNameAvailable(ctx, nameKey, id);
    await ctx.db.patch("portfolios", id, { name, nameKey });
    return null;
  },
});

// Only an empty portfolio can be removed, so no transaction history is ever deleted with it.
export const remove = mutation({
  args: { id: v.id("portfolios") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const existing = await ctx.db.get("portfolios", id);
    if (!existing) fail({ code: PORTFOLIO_ERROR_CODES.NOT_FOUND, id });
    const transaction = await ctx.db
      .query("transactions")
      .withIndex("by_portfolio_date", (q) => q.eq("portfolioId", id))
      .first();
    if (transaction) fail({ code: PORTFOLIO_ERROR_CODES.NOT_EMPTY, id });
    await ctx.db.delete("portfolios", id);
    return null;
  },
});
