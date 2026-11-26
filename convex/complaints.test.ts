/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const HOUR = 60 * 60 * 1000;

async function setup() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.mdas.seed, {});

  // Three people sign in (Clerk identities) and get stored as citizens.
  const ada = t.withIdentity({ subject: "user_ada", name: "Ada Business", email: "ada@example.com" });
  const officer = t.withIdentity({ subject: "user_npa", name: "Musa NPA", email: "musa@npa.gov.ng" });
  const officer2 = t.withIdentity({ subject: "user_cac", name: "Bisi CAC", email: "bisi@cac.gov.ng" });
  const admin = t.withIdentity({ subject: "user_admin", name: "PEBEC Admin", email: "admin@pebec.gov.ng" });
  for (const u of [ada, officer, officer2, admin]) await u.mutation(api.users.store, {});

  // Roles are granted server-side only.
  await t.mutation(internal.users.setRole, { email: "musa@npa.gov.ng", role: "officer", mdaAcronym: "NPA" });
  await t.mutation(internal.users.setRole, { email: "bisi@cac.gov.ng", role: "officer", mdaAcronym: "CAC" });
  await t.mutation(internal.users.setRole, { email: "admin@pebec.gov.ng", role: "admin" });

  const mdas = await t.query(api.mdas.list, {});
  const npa = mdas.find((m) => m.acronym === "NPA")!;
  return { t, ada, officer, officer2, admin, npa };
}

describe("complaint tracker", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test("citizen files a complaint and the right officer resolves it", async () => {
    const { ada, officer, officer2, npa } = await setup();

    const ref = await ada.mutation(api.complaints.create, {
      mdaId: npa._id,
      title: "Container release delayed",
      description: "My container has been held at Apapa for 10 days beyond the published timeline.",
    });
    expect(ref).toMatch(/^RG-[A-Z2-9]{6}$/);

    // NPA officer sees it; CAC officer does not.
    expect(await officer.query(api.complaints.inbox, {})).toHaveLength(1);
    expect(await officer2.query(api.complaints.inbox, {})).toHaveLength(0);

    const [c] = await officer.query(api.complaints.inbox, {});
    // Another MDA's officer cannot act on it.
    await expect(
      officer2.mutation(api.complaints.updateStatus, { complaintId: c._id, status: "resolved", note: "x" }),
    ).rejects.toThrow(/another MDA/);
    // Resolving needs a note for the business.
    await expect(
      officer.mutation(api.complaints.updateStatus, { complaintId: c._id, status: "resolved" }),
    ).rejects.toThrow(/note/);

    await officer.mutation(api.complaints.updateStatus, {
      complaintId: c._id,
      status: "resolved",
      note: "Released today; delay caused by a scanner fault.",
    });

    const detail = await ada.query(api.complaints.get, { reference: ref });
    expect(detail?.status).toBe("resolved");
    expect(detail?.events.map((e) => e.action)).toEqual(["Complaint submitted", "Marked resolved"]);
  });

  test("unresolved complaints escalate after 72 hours", async () => {
    const { t, ada, npa } = await setup();
    const ref = await ada.mutation(api.complaints.create, {
      mdaId: npa._id,
      title: "No response to permit request",
      description: "Submitted all documents three weeks ago and have received no response at all.",
    });

    vi.advanceTimersByTime(71 * HOUR);
    await t.finishInProgressScheduledFunctions();
    expect((await ada.query(api.complaints.get, { reference: ref }))?.status).toBe("open");

    vi.advanceTimersByTime(2 * HOUR);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const after = await ada.query(api.complaints.get, { reference: ref });
    expect(after?.status).toBe("escalated");
    expect(after?.events[after.events.length - 1]?.actor).toBe("System");
  });

  test("privacy and roles: citizens can't see others' complaints or admin data", async () => {
    const { t, ada, admin, npa } = await setup();
    const ref = await ada.mutation(api.complaints.create, {
      mdaId: npa._id,
      title: "Overcharged at the gate",
      description: "Asked to pay an unofficial fee of N20,000 to release goods at the terminal gate.",
    });

    const stranger = t.withIdentity({ subject: "user_x", name: "Stranger", email: "x@example.com" });
    await stranger.mutation(api.users.store, {});
    expect(await stranger.query(api.complaints.get, { reference: ref })).toBeNull();
    await expect(stranger.query(api.complaints.leaderboard, {})).rejects.toThrow(/permission/);
    await expect(ada.query(api.complaints.inbox, {})).rejects.toThrow(/permission/);

    // Admin can see it and the leaderboard.
    expect(await admin.query(api.complaints.get, { reference: ref })).not.toBeNull();
    const board = await admin.query(api.complaints.leaderboard, {});
    expect(board.find((r) => r.acronym === "NPA")?.total).toBe(1);
  });

  test("leaderboard scores on-time resolutions", async () => {
    const { t, ada, officer, admin, npa } = await setup();
    const mk = (title: string) =>
      ada.mutation(api.complaints.create, {
        mdaId: npa._id,
        title,
        description: "A detailed description of the service failure for testing.",
      });
    await mk("First complaint");
    await mk("Second complaint");

    const [a] = await officer.query(api.complaints.inbox, {});
    await officer.mutation(api.complaints.updateStatus, { complaintId: a._id, status: "resolved", note: "Done" });

    vi.advanceTimersByTime(73 * HOUR);
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const npaRow = (await admin.query(api.complaints.leaderboard, {})).find((r) => r.acronym === "NPA")!;
    expect(npaRow).toMatchObject({ total: 2, resolvedOnTime: 1, escalated: 1, pending: 0, score: 50 });
  });

  test("validation rejects bad input", async () => {
    const { ada, npa } = await setup();
    await expect(
      ada.mutation(api.complaints.create, { mdaId: npa._id, title: "Hi", description: "short" }),
    ).rejects.toThrow(/Title/);
  });
});
