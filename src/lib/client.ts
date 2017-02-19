import request = require('request');
import debug = require('debug');
import { Oauth, IOauthOptions } from './oauth';

interface IClientOptions {
    client_id?: string, // Can be different from Oauth client_id
    Oauth?: IOauthOptions;
}

interface ICombinedOptions {
  url?: string,
  limit?: number,
  offset?: number,
  cursor?: string,
  direction?: 'desc' | 'asc',
  broadcast_type?: string,
  language?: string,
  sort?: string,
  stream_type?: 'live' | 'playlist' | 'all'
}

interface ITwitchError {
  error: String,
  status: Number,
  message: String
}

interface ICredentials {
    access_token: string,
    refresh_token: string,
    scope: Array<string>
}


export default class Client {
  private _debug = debug('twitch:client');
  private _authenticated: boolean = false;
  private _credentials: ICredentials; 
  private _client_id: string;
  private _twitchURI: string = 'https://api.twitch.tv/kraken';
  private Oauth: Oauth;
  private _options: IClientOptions;
  

  constructor(options?: IClientOptions) {
    this._client_id = process.env.TWITCH_TOKEN || options.client_id;
    this._options = options;

    if (options && options.Oauth) {
        this.Oauth = new Oauth(this._client_id, options.Oauth);
    }
  }


  /**
   * Set credentials manually
   * 
   * Quite sloppy, but its upto the user.
   * 
   * @param {ICredentials} data
   * 
   * @memberOf Client
   */
  public SetCredentials(data: ICredentials) {
    this._credentials = data;
    this._authenticated = true;
  }

    /**
     * Begin the automation process
     * 
     * @returns promise
     * 
     * @memberOf Oauth
     */
    public AutoAuthenticate() {
        return new Promise((resolve, reject) => {
            if (this._options.Oauth.automated && this._options.Oauth.automated.user && this._options.Oauth.automated.password) {
                this.Oauth.Automatelogin(
                    this._options.Oauth.automated.user, 
                    this._options.Oauth.automated.password, 
                    this._options.Oauth.automated.show
                ).then((data: ICredentials) => {
                    this._credentials = data;
                    this._authenticated = true;
                    return resolve(data);
                }).catch((err) => {
                    return reject(err);
                });
            } else {
                return reject(`Your options don't allow automation.`);
            }
        });
    }

/**
 * Call the api without restrictions :)
 * 
 * @param {string} url
 * @param {Object} [options]
 * @returns promise
 * 
 * @memberOf TwitchClient
 */
  public RawApi(url: string, options?: Object) {
    return new Promise((resolve, reject) => {
        this._debug(`Rawapi request: ${url + this.ConstructOptions(options)}`);
        this.CallApi(url + (options ? this.ConstructOptions(options) : '')).then((data: any) => {
            return resolve(data);
        }).catch((err) => reject(err));
    })
  }

  /**
   * Construct options in the uri
   * 
   * @private
   * @param {OptionsInterface} options
   * @returns string
   * 
   * @memberOf TwitchClient
   */
  public ConstructOptions(options: Object) {
    let query: string = '';

    if (!options || Object.keys(options).length === 0) {
        return '';
    }

    // Nasty 
    Object.keys(options).forEach((option, i) => { 
        if (options.hasOwnProperty(option)) {
            if (i === 0) {
                query += '?'
            } else {
                query += '&'
            }
            
            query += `${option}=${options[option]}`;
        }
    });

    return query;
  }

/**
 * Create a comma list seperated string from array
 * 
 * @private
 * @param {Array<string>} users
 * @returns string
 * 
 * @memberOf TwitchClient
 */
  public ConstructCommalist(users: Array<any>) {
        if (users.length > 0) {
            return users.join(',');
        }

        return;
  }

/**
 * Call the api
 * 
 * @private
 * @param {OptionsInterface} options
 * @returns promise
 * 
 * @memberOf TwitchClient
 */
  public CallApi(url: string) {
    return new Promise((resolve, reject) => {
        this._debug(`Calling api: ${this._twitchURI}${url}`);
        request.get({
            headers: {
                'Accept': 'application/vnd.twitchtv.v5+json',
                'Client-ID': this._client_id
            },
            url: this._twitchURI + url
        }, (err, response, body) => {
            if (err || response.statusCode !== 200) { // quick hack :D
                let data = JSON.parse(body);
                this._debug(`Twitch Error: '${data.error}', message: '${data.message}'`) 
                return reject(err || data); 
            }

            return resolve(JSON.parse(body))
        });
    })
  }
}
