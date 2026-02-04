export interface NoteEntry {
  id: string;
  text: string;
  createdAt: string;
}

export function createNoteEntry(text: string): NoteEntry {
  return {
    id: crypto.randomUUID(),
    text,
    createdAt: new Date().toISOString(),
  };
}

export function parseNotes(comment: string): NoteEntry[] {
  if (!comment) return [];
  try {
    const parsed = JSON.parse(comment);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Legacy plain-string comment — wrap into a single entry
  }
  return [
    {
      id: crypto.randomUUID(),
      text: comment,
      createdAt: new Date(0).toISOString(),
    },
  ];
}

export function serializeNotes(notes: NoteEntry[]): string {
  return JSON.stringify(notes);
}
