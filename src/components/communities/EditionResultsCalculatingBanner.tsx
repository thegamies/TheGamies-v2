export function EditionResultsCalculatingBanner({
  status,
}: {
  status: "pending" | "computing" | "failed" | string;
}) {
  const failed = status === "failed";
  return (
    <p
      className={`mt-6 max-w-xl border px-4 py-3 text-sm leading-relaxed ${
        failed
          ? "border-danger text-danger"
          : "border-line text-muted"
      }`}
      role="status"
    >
      {failed
        ? "Results could not be calculated yet. They will retry automatically."
        : "Results are being calculated. Full boards will appear here shortly."}
    </p>
  );
}
