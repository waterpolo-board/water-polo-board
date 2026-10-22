// ביטול/חזרה: שומרים תמונת מצב לפני כל שינוי.
export class History<T> {
  private past: T[] = [];
  private future: T[] = [];

  constructor(private readonly limit = 60) {}

  /** לקרוא לפני שינוי, עם המצב שלפניו. */
  push(snapshot: T) {
    this.past.push(structuredClone(snapshot));
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  }

  undo(current: T): T | undefined {
    const prev = this.past.pop();
    if (prev !== undefined) this.future.push(structuredClone(current));
    return prev;
  }

  redo(current: T): T | undefined {
    const next = this.future.pop();
    if (next !== undefined) this.past.push(structuredClone(current));
    return next;
  }

  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
}
