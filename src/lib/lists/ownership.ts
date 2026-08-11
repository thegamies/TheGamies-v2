import { editSecretMatches } from "@/lib/lists/secrets";

export type ListOwnershipInput = {
  profileId: string | null;
  editSecretHash: string | null;
};

/** True when the signed-in profile owns this list. */
export function ownsListByProfile(
  list: Pick<ListOwnershipInput, "profileId">,
  profileId: string | null | undefined,
): boolean {
  return Boolean(profileId && list.profileId && list.profileId === profileId);
}

/** True when the edit cookie secret matches the stored hash. */
export function ownsListByEditSecret(
  list: Pick<ListOwnershipInput, "editSecretHash">,
  secret: string | null | undefined,
): boolean {
  if (!secret) return false;
  return editSecretMatches(secret, list.editSecretHash);
}

/** Session owner or valid edit secret can mutate. */
export function canEditList(
  list: ListOwnershipInput,
  opts: {
    profileId?: string | null;
    editSecret?: string | null;
  },
): boolean {
  return (
    ownsListByProfile(list, opts.profileId) ||
    ownsListByEditSecret(list, opts.editSecret)
  );
}
