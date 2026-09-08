import type {
  CommunityCustomAnswerType,
  CommunityCustomEligibility,
  CommunityCustomSupportLinkKind,
} from "@thegamies/db";
import {
  AWARD_CATEGORY_ELIGIBILITIES,
  type AwardCategoryEligibility,
} from "@/lib/live-aggregate/award-category-defs";

export const CUSTOM_CATEGORY_NAME_MAX = 80;
export const CUSTOM_CATEGORY_DESCRIPTION_MAX = 500;
export const CUSTOM_ENTRY_TITLE_MAX = 120;
export const CUSTOM_ENTRY_DESCRIPTION_MAX = 500;
export const CUSTOM_CATEGORIES_PER_EDITION_MAX = 40;
export const CUSTOM_ENTRIES_PER_CATEGORY_MAX = 50;

export const CUSTOM_ANSWER_TYPES = [
  "any_game",
  "selected_games",
  "text_game",
  "text_only",
] as const satisfies readonly CommunityCustomAnswerType[];

export const CUSTOM_ELIGIBILITIES = AWARD_CATEGORY_ELIGIBILITIES;

export type CustomCategoryEligibility = AwardCategoryEligibility;

export function parseCustomCategoryEligibility(
  raw: string | null | undefined,
): CustomCategoryEligibility {
  if (
    raw &&
    (CUSTOM_ELIGIBILITIES as readonly string[]).includes(raw)
  ) {
    return raw as CustomCategoryEligibility;
  }
  return "current_year";
}

export function customAnswerTypeUsesEligibility(
  answerType: CommunityCustomAnswerType,
): boolean {
  return answerType === "any_game" || answerType === "selected_games";
}

export type CustomCategoryEntryView = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  gameId: string | null;
  gameTitle: string | null;
  gameSlug: string | null;
  coverUrl: string | null;
  supportLinkUrl: string | null;
  supportLinkKind: CommunityCustomSupportLinkKind | null;
  sortOrder: number;
  entrySource: string;
};

export type CustomCategoryView = {
  id: string;
  editionId: string;
  name: string;
  description: string;
  imageUrl: string | null;
  answerType: CommunityCustomAnswerType;
  eligibility: CommunityCustomEligibility;
  sortOrder: number;
  entries: CustomCategoryEntryView[];
};

export type EditionBallotCategoryKind = "site" | "custom";

export type EditionBallotCategoryRef = {
  kind: EditionBallotCategoryKind;
  id: string;
};
