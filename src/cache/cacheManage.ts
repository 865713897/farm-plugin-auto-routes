export default class CacheManage {
  private cache = new Map<string, any>();

  constructor() {}

  public set(key: string, value: any) {
    this.cache.set(key, value);
  }

  public get(key: string) {
    return this.cache.get(key);
  }

  public delete(key: string) {
    this.cache.delete(key);
  }

  public clear() {
    this.cache.clear();
  }

  public has(key: string) {
    return this.cache.has(key);
  }

  public getValues() {
    return this.cache.values();
  }

  getOrInsertWith(key: string, callback: () => any) {
    if (this.has(key)) {
      return this.get(key);
    } else {
      const value = callback();
      this.set(key, value);
      return value;
    }
  }
}
