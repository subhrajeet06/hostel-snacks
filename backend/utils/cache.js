const store = new Map();

const stableKey = (prefix, value = {}) => {
  const normalized = Object.keys(value)
    .filter((key) => value[key] !== undefined && value[key] !== null && value[key] !== '')
    .sort()
    .reduce((acc, key) => {
      acc[key] = value[key];
      return acc;
    }, {});

  return `${prefix}:${JSON.stringify(normalized)}`;
};

const get = (key) => {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
};

const set = (key, value, ttlSeconds) => {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

const getOrSet = async (key, ttlSeconds, producer) => {
  const cached = get(key);
  if (cached !== undefined) return { value: cached, hit: true };

  const value = await producer();
  set(key, value, ttlSeconds);
  return { value, hit: false };
};

const delByPrefix = (prefix) => {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
};

module.exports = {
  delByPrefix,
  get,
  getOrSet,
  set,
  stableKey,
};
