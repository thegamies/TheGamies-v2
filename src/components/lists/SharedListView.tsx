"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CopyLinkButton } from "@/components/lists/CopyLinkButton";
import { ListFormatControl } from "@/components/lists/ListFormatControl";
import { RefreshOnBfcache } from "@/components/lists/RefreshOnBfcache";
import { SoftSavePrompt } from "@/components/lists/SoftSavePrompt";
import { ShareExportButton } from "@/components/list-export/ShareExportButton";
import { ListExportPoster } from "@/components/list-export/ListExportAwardsLayout";
import { EXPORT_LAYOUT_DEFAULT } from "@/components/list-export/exportDimensions";
import { rankChromeForStyle } from "@/components/list-export/rankChrome";
import { Button } from "@/components/ui/Button";
import { CategoryPickCard } from "@/components/ui/CategoryPickCard";
import { FitDisplayTitle } from "@/components/ui/FitDisplayTitle";
import { GameCover } from "@/components/ui/GameCover";
import { navItemClass } from "@/components/ui/navLevels";
import { ScrollableNav } from "@/components/ui/ScrollableNav";
import { RankMarker } from "@/components/ui/RankMarker";
import {
  parseStoredListFormat,
  parseStoredRankStyle,
  type ListFormat,
} from "@/lib/lists/schema";
import {
  listShareViewHref,
  withListShareView,
  type ListShareView,
} from "@/lib/lists/urls";

type SharedListItem = {
  gameId: string;
  slug: string;
  title: string;
  year: number | null;
  coverUrl: string | null;
  rank: number;
  blurb: string | null;
};

type SharedCategoryPick = {
  categoryId: string;
  label: string;
  description: string | null;
  slug: string;
  title: string;
  coverUrl: string | null;
};

type SharedListViewData = {
  owner: { username: string; displayName: string } | null;
  items: SharedListItem[];
  list: {
    publicId: string;
    listType: string;
    title: string;
    year: number | null;
    listFormat: string;
    rankStyle: string;
    showSuffix: boolean;
  };
};

const POSTER_W = 1080;
const POSTER_H = 1350;

type SharedListViewProps = {
  data: SharedListViewData;
  canEdit: boolean;
  canClaim: boolean;
  isSignedIn: boolean;
  alreadyOwned: boolean;
  editHref: string;
  sharePath: string;
  view?: ListShareView;
  categoryPicks?: SharedCategoryPick[];
  saved?: boolean;
  error?: string | null;
};

export function SharedListView({
  data,
  canEdit,
  canClaim,
  isSignedIn,
  alreadyOwned,
  editHref,
  sharePath,
  view = "goty",
  categoryPicks = [],
  saved = false,
  error = null,
}: SharedListViewProps) {
  const isGoty = data.list.listType !== "custom";
  const onCategories = isGoty && view === "categories";
  const [viewFormat, setViewFormat] = useState<ListFormat>(() =>
    parseStoredListFormat(data.list.listFormat),
  );
  const rankStyle = parseStoredRankStyle(data.list.rankStyle);
  const rankFormat = data.list.showSuffix ? "ordinal" : "number";
  const year = data.list.year ?? new Date().getUTCFullYear();
  const listType = isGoty ? "goty" : "custom";
  const count = onCategories ? categoryPicks.length : data.items.length;
  const countLabel = onCategories
    ? count === 1
      ? "pick"
      : "picks"
    : count === 1
      ? "game"
      : "games";
  const tabOpts = { saved, error };

  return (
    <main className="relative mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-10">
      <RefreshOnBfcache />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,90,31,0.12),_transparent_55%)]" />
      <div className="relative">
        {isGoty ? null : data.list.year ? (
          <p className="text-xs uppercase tracking-[0.2em] text-muted">
            {data.list.year}
          </p>
        ) : (
          <p className="text-xs uppercase tracking-[0.2em] text-muted">List</p>
        )}
        <h1
          className={`font-display text-5xl tracking-wide text-ink md:text-7xl ${
            isGoty ? "" : "mt-2"
          }`}
        >
          {data.list.title}
        </h1>
        <p className="mt-3 text-muted">
          {data.owner ? (
            <>
              By{" "}
              <Link
                href={`/u/${data.owner.username}`}
                className="text-ink hover:text-accent"
              >
                {data.owner.displayName}
              </Link>
            </>
          ) : (
            "Anonymous list"
          )}
          <span className="text-muted">
            {" "}
            · {count} {countLabel}
          </span>
        </p>

        {saved ? (
          <p className="mt-4 text-sm text-ink">Saved to your account.</p>
        ) : null}
        {error ? (
          <p className="mt-4 text-sm text-accent" role="alert">
            {error}
          </p>
        ) : null}

        <SoftSavePrompt
          publicId={data.list.publicId}
          canClaim={canClaim}
          isSignedIn={isSignedIn}
          alreadyOwned={alreadyOwned}
        />

        {isGoty ? (
          <ScrollableNav aria-label="List" className="mt-8">
            <Link
              href={listShareViewHref(sharePath, { ...tabOpts, view: "goty" })}
              className={navItemClass("secondary", !onCategories)}
            >
              Game of the Year
            </Link>
            <Link
              href={listShareViewHref(sharePath, {
                ...tabOpts,
                view: "categories",
              })}
              className={navItemClass("secondary", onCategories)}
            >
              Categories
            </Link>
          </ScrollableNav>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center gap-2">
          {onCategories ? null : (
            <ListFormatControl
              value={viewFormat}
              onChange={setViewFormat}
            />
          )}
          {alreadyOwned ? null : (
            <Link href="/create">
              <Button type="button" size="sm">
                Make your own
              </Button>
            </Link>
          )}
          <CopyLinkButton />
          {onCategories ? null : (
            <ShareExportButton
              games={data.items.map((item) => ({
                id: item.gameId,
                title: item.title,
                imageUrl: item.coverUrl,
              }))}
              year={year}
              title={data.list.title}
              listType={listType}
              rankStyle={rankStyle}
              rankFormat={rankFormat}
            />
          )}
          {canEdit ? (
            <Link href={withListShareView(editHref, view)}>
              <Button type="button" variant="bordered" size="sm">
                Edit
              </Button>
            </Link>
          ) : null}
        </div>

        {onCategories ? (
          <SharedCategoryPicks picks={categoryPicks} />
        ) : viewFormat === "poster" ? (
          <SharedPoster
            items={data.items}
            year={year}
            title={data.list.title}
            listType={listType}
            rankStyle={rankStyle}
            rankFormat={rankFormat}
          />
        ) : viewFormat === "grid" ? (
          <ul className="mt-10 grid grid-cols-3 gap-3 md:grid-cols-4 lg:grid-cols-5">
            {data.items.map((item) => (
              <li key={item.gameId} className="min-w-0">
                <Link href={`/games/${item.slug}`} className="group block">
                  <GameCover title={item.title} imageUrl={item.coverUrl} />
                  <div className="mt-2 flex items-baseline gap-1">
                    <span
                      className="shrink-0 font-display text-[18px] leading-none tracking-wide text-accent"
                      aria-label={`Rank ${item.rank}`}
                    >
                      {item.rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <FitDisplayTitle
                        className="w-full group-hover:text-accent"
                        maxPx={18}
                        minPx={12}
                        lines={2}
                      >
                        {item.title}
                      </FitDisplayTitle>
                      {isGoty || !item.year ? null : (
                        <p className="mt-0.5 text-xs text-muted">{item.year}</p>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <ol className="mt-10 divide-y divide-line border-y border-line">
            {data.items.map((item) => (
              <li key={item.gameId} className="flex items-center gap-5 py-5">
                <RankMarker rank={item.rank} size="lg" />
                <div className="w-16 shrink-0 sm:w-20">
                  <GameCover title={item.title} imageUrl={item.coverUrl} />
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/games/${item.slug}`}
                    className="block truncate text-lg text-ink hover:text-accent"
                  >
                    {item.title}
                  </Link>
                  {isGoty || !item.year ? null : (
                    <p className="text-sm text-muted">{item.year}</p>
                  )}
                  {item.blurb ? (
                    <p className="mt-2 max-w-2xl font-serif text-muted">
                      {item.blurb}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </main>
  );
}

function SharedCategoryPicks({ picks }: { picks: SharedCategoryPick[] }) {
  if (picks.length === 0) {
    return <p className="mt-10 text-muted">No category picks yet.</p>;
  }

  return (
    <ul className="mt-10 divide-y divide-line border-y border-line">
      {picks.map((pick) => (
        <li key={pick.categoryId} className="py-6">
          <Link href={`/games/${pick.slug}`} className="group block">
            <CategoryPickCard
              label={pick.label}
              description={pick.description}
              title={pick.title}
              coverUrl={pick.coverUrl}
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function SharedPoster({
  items,
  year,
  title,
  listType,
  rankStyle,
  rankFormat,
}: {
  items: SharedListItem[];
  year: number;
  title: string;
  listType: "goty" | "custom";
  rankStyle: ReturnType<typeof parseStoredRankStyle>;
  rankFormat: "ordinal" | "number";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / POSTER_W);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="mt-10 w-full">
      <div
        style={{
          position: "relative",
          width: "100%",
          height: POSTER_H * scale,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: POSTER_W,
            height: POSTER_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <ListExportPoster
            games={items.map((item) => ({
              id: item.gameId,
              title: item.title,
              imageUrl: item.coverUrl,
            }))}
            year={year}
            layout={EXPORT_LAYOUT_DEFAULT}
            width={POSTER_W}
            height={POSTER_H}
            gameCount={items.length}
            title={title}
            listType={listType}
            showYearBadge={listType === "goty"}
            showTopCount={listType === "custom"}
            rankChrome={rankChromeForStyle(rankStyle, rankFormat)}
          />
        </div>
      </div>
    </div>
  );
}
