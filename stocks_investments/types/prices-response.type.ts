// Contract of GET /api/prices, shared by the route handler and the client price service.
export type PricesResponse = {
  // Trading day the closes belong to ("YYYY-MM-DD").
  asOfDate: string;
  prices: Record<string, number>;
  // Requested symbols with no close on asOfDate.
  missing: string[];
  // Epoch ms when the response was produced.
  fetchedAt: number;
};
