/**
   * Initialize the NACL factory if nacl has not been defined yet.
   * @category Init
   * @param {Object} data - Not used
   * @example
   * hybrix.sequential([
   * 'init'
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   **/
exports.init = (nacl_factory) => function (data, dataCallback, errorCallback) {
  this.logout(null,
    () => {
      if (typeof nacl === 'undefined') {
        nacl_factory.instantiate(function (naclinstance) {
          nacl = naclinstance; // nacl is a global that is initialized here.
          window.nacl = nacl;
          if (typeof dataCallback === 'function') { dataCallback('Initialized'); }
        });
      } else {
        if (typeof dataCallback === 'function') { dataCallback('Initialized'); }
      }
    },
    errorCallback);
};
