type PerformanceNotesProps = {
  notes: readonly string[];
};

// One muted paragraph per note; each sentence explains a figure the year could not produce, or a
// period that is not the plain calendar year.
export function PerformanceNotes({ notes }: PerformanceNotesProps) {
  if (notes.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {notes.map((note) => (
        <p key={note} className="text-sm text-muted">
          {note}
        </p>
      ))}
    </div>
  );
}
