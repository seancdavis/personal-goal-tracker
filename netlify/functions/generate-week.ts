import type { Context } from "@netlify/functions";
import { eq, and, ne } from "drizzle-orm";
import { db, schema } from "./_shared/db";
import { json, error, methodNotAllowed } from "./_shared/response";

function getWeekStartDate(weekId: string): string {
  const [year, week] = weekId.split("-").map(Number);
  const jan4 = new Date(year, 0, 4);
  const jan4DayOfWeek = jan4.getDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - jan4DayOfWeek + 1);
  const targetDate = new Date(firstMonday);
  targetDate.setDate(firstMonday.getDate() + (week - 1) * 7);
  return targetDate.toISOString().split("T")[0];
}

function getWeekEndDate(weekId: string): string {
  const startDate = new Date(getWeekStartDate(weekId));
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  return endDate.toISOString().split("T")[0];
}

export default async function handler(req: Request, context: Context) {
  const url = new URL(req.url);
  const pathParts = url.pathname.replace("/api/generate-week", "").split("/").filter(Boolean);
  const action = pathParts[0]; // "data" or nothing

  try {
    // GET /api/generate-week/data?previousWeekId=XXXX - Get wizard data
    if (req.method === "GET" && action === "data") {
      const previousWeekId = url.searchParams.get("previousWeekId");

      // Get active recurring tasks (all pre-selected)
      const recurringTasks = await db
        .select()
        .from(schema.recurringTasks)
        .where(eq(schema.recurringTasks.isActive, true));

      const wizardRecurring = recurringTasks.map((t) => ({
        ...t,
        selected: true,
      }));

      // If no previous week, return just recurring tasks
      if (!previousWeekId) {
        return json({
          recurringTasks: wizardRecurring,
          incompleteTasks: [],
          followUps: [],
          backlogItems: [],
        });
      }

      // Get incomplete tasks from previous week
      const incompleteTasks = await db
        .select({
          id: schema.tasks.id,
          weekId: schema.tasks.weekId,
          categoryId: schema.tasks.categoryId,
          title: schema.tasks.title,
          contentMarkdown: schema.tasks.contentMarkdown,
          contentHtml: schema.tasks.contentHtml,
          status: schema.tasks.status,
          isRecurring: schema.tasks.isRecurring,
          stalenessCount: schema.tasks.stalenessCount,
          previousVersionId: schema.tasks.previousVersionId,
          createdAt: schema.tasks.createdAt,
          updatedAt: schema.tasks.updatedAt,
          category: schema.categories,
        })
        .from(schema.tasks)
        .leftJoin(schema.categories, eq(schema.tasks.categoryId, schema.categories.id))
        .where(
          and(
            eq(schema.tasks.weekId, previousWeekId),
            ne(schema.tasks.status, "completed")
          )
        );

      // Pre-select incomplete tasks, but auto-deselect very stale (4+)
      const wizardIncomplete = incompleteTasks.map((t) => ({
        ...t,
        selected: t.stalenessCount < 4,
      }));

      // Get follow-ups (all pre-selected)
      const followUps = await db
        .select({
          id: schema.followUps.id,
          sourceTaskId: schema.followUps.sourceTaskId,
          categoryId: schema.followUps.categoryId,
          title: schema.followUps.title,
          contentMarkdown: schema.followUps.contentMarkdown,
          contentHtml: schema.followUps.contentHtml,
          createdAt: schema.followUps.createdAt,
          category: schema.categories,
        })
        .from(schema.followUps)
        .leftJoin(schema.categories, eq(schema.followUps.categoryId, schema.categories.id));

      const wizardFollowUps = followUps.map((f) => ({
        ...f,
        selected: true,
      }));

      // Get backlog items (none pre-selected)
      const backlogItems = await db
        .select({
          id: schema.backlogItems.id,
          categoryId: schema.backlogItems.categoryId,
          title: schema.backlogItems.title,
          contentMarkdown: schema.backlogItems.contentMarkdown,
          contentHtml: schema.backlogItems.contentHtml,
          priority: schema.backlogItems.priority,
          createdAt: schema.backlogItems.createdAt,
          updatedAt: schema.backlogItems.updatedAt,
          category: schema.categories,
        })
        .from(schema.backlogItems)
        .leftJoin(schema.categories, eq(schema.backlogItems.categoryId, schema.categories.id))
        .orderBy(schema.backlogItems.priority);

      const wizardBacklog = backlogItems.map((b) => ({
        ...b,
        selected: false,
      }));

      return json({
        recurringTasks: wizardRecurring,
        incompleteTasks: wizardIncomplete,
        followUps: wizardFollowUps,
        backlogItems: wizardBacklog,
      });
    }

    // POST /api/generate-week - Generate new week
    if (req.method === "POST" && !action) {
      const body = await req.json();
      const {
        weekId,
        recurringTaskIds,
        incompleteTaskIds,
        followUpIds,
        backlogItemIds,
      } = body;

      if (!weekId) {
        return error("weekId is required");
      }

      // Check if week already exists
      const [existing] = await db
        .select()
        .from(schema.weeks)
        .where(eq(schema.weeks.id, weekId));
      if (existing) {
        return error("Week already exists", 409);
      }

      // Create the week
      const startDate = getWeekStartDate(weekId);
      const endDate = getWeekEndDate(weekId);

      const [week] = await db
        .insert(schema.weeks)
        .values({
          id: weekId,
          startDate,
          endDate,
          totalTasks: 0,
          completedTasks: 0,
        })
        .returning();

      let taskCount = 0;

      // Add selected recurring tasks
      if (recurringTaskIds?.length) {
        const recurringTasks = await db
          .select()
          .from(schema.recurringTasks)
          .where(eq(schema.recurringTasks.isActive, true));

        for (const rt of recurringTasks) {
          if (recurringTaskIds.includes(rt.id)) {
            await db.insert(schema.tasks).values({
              weekId,
              categoryId: rt.categoryId,
              title: rt.title,
              contentMarkdown: rt.contentMarkdown,
              contentHtml: rt.contentHtml,
              isRecurring: true,
              stalenessCount: 0,
            });
            taskCount++;
          }
        }
      }

      // Add selected incomplete tasks (carry over with incremented staleness)
      if (incompleteTaskIds?.length) {
        const incompleteTasks = await db
          .select()
          .from(schema.tasks)
          .where(eq(schema.tasks.status, "pending"));

        for (const task of incompleteTasks) {
          if (incompleteTaskIds.includes(task.id)) {
            await db.insert(schema.tasks).values({
              weekId,
              categoryId: task.categoryId,
              title: task.title,
              contentMarkdown: task.contentMarkdown,
              contentHtml: task.contentHtml,
              isRecurring: task.isRecurring,
              stalenessCount: task.stalenessCount + 1,
              previousVersionId: task.id,
            });
            taskCount++;
          }
        }
      }

      // Add selected follow-ups
      if (followUpIds?.length) {
        const followUps = await db.select().from(schema.followUps);

        for (const fu of followUps) {
          if (followUpIds.includes(fu.id)) {
            await db.insert(schema.tasks).values({
              weekId,
              categoryId: fu.categoryId,
              title: fu.title,
              contentMarkdown: fu.contentMarkdown,
              contentHtml: fu.contentHtml,
              stalenessCount: 0,
            });
            taskCount++;

            // Delete the follow-up after converting to task
            await db.delete(schema.followUps).where(eq(schema.followUps.id, fu.id));
          }
        }
      }

      // Add selected backlog items
      if (backlogItemIds?.length) {
        const backlogItems = await db.select().from(schema.backlogItems);

        for (const bi of backlogItems) {
          if (backlogItemIds.includes(bi.id)) {
            const [task] = await db
              .insert(schema.tasks)
              .values({
                weekId,
                categoryId: bi.categoryId,
                title: bi.title,
                contentMarkdown: bi.contentMarkdown,
                contentHtml: bi.contentHtml,
                stalenessCount: 0,
              })
              .returning();
            taskCount++;

            // Copy notes from backlog item to task
            const notes = await db
              .select()
              .from(schema.notes)
              .where(eq(schema.notes.backlogItemId, bi.id));

            for (const note of notes) {
              await db.insert(schema.notes).values({
                taskId: task.id,
                contentMarkdown: note.contentMarkdown,
                contentHtml: note.contentHtml,
              });
            }

            // Delete the backlog item after converting to task
            await db.delete(schema.backlogItems).where(eq(schema.backlogItems.id, bi.id));
          }
        }
      }

      // Update week stats
      await db
        .update(schema.weeks)
        .set({ totalTasks: taskCount })
        .where(eq(schema.weeks.id, weekId));

      const [updatedWeek] = await db
        .select()
        .from(schema.weeks)
        .where(eq(schema.weeks.id, weekId));

      return json(updatedWeek, 201);
    }

    return methodNotAllowed();
  } catch (err) {
    console.error("Generate week API error:", err);
    return error("Internal server error", 500);
  }
}
