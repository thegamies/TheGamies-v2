import { GameImagesSection } from "@/components/games/GameImagesSection";
import { GameScreenshotsSection } from "@/components/games/GameScreenshotsSection";
import { GameVideosSection } from "@/components/games/GameVideosSection";

const STILL =
  "https://images.igdb.com/igdb/image/upload/t_720p/co9wvg.jpg";

export function GameMediaFixture() {
  return (
    <div className="space-y-10">
      <GameVideosSection
        videos={[
          {
            igdbId: 1,
            name: "Trailer",
            videoId: "dQw4w9WgXcQ",
            posterUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
          },
          {
            igdbId: 2,
            name: "Gameplay",
            videoId: "dQw4w9WgXcQ",
            posterUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
          },
        ]}
      />
      <GameImagesSection
        artworks={[
          { igdbId: 11, imageUrl: STILL, imageTypeName: "Concept Art", width: 1920, height: 800 },
          { igdbId: 12, imageUrl: STILL, imageTypeName: "Concept Art", width: 2560, height: 1080 },
          { igdbId: 13, imageUrl: STILL, imageTypeName: "Logo", width: 800, height: 800 },
          { igdbId: 14, imageUrl: STILL, imageTypeName: "Engine Screenshot", width: 1080, height: 1920 },
        ]}
      />
      <GameScreenshotsSection
        screenshots={[
          { igdbId: 21, imageUrl: STILL, width: 1920, height: 1080 },
          { igdbId: 22, imageUrl: STILL, width: 2560, height: 1440 },
        ]}
      />
    </div>
  );
}
