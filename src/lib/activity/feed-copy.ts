import type { ActivityKind } from "@/lib/activity/kinds";
import type {
  FeedCard,
  FeedCardSection,
  FeedLibrarySection,
  FeedListSection,
} from "@/lib/activity/group-feed";

function libraryHeadline(name: string, section: FeedLibrarySection): string {
  const count = section.games.length;
  switch (section.kind) {
    case "library_wishlist":
      return count <= 1
        ? `${name} wishlisted`
        : `${name} wishlisted ${count} games`;
    case "library_backlog":
      return count <= 1
        ? `${name} added to the backlog`
        : `${name} added ${count} games to the backlog`;
    case "library_playing":
      return count <= 1
        ? `${name} is playing`
        : `${name} is playing ${count} games`;
    case "library_paused":
      return count <= 1
        ? `${name} paused`
        : `${name} paused ${count} games`;
    case "library_beat":
      return count <= 1 ? `${name} beat` : `${name} beat ${count} games`;
    case "library_dropped":
      return count <= 1
        ? `${name} dropped`
        : `${name} dropped ${count} games`;
    case "library_cleared":
      return `${name} updated a library`;
    default:
      return `${name} updated their library`;
  }
}

function listHeadline(name: string, section: FeedListSection): string {
  const title = section.listTitle ?? "Game of the Year";
  if (section.revealed && !section.added.length && !section.removed.length) {
    return `${name} ranked ${title}`;
  }
  if (section.added.length && section.removed.length) {
    return `${name} updated ${title}`;
  }
  if (section.removed.length && !section.added.length) {
    return `${name} removed games from ${title}`;
  }
  if (section.added.length) {
    return `${name} added games to ${title}`;
  }
  if (section.revealed) return `${name} ranked ${title}`;
  return `${name} updated ${title}`;
}

function sectionHeadline(name: string, section: FeedCardSection): string {
  return section.type === "library"
    ? libraryHeadline(name, section)
    : listHeadline(name, section);
}

export function feedCardHeadline(card: FeedCard): string {
  const name = card.displayName;
  const { sections } = card;
  if (sections.length === 0) return `${name} updated their games`;
  if (sections.length === 1) return sectionHeadline(name, sections[0]!);
  const onlyLibrary = sections.every((section) => section.type === "library");
  if (onlyLibrary) return `${name} updated their library`;
  const onlyList = sections.every((section) => section.type === "list");
  if (onlyList) return `${name} updated their lists`;
  return `${name} updated their games`;
}

/** Per-game verb on a grouped activity row. */
export function feedGameAction(kind: ActivityKind): string | null {
  switch (kind) {
    case "library_playing":
      return "Started playing";
    case "library_beat":
      return "Beat";
    case "library_wishlist":
      return "Wishlisted";
    case "library_backlog":
      return "Backlog";
    case "library_paused":
      return "Paused";
    case "library_dropped":
      return "Dropped";
    case "list_add":
      return "Added";
    case "list_remove":
      return "Removed";
    default:
      return null;
  }
}
