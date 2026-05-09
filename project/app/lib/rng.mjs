export class Random {
  constructor(seed = 1) {
    this.state = seed >>> 0;
  }
  next() {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 2 ** 32;
  }
  int(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  pick(values) {
    return values[this.int(0, values.length - 1)];
  }
  chance(probability) {
    return this.next() < probability;
  }
}
