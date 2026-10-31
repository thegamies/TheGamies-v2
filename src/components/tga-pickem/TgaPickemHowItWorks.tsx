/** Short rules blurb while picks are soon or open. Hidden after lock. */
export function TgaPickemHowItWorks({
  className = "mt-4",
}: {
  className?: string;
}) {
  return (
    <p className={`max-w-xl text-sm text-muted ${className}`}>
      Predict the winner of every award. Earn 1 point for each correct pick. If
      there’s a tie, your World Premiere prediction decides the winner — guess
      how many will be revealed during the show.
    </p>
  );
}
