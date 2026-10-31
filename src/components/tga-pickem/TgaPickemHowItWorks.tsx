/** Short rules blurb while picks are soon or open. Hidden after lock. */
export function TgaPickemHowItWorks({ className = "mt-8" }: { className?: string }) {
  return (
    <p className={`max-w-xl text-sm text-muted ${className}`}>
      Call each award. One point per correct pick. World Premieres is the
      tiebreaker — guess how many there will be.
    </p>
  );
}
