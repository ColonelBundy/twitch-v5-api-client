import debug = require('debug');
import fs = require('fs');

export default class AutomationHelper {
    private _sesh;
    private _debug = debug('twitch:oauth');

    constructor(sesh) {
        this._sesh = sesh;
    }


    /**
     * Insert username and password
     * 
     * @param {string} user
     * @param {string} password
     * @param {boolean} [button=false]
     * 
     * @memberOf AutomationHelper
     */
    public InsertUserInfo(user: string, password: string, button: boolean = false) {
        this._sesh
            .insert('input[name="username"]', user)
            .insert('input[name="password"]', password);

        if (button) {
            this._sesh.click('button');
        }
    }

    /**
     * Finish the last steps
     * 
     * @param {boolean} [button=false]
     * 
     * @memberOf AutomationHelper
     */
    public Finish(button: boolean = false): Promise<Object> {
        return new Promise((resolve, reject) => {
            if (button) {
                this._sesh.click('.js-authorize');
            }

            this._sesh
                .wait('twitch-data')
                .evaluate(() => {
                    return document.querySelector('twitch-data').textContent
                })
                .then((result) => {
                    this._sesh
                        .cookies.get({url: null}).end().then((cookies) => {
                            fs.writeFile('cookies.json', JSON.stringify(cookies), (err) => {
                                if (err) return reject(`Unable to write cookies.json \n\r ${err}`);
                                this._debug('Writing cookies to file');
                            });
                        });

                    resolve(JSON.parse(result));
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }

}


