class Duration {
  secs: number;
  nanos: number;

  constructor(secs: number, nanos: number) {
    this.secs = secs;
    this.nanos = nanos;
  }

  static toString = (duration?: Duration) => {
    if (!duration) {
      return "";
    }

    const secsFromNanos = Math.floor(duration.nanos / 1e9);
    const microsFromNanos = Math.floor(
      (duration.nanos - secsFromNanos * 1e9) / 1e6
    );
    const secsTotal = duration.secs + secsFromNanos;
    if (secsTotal > 0) {
      return `${secsTotal} s ${microsFromNanos} ms`;
    }

    return `${microsFromNanos} ms`;
  };
}

export default Duration;
