import { z } from "zod";

export const reportFiltersSchema = z.object({
  from: z.string().min(1), // "YYYY-MM-DD"
  to: z.string().min(1),
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  type: z.enum(["income", "expense", "transfer", "adjustment"]).optional(),
  paymentMethodId: z.string().optional(),
});

export type ReportFilters = z.infer<typeof reportFiltersSchema>;
