import { z } from "zod";

export const CeoServiceItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  nsi: z.string().optional().nullable(),
  stage: z.string(),
  stageLabel: z.string(),
  serviceType: z.string().optional().nullable(),
  createdAt: z.string(),
  formattedDate: z.string(),
  year: z.number(),
  month: z.number(), // 1 to 12
  monthName: z.string(),
  rating: z.number().optional().nullable(),
  technician: z.string().optional().nullable(),
  amount: z.number().optional().nullable(),
  formattedAmount: z.string(),
  financialStatus: z.enum(["WON", "LOST", "PIPELINE"]),
});

export const MonthlyDataSchema = z.object({
  monthName: z.string(),
  shortName: z.string(),
  monthIndex: z.number(), // 1 to 12
  total: z.number(),
  completed: z.number(),
  revenue: z.number(),
  formattedRevenue: z.string(),
});

export const TechnicianKmStatSchema = z.object({
  name: z.string(),
  totalKm: z.number(),
  servicesCount: z.number(),
  daysOnRoad: z.number(),
  avgKmPerService: z.number(),
  avgKmPerDay: z.number(),
});

export const FleetKmStatsSchema = z.object({
  totalFleetKm: z.number(),
  technicians: z.array(TechnicianKmStatSchema),
});

export const FinancialMetricsSchema = z.object({
  wonRevenue: z.number(),
  forecastPipeline: z.number(),
  weightedForecast: z.number(),
  lostRevenue: z.number(),
  financialWinRate: z.number(), // % em valor (won / (won + lost))
  dealWinRate: z.number(), // % em número de negócios
  averageDealSize: z.number(), // Ticket médio das ganhas
  wonDealsCount: z.number(),
  lostDealsCount: z.number(),
  pipelineDealsCount: z.number(),
  formattedWonRevenue: z.string(),
  formattedForecastPipeline: z.string(),
  formattedWeightedForecast: z.string(),
  formattedLostRevenue: z.string(),
  formattedAverageDealSize: z.string(),
});

export const ClientFollowUpSchema = z.object({
  id: z.string(),
  clientName: z.string(),
  nsi: z.string().optional().nullable(),
  stage: z.string(),
  stageLabel: z.string(),
  followUpDate: z.string(),
  formattedFollowUpDate: z.string(),
  daysRemaining: z.number(), // negativo = atrasado, 0 = hoje, 1 = amanhã
  urgencyStatus: z.enum(["OVERDUE", "TODAY", "TOMORROW", "UPCOMING"]),
  contactPhone: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  amount: z.number().optional().nullable(),
  formattedAmount: z.string(),
});

export const TechnicianRankingSchema = z.object({
  rank: z.number(),
  name: z.string(),
  totalTasks: z.number(),
  completedCount: z.number(),
  incompleteCount: z.number(),
  cancelledCount: z.number(),
  scheduledCount: z.number(),
  inProgressCount: z.number(),
  successRate: z.number(), // Concluídos / (Concluídos + Incompletos + Cancelados) * 100
  totalKm: z.number(),
});

export const CeoMetricsSchema = z.object({
  availableYears: z.array(z.number()),
  selectedYear: z.number().nullable(),
  financial: FinancialMetricsSchema,
  overview: z.object({
    totalActiveOpportunities: z.number(),
    completedOpportunities: z.number(),
    globalConversionRate: z.number(), // percentual (ex: 78.5)
    averageRating: z.number(), // média de estrelas de 1 a 5
    totalRatingsCount: z.number(),
    firstTimeSuccessRate: z.number(), // taxa de sucesso à 1ª visita %
  }),
  monthlyEvolution: z.array(MonthlyDataSchema),
  fleetKmStats: FleetKmStatsSchema,
  pipelineFunnel: z.array(z.object({
    stage: z.string(),
    label: z.string(),
    count: z.number(),
    percentage: z.number(),
    color: z.string(),
    totalAmount: z.number(),
    formattedTotalAmount: z.string(),
  })),
  fieldEfficiency: z.object({
    totalTasks: z.number(),
    completedTasks: z.number(),
    incompleteTasks: z.number(),
    cancelledTasks: z.number(),
    scheduledTasks: z.number(),
    inProgressTasks: z.number(),
  }),
  warehouseStats: z.object({
    totalItems: z.number(),
    preparedItems: z.number(),
    pendingItems: z.number(),
    preparationRate: z.number(), // %
  }),
  recentFeedback: z.array(z.object({
    id: z.string(),
    clientName: z.string(),
    nsi: z.string().optional().nullable(),
    rating: z.number(),
    feedback: z.string().optional().nullable(),
    date: z.string(),
  })),
  topTechnicians: z.array(z.object({
    name: z.string(),
    completedCount: z.number(),
    successRate: z.number(),
  })),
  technicianRankings: z.array(TechnicianRankingSchema),
  upcomingFollowUps: z.array(ClientFollowUpSchema),
  servicesList: z.array(CeoServiceItemSchema),
});

export type CeoServiceItem = z.infer<typeof CeoServiceItemSchema>;
export type MonthlyData = z.infer<typeof MonthlyDataSchema>;
export type TechnicianKmStat = z.infer<typeof TechnicianKmStatSchema>;
export type FleetKmStats = z.infer<typeof FleetKmStatsSchema>;
export type FinancialMetrics = z.infer<typeof FinancialMetricsSchema>;
export type ClientFollowUp = z.infer<typeof ClientFollowUpSchema>;
export type TechnicianRanking = z.infer<typeof TechnicianRankingSchema>;
export type CeoMetrics = z.infer<typeof CeoMetricsSchema>;
