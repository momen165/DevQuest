const setCacheHeaders = (res, options = {}) => {
  const {
    public = false,
    maxAge = 0, // in seconds
    staleWhileRevalidate = 0, // in seconds
    mustRevalidate = false,
    noStore = false,
  } = options;

  if (noStore) {
    res.set("Cache-Control", "no-store");
    return;
  }

  let cacheControl = public ? "public" : "private";

  if (maxAge > 0) {
    cacheControl += `, max-age=${maxAge}`;
  }

  if (staleWhileRevalidate > 0) {
    cacheControl += `, stale-while-revalidate=${staleWhileRevalidate}`;
  }

  if (mustRevalidate) {
    cacheControl += ", must-revalidate";
  }

  res.set("Cache-Control", cacheControl);
};

module.exports = {
  setCacheHeaders,
};
