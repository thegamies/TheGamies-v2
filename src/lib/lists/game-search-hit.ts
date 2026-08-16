export type GameSearchHit = {
  id: string;
  igdbId: number;
  slug: string;
  title: string;
  year: number | null;
  coverUrl: string | null;
};

export type SearchGamesForListInput = {
  q: string;
  year?: number;
  gotyMode?: boolean;
  eligibility?: string;
  allowEditions?: boolean;
};
