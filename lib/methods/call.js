/**
   * Execute a custom function with callbacks. Usefull for sequential and parallel.
   * @category Flow
   * @param {Object} data
   * @param {Function} data.func - A function expecting a dataCallback, errorCallback and optional progressCallback.
   * @param {Object} [data.data] - The data to be passed to the function if none is provided the data from stream is used.
   * @example
   *   hybrix.sequential([
   *     'init',                                                        // Initialize hybrix
   *     {func: (data,onSuccess,onError,onProgress)=>{                  // Declare a custom function
   *       onProgress(0.5);                                             // Set the progress to 50%
   *       setTimeout(onSuccess,2000,data+1);                           // Wait to seconds, then output result + 1
   *     }, data:1} , 'call'                                            // Provide the initial data
   *   ],
   *    onSuccess,                                                      // Define action to execute on successfull completion
   *    onError,                                                        // Define action to execute when an error is encountered
   *    onProgress                                                      // Define action to execute whenever there is a progress update
   );

  */
exports.call = (ydata, fail) => (data, dataCallback, errorCallback, progressCallback) => {
  let xdata;
  let func;
  if (typeof data === 'function') {
    xdata = ydata;
    func = data;
  } else if (typeof data === 'object' && data !== null && typeof data.func === 'function') {
    func = data.func;
    xdata = data.hasOwnProperty('data') ? data.data : ydata;
  } else {
    fail('call: No function provided.', errorCallback);
    return;
  }
  func(xdata, dataCallback, errorCallback, progressCallback);
};
