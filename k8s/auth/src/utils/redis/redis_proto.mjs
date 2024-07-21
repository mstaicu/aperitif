var handler = {
  get: function (_, prop) {
    throw new Error(`Property ${prop} is not implemented`);
  },
};

var proto = new Proxy({}, handler);

export { proto };
