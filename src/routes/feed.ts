import Client from '../lib/client';
import debug = require('debug');

export class Feed {

    private _debug = debug('twitch:feed');
    private _client: Client;

    constructor(client: Client) {
        this._client = client;
    }



}


