import { router } from '@/lib/trpc'
import { campaignRouter } from './campaign'
import { evaluationRouter } from './evaluation'
import { objectiveRouter } from './objective'
import { userRouter } from './user'
import { reportRouter } from './report'

export const appRouter = router({
  campaign: campaignRouter,
  evaluation: evaluationRouter,
  objective: objectiveRouter,
  user: userRouter,
  report: reportRouter,
})

export type AppRouter = typeof appRouter
