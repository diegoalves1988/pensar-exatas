import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";

// Helper to check if user is admin
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============= SUBJECTS ROUTER =============
  subjects: router({
    list: publicProcedure.query(async () => {
      return db.getAllSubjects();
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getSubjectById(input.id);
      }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        order: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createSubject(input);
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        order: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateSubject(id, data);
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteSubject(input.id);
      }),
  }),

  // ============= QUESTIONS ROUTER =============
  questions: router({
    list: publicProcedure.query(async () => {
      return db.getAllQuestions();
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getQuestionById(input.id);
      }),

    getBySubject: publicProcedure
      .input(z.object({ subjectId: z.number() }))
      .query(async ({ input }) => {
        return db.getQuestionsBySubject(input.subjectId);
      }),

    create: adminProcedure
      .input(z.object({
        subjectId: z.number(),
        title: z.string().min(1),
        statement: z.string().min(1),
        solution: z.string().min(1),
        difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
        year: z.number().optional(),
        sourceUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createQuestion(input);
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        subjectId: z.number().optional(),
        title: z.string().optional(),
        statement: z.string().optional(),
        solution: z.string().optional(),
        difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
        year: z.number().optional(),
        sourceUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateQuestion(id, data);
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteQuestion(input.id);
      }),
  }),

  // ============= LESSONS ROUTER =============
  lessons: router({
    getBySubject: publicProcedure
      .input(z.object({ subjectId: z.number() }))
      .query(async ({ input }) => {
        return db.getLessonsBySubject(input.subjectId);
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getLessonById(input.id);
      }),

    create: adminProcedure
      .input(z.object({
        subjectId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        videoUrl: z.string().optional(),
        duration: z.number().optional(),
        order: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createLesson(input);
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        subjectId: z.number().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        videoUrl: z.string().optional(),
        duration: z.number().optional(),
        order: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateLesson(id, data);
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteLesson(input.id);
      }),
  }),

  // ============= USER PROGRESS ROUTER =============
  progress: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      let progress = await db.getUserProgress(ctx.user.id);
      if (!progress) {
        await db.initializeUserProgress(ctx.user.id);
        progress = await db.getUserProgress(ctx.user.id);
      }
      return progress;
    }),

    getBadges: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserBadges(ctx.user.id);
    }),

    update: protectedProcedure
      .input(z.object({
        questionsResolved: z.number().optional(),
        totalPoints: z.number().optional(),
        currentStreak: z.number().optional(),
        bestStreak: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.updateUserProgress(ctx.user.id, input);
      }),

    awardBadge: protectedProcedure
      .input(z.object({ badgeType: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return db.awardBadge(ctx.user.id, input.badgeType);
      }),
  }),

  // ============= USER FAVORITES ROUTER =============
  favorites: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserFavorites(ctx.user.id);
    }),

    add: protectedProcedure
      .input(z.object({ questionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return db.addFavorite(ctx.user.id, input.questionId);
      }),

    remove: protectedProcedure
      .input(z.object({ questionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return db.removeFavorite(ctx.user.id, input.questionId);
      }),
  }),

  // ============= PORTFOLIO ROUTER =============
  portfolio: router({
    getProfile: publicProcedure.query(async () => {
      return db.getPortfolioProfile();
    }),

    updateProfile: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        title: z.string().optional(),
        bio: z.string().optional(),
        profileImage: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.updatePortfolioProfile(input);
      }),

    getItems: publicProcedure.query(async () => {
      return db.getPortfolioItems();
    }),

    getItemsByType: publicProcedure
      .input(z.object({ type: z.enum(['education', 'experience', 'project', 'social']) }))
      .query(async ({ input }) => {
        return db.getPortfolioItemsByType(input.type);
      }),

    createItem: adminProcedure
      .input(z.object({
        type: z.enum(['education', 'experience', 'project', 'social']),
        title: z.string().min(1),
        description: z.string().optional(),
        institution: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        url: z.string().optional(),
        icon: z.string().optional(),
        order: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createPortfolioItem(input);
      }),

    updateItem: adminProcedure
      .input(z.object({
        id: z.number(),
        type: z.enum(['education', 'experience', 'project', 'social']).optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        institution: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        url: z.string().optional(),
        icon: z.string().optional(),
        order: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updatePortfolioItem(id, data);
      }),

    deleteItem: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deletePortfolioItem(input.id);
      }),
  }),
});

export type AppRouter = typeof appRouter;

