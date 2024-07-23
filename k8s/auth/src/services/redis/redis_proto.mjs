var handler = {
  get: function (target, prop) {
    if (prop in target) {
      return target[prop];
    } else {
      throw new Error(`Property ${prop} is not implemented`);
    }
  },
};

var proto = new Proxy({}, handler);

export { proto };
