import uuid = require('uuid/v4');
import express = require('express')  
import debug = require('debug');
import request = require('request');
import Nightmare = require('nightmare'); 
import fs = require('fs');    
import AutomationHelper from './automation';
import iframe = require('nightmare-iframe-manager');

interface ITwitchResponse {
    access_token: string,
    scope: string
}

interface IAutomation {
    user: string,
    password: string,
    show?: boolean,
    verify?: boolean,
    proxy?: {
        server: string,
        username?: string,
        password?: string
    }
}

export interface IOauthOptions {
    url: string,
    port?: number,
    scope?: string,
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
    constructor(client_id: string, options: IOauthOptions) {
        this._port = options.port || process.env.TWITCH_PORT || 3156;
        this._url = options.url || process.env.TWITCH_URL;
        this._client_id = client_id || process.env.TWITCH_TOKEN;
        this._client_secret = options.client_secret || process.env.TWITCH_SECRET;
        this._scope = options.scope || process.env.TWITCH_SCOPE;
        this._automated = options.automated;

        if (options.server) {
            this.StartServer();
        }

        if (options.automated && options.automated.user && options.automated.password) {
            this._debug(`Ready for automated authentication`);

            if (!options.server) {
                this.StartServer();
            }
        }
    }

    /**
     * Get status of the internal server
     * 
     * @readonly
     * 
     * @memberOf Oauth
     */
    public get IsServerUp() {
        return this._server_listening;
    }

    /**
     * Automate twitch login to grab the access token,
     * be aware that this page contains captcha protection.
     * Consider using a proxy if multiple attemps are to be made.
     * Cookies will skip the captcha all together though.
     * -------------------------------
     *  THIS IS VERY MESSY, BUT WORKS
     * -------------------------------
     * 
     * @private
     * @param {string} user
     * @param {string} password
     * @returns promise
     * 
     * @memberOf Oauth
     */
    public Automatelogin (user: string, password: string, show?: boolean) {
        return new Promise((resolve, reject) => {
            let proxy = {};
            
            if (this._automated.proxy) {
                proxy = {
                    switches: {
                        'proxy-server': this._automated.proxy.server
                    }
                }
            }
            
            const nightmare = Nightmare({ show: show || false, webPreferences: { webSecurity: false }, proxy});
            iframe(Nightmare); // initialize iframe

            if (!fs.existsSync('cookies.json')) {
                fs.writeFile('cookies.json', '{}', (err) => {
                        if (err) return reject(`Unable to write cookies.json \n\r ${err}`);
                        this._debug('Cookie file was not found, wrote an empty one instead.');
                });
            }

            fs.readFile('cookies.json', 'utf8', (err, data) => {
                if (err) return reject(`Unable to read cookies.json \n\r ${err}`);

                const sesh = nightmare.goto(`http://localhost:${this._port}/auth`);
                const helper = new AutomationHelper(sesh);

                if (this._automated.proxy && this._automated.proxy.username && this._automated.proxy.password) {
                    sesh.authentication(this._automated.proxy.username, this._automated.proxy.password)
                }


                // If we can read the cookie file we proceed
                if (typeof data === 'string') {
                    try {
                        let Cookies = JSON.parse(data);
                        if (typeof Cookies === 'object') {
                            this._debug('Found cookies');

                            if (Object.keys(Cookies).length !== 0) { 
                                sesh
                                    .cookies.set(Cookies)
                                    .wait()
                                    .goto(`http://localhost:${this._port}/auth`)
                                    .wait()
                            }
                        } else {
                            sesh.halt();
                            return reject('Invalid cookies');
                        }
                    }catch (e) {
                        sesh.halt();
                        return reject('Unable to parse cookies.json');
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
                                            this._debug('Captcha has been activated, Solve it without clicking Log in');
                                                // Insert for convencience
                                                helper.InsertUserInfo(user, password);

                                                // Wait for user to solve captcha ( 30s timeout )
                                                sesh
                                                    .enterIFrame('iframe[name="undefined"]')
                                                    .wait('[aria-checked="true"]') 
                                                    // Check if its been solved
                                                    .exists('[aria-checked="true"]').then((result) => { 
                                                        if (result) { // its been solved so we continue
                                                            sesh
                                                                .exitIFrame()
                                                                .click('button')
                                                                .wait()
                                                                .exists('.js-authorize').then((result) => {
                                                                    if (result) {
                                                                        this._debug('Authorize button exists, clicking...');
                                                                        helper.Finish(true).then(resolve).catch(reject);
                                                                    } else {
                                                                        helper.Finish().then(resolve).catch(reject);
                                                                    }
                                                                }).catch(reject);
                                                        } else {
                                                            sesh
                                                                .halt('Captcha has been activated', () => {
                                                                    return this._debug(`Captcha has been activated.` 
                                                                        + ` You failed to solve it within the allotted time (30s)`);
                                                                }); // Kill it
                                                        }
                                                    }).catch(reject);
                                        } else {
                                            sesh
                                                .halt('Captcha has been activated', () => {
                                                    return this._debug(`Captcha has been activated.` 
                                                        + ` Please use the show option in automation to enter it manually` 
                                                        + ` or use the proxy option.`);
                                                }); // Kill it
                                        }
                                    } else {
                                        helper.InsertUserInfo(user, password, true);
                                        sesh
                                            .wait()
                                            .exists('.js-authorize').then((result) => {
                                                if (result) {
                                                    this._debug('Authorize button exists, clicking...');
                                                    helper.Finish(true).then(resolve).catch(reject);
                                                } else {
                                                    helper.Finish().then(resolve).catch(reject);
                                                }
                                            }).catch(reject);
                                    }
                                }).catch(reject);
                        } else {
                            // Press authorize button
                            this._debug('Authorize button exists, clicking...');
                            sesh.wait('.js-authorize');
                            helper.Finish(true).then(resolve).catch(reject);
                        }
                    });
            });
        });
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
     * Starts the server used to receive data from twitch
     * 
     * @TODO: Better error handling
     * 
     * @private
     * 
     * @memberOf Oauth
     */
    private StartServer() {
        this.app.use((req, res, next) => {
            res.setHeader('X-Powered-By', 'TwitchApi Client Oauth Server');
            next();
        });
        this.app.get('/token', (req, res) => this.HandleToken(req, res));
        this.app.get('/auth', (req, res) => this.HandleAuth(req, res));
        this.app.get('/healthz', (req, res) => res.send('OK'));
        this.app.get('/', (req, res) => res.send(`:: TwitchApi Client Oauth Server ::`));
        this.app.disable('view cache');

        this.app.listen(this._port, (err) => {  
            if (err) {
                return console.error(err);
            }

            this._server_listening = true;
            this._debug(`Server bridge listening on ${this._port}`);
        })
    }

    /**
     * Handle code sent from twitch
     * 
     * @TODO: Better error handling
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
            }).catch((err) => console.error(err));
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
        // Aka click a button to proceed or not
        if (this._automated) { 
            verify_auth = this._automated.verify;
        }

        process.nextTick(() => 
            res.redirect(`${this._oauth_url_auth}?response_type=code&client_id=${this._client_id}` + 
            `&redirect_uri=${this._url}&scope=${this._scope}&state=${this._current_state}&force_verify=${verify_auth}`)
        ); 
    }
}

