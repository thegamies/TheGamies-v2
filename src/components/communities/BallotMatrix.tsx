import { GameCover } from "@/components/ui/GameCover";
import { RankMarker } from "@/components/ui/RankMarker";
import type {
  EditionBallotMatrix,
  MatrixGameCell,
} from "@/lib/communities/edition-results";

function GameCell({ game }: { game: MatrixGameCell | null }) {
  if (!game) {
    return <span className="text-muted">—</span>;
  }
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="w-8 shrink-0">
        <GameCover title={game.title} imageUrl={game.coverUrl} />
      </div>
      <p className="min-w-0 truncate font-semibold text-ink" title={game.title}>
        {game.title}
      </p>
    </div>
  );
}

const RANK_COL = "left-0 w-12 min-w-12";
const LIST_COL = "w-44 min-w-44";

export function BallotMatrix({ matrix }: { matrix: EditionBallotMatrix }) {
  if (!matrix.hasGames) {
    return (
      <section className="border-t border-line pt-10">
        <h3 className="font-display text-3xl tracking-wide text-ink">
          Ballot matrix
        </h3>
        <p className="mt-4 text-sm text-muted">
          No top-ten lists to compare yet.
        </p>
      </section>
    );
  }

  return (
    <section className="border-t border-line pt-10">
      <h3 className="font-display text-3xl tracking-wide text-ink">
        Ballot matrix
      </h3>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Top 10 side by side — ranks stay put; scroll sideways through every
        list.
      </p>

      <div className="mt-6 overflow-x-auto border-y border-line">
        <table className="w-max min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th
                scope="col"
                className={`sticky z-20 bg-paper px-2 py-3 text-center text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase ${RANK_COL}`}
              >
                #
              </th>
              {matrix.showYou ? (
                <th
                  scope="col"
                  className={`px-3 py-3 text-[11px] font-extrabold tracking-[0.14em] text-muted uppercase ${LIST_COL}`}
                >
                  You
                </th>
              ) : null}
              <th
                scope="col"
                className={`px-3 py-3 text-[11px] font-extrabold tracking-[0.14em] text-muted uppercase ${LIST_COL}`}
              >
                Community
              </th>
              <th
                scope="col"
                className={`px-3 py-3 text-[11px] font-extrabold tracking-[0.14em] text-muted uppercase ${LIST_COL}`}
              >
                Voices
              </th>
              {matrix.voiceColumns.map((v) => (
                <th
                  key={v.profileId}
                  scope="col"
                  className={`px-3 py-3 text-[11px] font-extrabold tracking-[0.12em] text-muted ${LIST_COL}`}
                  title={`@${v.username}`}
                >
                  <span className="line-clamp-2 font-semibold normal-case tracking-normal text-ink">
                    {v.displayName}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.rank} className="border-b border-line">
                <th
                  scope="row"
                  className={`sticky z-10 bg-paper px-2 py-2 text-center ${RANK_COL}`}
                >
                  <RankMarker rank={row.rank} className="mx-auto" />
                </th>
                {matrix.showYou ? (
                  <td className={`px-3 py-2 ${LIST_COL}`}>
                    <GameCell game={row.you} />
                  </td>
                ) : null}
                <td className={`px-3 py-2 ${LIST_COL}`}>
                  <GameCell game={row.community} />
                </td>
                <td className={`px-3 py-2 ${LIST_COL}`}>
                  <GameCell game={row.voices} />
                </td>
                {matrix.voiceColumns.map((v) => (
                  <td key={v.profileId} className={`px-3 py-2 ${LIST_COL}`}>
                    <GameCell game={row.voiceGames[v.profileId] ?? null} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
