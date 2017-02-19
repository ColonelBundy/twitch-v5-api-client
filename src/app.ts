import debug = require('debug');
import Client from './lib/client';
import { IOauthOptions } from './lib/oauth';
import * as Routes from './routes';

interface IOptions {
    client_id: string, // Can be different from Oauth client_id
    Oauth?: IOauthOptions;
}

export default class Twitch {

  public Channel: Routes.Channel;
  public Stream: Routes.Stream;
  public Raw = Routes;
  public Client: Client;

  protected _debug = debug('twitch');
  protected _authenticated: boolean = false;

  constructor(options?: IOptions) {
    this.Client = new Client(options)
    this.Channel = new Routes.Channel(this.Client)
    this.Stream = new Routes.Stream(this.Client)
  }
}
