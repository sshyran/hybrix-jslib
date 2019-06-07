exports.promise = () => function (step, data) {
  return new Promise(function (resolve, reject) {
    if (this.interface.hasOwnProperty(step)) {
      this.interface[step](data, resolve, reject);
    } else {
      reject('Method \'' + step + '\' does not exist.');
    }
  }.bind({interface: this}));
};
