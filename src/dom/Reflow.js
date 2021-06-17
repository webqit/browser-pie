
/**
 * @imports
 */
import _each from '@webqit/util/obj/each.js';

/**
 * ---------------------------
 * Binds callbacks to requestAnimationFrame()
 * to create a central "read/write" phases for Ctxt access.
 * ---------------------------
 */
			
export default class Reflow {

	/**
	 * Starts the loop.
	 *
	 * @return this
	 */
	constructor(window, asyncDOM = true) {
		this.window = window;
		this.async = asyncDOM;
		this.readCallbacks = [];
		this.writeCallbacks = [];
		this._run();
	}

	_run() {
		this.window.requestAnimationFrame(() => {
			this.readCallbacks.forEach((callback, i) => {
				if (callback && !callback()) {
					this.readCallbacks[i] = null;
				}
			});
			this.writeCallbacks.forEach((callback, i) => {
				if (callback && !callback()) {
					this.writeCallbacks[i] = null;
				}
			});
			this._run();
		});
	}
	
	/**
	 * Binds a callback to the "read" phase.
	 *
	 * @param function 	callback
	 * @param bool		withPromise
	 *
	 * @return void
	 */
	onread(callback, withPromise = false) {
		if (withPromise) {
			return new Promise((resolve, reject) => {
				if (this.async === false) {
					callback(resolve, reject);
				} else {
					this.readCallbacks.push(() => {
						callback(resolve, reject);
					});
				}
			});
		}
		if (this.async === false) {
			callback();
		} else {
			this.readCallbacks.push(callback);
		}
	}
	
	/**
	 * Binds a callback to the "write" phase.
	 *
	 * @param function 	callback
	 * @param bool		withPromise
	 *
	 * @return void
	 */
	onwrite(callback, withPromise = false) {
		if (withPromise) {
			return new Promise((resolve, reject) => {
				if (this.async === false) {
					callback(resolve, reject);
				} else {
					this.writeCallbacks.push(() => {
						callback(resolve, reject);
					});
				}
			});
		}
		if (this.async === false) {
			callback();
		} else {
			this.writeCallbacks.push(callback);
		}
	}
	
	/**
	 * A special construct for Ctxt manipulations that span
	 * one or more read/write cycles.
	 *
	 * @param function 	read
	 * @param function 	write
	 * @param mixed		prevTransaction
	 *
	 * @return void|mixed
	 */
	cycle(read, write, prevTransaction) {
		this.onread(() => {
			// Record initial values
			var readReturn = read(prevTransaction);
			if (readReturn) {
				// Call erite, the transation
				var callWrite = (readReturn) => {
					this.onwrite(() => {
						var writeReturn = write(readReturn, prevTransaction);
						if (writeReturn) {
							// Repeat transaction
							var repeatTransaction = (writeReturn) => {
								this.cycle(read, write, writeReturn);
							};
							// ---------------------------------------
							// If "write" returns a promise, we wait until it is resolved
							// ---------------------------------------
							if (writeReturn instanceof Promise) {
								writeReturn.then(repeatTransaction);
							} else {
								repeatTransaction();
							}
						}
					});
				};
				// ---------------------------------------
				// If "read" returns a promise, we wait until it is resolved
				// ---------------------------------------
				if (readReturn instanceof Promise) {
					readReturn.then(callWrite);
				} else {
					callWrite();
				}
			}
		});
	}

};