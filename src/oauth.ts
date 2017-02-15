import uuid = require('uuid/v4');
import express = require('express')  
import debug = require('debug');
import request = require('request');
import Nightmare = require('nightmare');       

interface ITwitchResponse {
    access_token: string,
    scope: string
}

export interface IOptions {
    url: string,
    port?: number,
    scope?: string,
    client_id: string,
    client_secret: string,
    server?: boolean,
    automated?: boolean,
    user?: string,
    password?: string
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

        if (options.server) {
            this._debug('Starting server');
            this.StartServer();
        }

        if (options.automated && options.user && options.password) {
            this._debug(`Starting automated oauth login`);

            if (!options.server) {
                this._debug('Starting server for automated login');
                this.StartServer();
            }

            setTimeout(() => {
                this.Automatelogin(options.user, options.password);
            }, 1500);
        }
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
     * beaware that this page contains captcha protection
     * consider using a proxy if multiple attemps are made
     * 
     * @private
     * @param {string} user
     * @param {string} password
     * @returns promise
     * 
     * @memberOf Oauth
     */
    private Automatelogin (user: string, password: string, show?: false) {
        return new Promise((resolve, reject) => {
            const nightmare = Nightmare({ show: show });

            nightmare.goto(`http://localhost:${this._port}/auth`)
                .wait('input[name="username"]')
                .type('input[name="username"]', user)
                .type('input[name="password"]', password)
                .click('button')
                .wait('twitch-data')
                .evaluate(function () {
                    return document.querySelector('twitch-data').textContent
                })
                .end()
                .then(function (result) {
                    resolve(JSON.parse(result));
                })
                .catch(function (error) {
                    reject(error);
                });
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

        process.nextTick(() => 
            res.redirect(`${this._oauth_url_auth}?response_type=code&client_id=${this._client_id}` + 
            `&redirect_uri=${this._url}&scope=${this._scope}&state=${this._current_state}`)
        ); 
    }
}

