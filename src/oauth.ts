import uuid = require('uuid/v4');
import express = require('express')  
import debug = require('debug');
import request = require('request');
import Nightmare = require('nightmare'); 
import fs = require('fs');    

interface ITwitchResponse {
    access_token: string,
    scope: string
}

interface IAutomation {
    user: string,
    password: string,
    show?: boolean,
    verify?: boolean
}

export interface IOptions {
    url: string,
    port?: number,
    scope?: string,
    client_id: string,
    client_secret: string,
    server?: boolean,
    automated?: IAutomation
}

export class Oauth {
    private _port: number;
    private _url: string;
    private _debug = debug('twitch:oauth');
    private _client_id: string;
    private _client_secret: string;
    private _oauth_url_token: string = 'https://api.twitch.tv/kraken/oauth2/token';
    private _oauth_url_auth: string = 'https://api.twitch.tv/kraken/oauth2/authorize';
    private _scope: string;
    private _automated: IAutomation;
    private _server_listening: boolean;

    private _current_state: string = '';
    private app = express();  

    /**
     * Creates an instance of Oauth.
     * 
     * @param {IOptions} options
     * 
     * @memberOf Oauth
     */
    constructor(options: IOptions) {
        this._port = options.port || process.env.TWITCH_PORT || 3156;
        this._url = options.url || process.env.TWITCH_URL;
        this._client_id = options.client_id || process.env.TWITCH_TOKEN;
        this._client_secret = options.client_secret || process.env.TWITCH_SECRET;
        this._scope = options.scope || process.env.TWITCH_SCOPE;
        this._automated = options.automated;

        if (options.server) {
            this._server_listening = true;
            this._debug('Starting server');
            this.StartServer();
        }

        if (options.automated && options.automated.user && options.automated.password) {
            this._debug(`Starting automated oauth login`);

            if (!options.server) {
                this._server_listening = true;
                this._debug('Starting server for automated login, ready to call Automate()');
                this.StartServer();
                setTimeout(() => {
                    this.Automate().then((data) => console.log(data)).catch((err) => console.error(err));
                }, 1500);
            }
        }
    }

    public Automate() {
        return new Promise((resolve, reject) => {
            if (this._automated && this._automated.user && this._automated.password && this._server_listening) {
                this.Automatelogin(this._automated.user, this._automated.password, this._automated.show).then(resolve).catch(reject);
            } else {
                reject('Please modify your options to allow automation');
            }
        })
    }

    /**
     * Get's the auth token from twitch
     * 
     * @private
     * @param {string} code
     * @returns promise
     * 
     * @memberOf Oauth
     */
    private GetToken(code: string) {
        return new Promise((resolve, reject) => {
            this._debug(`Getting token from twitch`);
            request.post({
                headers: {
                    'Accept': 'application/vnd.twitchtv.v5+json'
                },
                body: `client_id=${this._client_id}&client_secret=${this._client_secret}` + 
                `&grant_type=authorization_code&redirect_uri=${this._url}&code=${code}&state=${this._current_state}`,
                url: this._oauth_url_token
            }, (err, response, body) => {
                if (err || response.statusCode !== 200) { // quick hack :D
                    let data = JSON.parse(body);
                    this._debug(`Twitch Error: '${data.error}', message: '${data.message}'`) 
                    return reject(err || data); 
                }

                return resolve(<ITwitchResponse>JSON.parse(body))
            });
        })
    }

    /**
     * Automate twitch login to grab the access token
     * be aware that this page contains captcha protection
     * consider using a proxy if multiple attemps are to be made
     * 
     *  THIS IS VERY MESSY, BUT WORKS
     * 
     * @private
     * @param {string} user
     * @param {string} password
     * @returns promise
     * 
     * @memberOf Oauth
     */
    private Automatelogin (user: string, password: string, show?: boolean) {
        return new Promise((resolve, reject) => {
            
            const nightmare = Nightmare({ show: show || false });

            // TODO: .g-recaptcha detection

            if (fs.existsSync('cookies.json')) {
                fs.readFile('cookies.json', 'utf8', (err, data) => {
                    if (err) return console.error('Unable to read cookies.json', err);

                    const sesh = nightmare.goto(`http://localhost:${this._port}/auth`);

                    // If we can read the cookie file we proceed
                    if (typeof data === 'string') {
                        this._debug('Found cookies');

                        try {
                            sesh
                                .cookies.set(JSON.parse(data))
                                .wait()
                                .goto(`http://localhost:${this._port}/auth`)
                        }catch (e) {
                            return console.error('Unable to parse cookies.json');
                        }
                        
                    } else {
                        this._debug('Cookie file invalid, continuing with manual login');
                    }

                    sesh
                        .exists('input[name="username"]').then((result) => {
                            if (result) {
                                this._debug('Username input exists, Proceeding with login')
                                sesh
                                    .exists('.g-recaptcha').then((result) => { // Looks like the captcha exists hmm.
                                        if (result) {
                                            if (this._automated.show) {
                                                this._debug('Captcha has been activated, Solve it without clicking submit');

                                                sesh
                                                    .insert('input[name="username"]', user) // Insert for convencience
                                                    .insert('input[name="password"]', password) // Insert for convencience

                                                    // Wait for user to solve captcha ( 30s )
                                                    .wait('.recaptcha-checkbox-checked') 
                                                    // Check if its been solved
                                                    .exists('.recaptcha-checkbox-checked', (result) => { 
                                                        if (result) { // its been solved so we continue
                                                            sesh
                                                                .click('button')
                                                                .wait()
                                                                .exists('.js-authorize').then((result) => {
                                                                    if (result) {
                                                                        this._debug('Authorize button exists, clicking...');
                                                                        sesh
                                                                            .click('.js-authorize')
                                                                            .wait('twitch-data')
                                                                            .evaluate(() => {
                                                                                return document.querySelector('twitch-data').textContent
                                                                            })
                                                                            .then((result) => {
                                                                                sesh
                                                                                    .cookies.get({url: null}).end().then((cookies) => {
                                                                                        fs.writeFile('cookies.json', 
                                                                                            JSON.stringify(cookies), (err) => {
                                                                                                if (err) return console.log(err);
                                                                                                this._debug('Writing cookies to file');
                                                                                        });
                                                                                    });

                                                                                resolve(JSON.parse(result));
                                                                            })
                                                                            .catch((error) => {
                                                                                reject(error);
                                                                            });
                                                                    } else {
                                                                        sesh
                                                                            .wait('twitch-data')
                                                                            .evaluate(() => {
                                                                                return document.querySelector('twitch-data').textContent
                                                                            })
                                                                            .then((result) => {
                                                                                sesh
                                                                                    .cookies.get({url: null}).end().then((cookies) => {
                                                                                        fs.writeFile('cookies.json', 
                                                                                            JSON.stringify(cookies), (err) => {
                                                                                                if (err) return console.log(err);
                                                                                                this._debug('Writing cookies to file');
                                                                                        });
                                                                                    });

                                                                                resolve(JSON.parse(result));
                                                                            })
                                                                            .catch((error) => {
                                                                                reject(error);
                                                                            });
                                                                    }
                                                                });
                                                        } else {
                                                            sesh
                                                                .halt('Captcha has been activated', () => {
                                                                    return console.error(`Captcha has been activated.` 
                                                                        + ` You failed to solve it within the allotted time (30s)`);
                                                                }); // Kill it
                                                        }
                                                    });
                                            } else {
                                                sesh
                                                    .halt('Captcha has been activated', () => {
                                                        return console.error(`Captcha has been activated.` 
                                                            + ` Please use the show option in automation to enter it manually` 
                                                            + ` or use the proxy option.`);
                                                    }); // Kill it
                                            }
                                        } else {
                                            sesh
                                                .insert('input[name="username"]', user)
                                                .insert('input[name="password"]', password)
                                                .click('button')
                                                .wait()
                                                .exists('.js-authorize').then((result) => {
                                                    if (result) {
                                                        this._debug('Authorize button exists, clicking...');
                                                        sesh
                                                            .click('.js-authorize')
                                                            .wait('twitch-data')
                                                            .evaluate(() => {
                                                                return document.querySelector('twitch-data').textContent
                                                            })
                                                            .then((result) => {
                                                                sesh
                                                                    .cookies.get({url: null}).end().then((cookies) => {
                                                                        fs.writeFile('cookies.json', JSON.stringify(cookies), (err) => {
                                                                            if (err) return console.log(err);
                                                                            this._debug('Writing cookies to file');
                                                                        });
                                                                    });

                                                                resolve(JSON.parse(result));
                                                            })
                                                            .catch((error) => {
                                                                reject(error);
                                                            });
                                                    } else {
                                                        sesh
                                                            .wait('twitch-data')
                                                            .evaluate(() => {
                                                                return document.querySelector('twitch-data').textContent
                                                            })
                                                            .then((result) => {
                                                                sesh
                                                                    .cookies.get({url: null}).end().then((cookies) => {
                                                                        fs.writeFile('cookies.json', JSON.stringify(cookies), (err) => {
                                                                            if (err) return console.log(err);
                                                                            this._debug('Writing cookies to file');
                                                                        });
                                                                    });

                                                                resolve(JSON.parse(result));
                                                            })
                                                            .catch((error) => {
                                                                reject(error);
                                                            });
                                                    }
                                                })
                                        }
                                    });
                            } else {
                                // Press authorize button
                                this._debug('Authorize button exists, clicking...');
                                sesh
                                    .wait('.js-authorize')
                                    .click('.js-authorize')
                                    .wait('twitch-data')
                                    .evaluate(() => {
                                        return document.querySelector('twitch-data').textContent
                                    })
                                    .then((result) => {
                                        sesh
                                            .cookies.get({url: null}).end().then((cookies) => {
                                                fs.writeFile('cookies.json', JSON.stringify(cookies), (err) => {
                                                    if (err) return console.log(err);
                                                    this._debug('Writing cookies to file');
                                                });
                                            });

                                        resolve(JSON.parse(result));
                                    })
                                    .catch((error) => {
                                        reject(error);
                                    });
                            }
                        });
                });
            }
        });
    }

    /**
     * Starts the server used to receive data from twitch
     * 
     * @private
     * 
     * @memberOf Oauth
     */
    private StartServer() {
        this.app.get('/token', (req, res) => this.HandleToken(req, res));
        this.app.get('/auth', (req, res) => this.HandleAuth(req, res));
        this.app.get('/', (request, response) => response.send('Nothing here'));
        this.app.disable('view cache');

        this.app.listen(this._port, (err) => {  
            if (err) {
                return console.log(err);
            }

            this._debug(`Server listening on ${this._port}`);
        })
    }

    /**
     * Handle code sent from twitch
     * 
     * @private
     * @param {express.Request} req
     * @param {express.Response} res
     * 
     * @memberOf Oauth
     */
    private HandleToken(req: express.Request, res: express.Response) {
        this._debug('Handling token request');

        if (req.query.code && req.query.state === this._current_state) {
            this.GetToken(req.query.code).then((data: ITwitchResponse) => {
                res.status(200).send(`<twitch-data>${JSON.stringify(data)}</twitch-data>`);
            }).catch((err) => console.log(err));
        } else {
            res.status(500).send('Code was not set or state invalid');
        }
            
    }

    /**
     * Handle auth request, redirect user to auth page of twitch
     * 
     * @private
     * @param {express.Request} req
     * @param {express.Response} res
     * 
     * @memberOf Oauth
     */
    private HandleAuth(req: express.Request, res: express.Response) {
        this._debug('Handling auth request');

        this._current_state = uuid();
        this._scope = req.query.scope || this._scope;
        let verify_auth: boolean = false;

        // This parameter decides whether the user should be re-prompted for authorization.
        // Aka click a button to proceed or not, this is required for the automated login
        if (this._automated) { 
            verify_auth = this._automated.verify;
        }

        process.nextTick(() => 
            res.redirect(`${this._oauth_url_auth}?response_type=code&client_id=${this._client_id}` + 
            `&redirect_uri=${this._url}&scope=${this._scope}&state=${this._current_state}&force_verify=true`)
        ); 
    }
}

