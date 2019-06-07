/**
   * Execute a custom function with callbacks. Usefull for sequential and parallel.
   * @category Flow
   * @param {Object} data
   * @param {Function} data.func - A function expecting a dataCallback, errorCallback and optional progressCallback.
   * @param {Object} data.data - The data to be passed to the function.
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
exports.call = () => (data, dataCallback, errorCallback, progressCallback) => {
  data.func(data.data, dataCallback, errorCallback, progressCallback);
};
