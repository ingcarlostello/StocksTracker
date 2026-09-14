import type { PortfolioLike } from "./portfolio.type";

type StoredPortfolio<TId extends string> = Omit<PortfolioLike<TId>, "id"> & { _id: TId };

export function toPortfolioLike<TId extends string>({ _id, name, createdAt }: StoredPortfolio<TId>): PortfolioLike<TId> {
  return { id: _id, name, createdAt };
}
