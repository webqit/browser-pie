
/**
 * A UI-focused edition of the fetch API.
 * 
 * Implements progress over the fetch API.
 *
 * @param string					url
 * @param object					options
 * @param function					progressCallback
 * @param bool					    syncWithProgressCallback
 *
 * @return Promise
 */
export default async function(url, options, progressCallback = null, syncWithProgressCallback = false) {
    if (!progressCallback) {
        return fetch(url, options);
    }
    const callProgressCallback = (phase, valuenow, valuetotal) => {
        var progressCallbackReturn = progressCallback(phase, valuenow, valuetotal);
        return syncWithProgressCallback ? progressCallbackReturn : null;
    };
    return new Promise(async (resolve, reject) => {
        var response;
        try {
            response = await fetch(url, options);
        } catch(e) {
            return reject(e);
        }
        // ------------------
        var contentLength = + (response.headers.get('Content-Length') || NaN),
            recievedLength = 0;
        var reader = response.body.getReader(),
            chunks = [],
            chunk;
        await callProgressCallback('download', 0, contentLength);
        while((chunk = await reader.read()) && !chunk.done) {
            chunks.push(chunk.value);
            recievedLength += chunk.value.length;
            await callProgressCallback('download', recievedLength, !contentLength && chunk.done ? recievedLength : contentLength);
        }
        // -----------
        const _response = {
            bodyUsed: true,
            url: response.url,
            ok: response.ok,
            headers: response.headers,
            redirected: response.redirected,
            statusText: response.statusText,
            status: response.status,
            type: response.type,
            text() {
                return new Promise(resolve => {
                    var data = new Uint8Array(recievedLength);
                    chunks.reduce((position, chunk) => {
                        data.set(chunk, position);
                        return position + chunk.length;
                    }, 0);
                    resolve((new TextDecoder('utf-8')).decode(data));
                });
            },
            json() {
                return this.text().then(text => JSON.parse(text));
            },
            blob() {
                return Promise.resolve(new Blob(chunks));
            }
        };
        resolve(_response);
    });
};