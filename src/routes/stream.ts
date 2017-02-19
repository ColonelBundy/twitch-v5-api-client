import Client from '../lib/client';
import * as Routes from '../routes';
import debug = require('debug');

export interface IStreamResponse {
  streams: Array<IStream>
  _total: Number
}

export interface IStream {
  _id: string,
  game: string,
  community_id: string,
  viewers: number,
  video_height: number,
  average_fps: number,
  delay: number,
  created_at: Date,
  is_playlist: boolean,
  preview: {
      small: string,
      medium: string,
      large: string,
      template: string,
  },
  channel: Routes.IChannel
}

export interface IGetStreamByUserOptions {
    stream_type: 'live' | 'playlist' | 'all'
}

export interface IGetStreamsOptions {
    game?: string,
    language?: string,
    stream_type?: 'live' | 'playlist' | 'all',
    limit?: number,
    offset?: number
}

export interface IGetFeaturedStreams {
    image: string,
    priority: number,
    scheduled: boolean,
    sponsored: boolean,
    stream: IStream,
    text: string,
    title: string
}

export interface IGetStreamSummaryOptions {
    game?: string
}

export interface IGetStreamSummary {
    channels: number,
    viewers: number
}

export class Stream {

    private _debug = debug('twitch:stream');
    private _client: Client;

    constructor(client: Client) {
        this._client = client;
    }


  /**
   * Get a stream by user id
   * 
   * @param {number} user_id
   * @param {IGetStreamByUserOptions} [options]
   * @returns promise
   * 
   * @memberOf TwitchClient
   */
  public GetStreamByUser(user_id: number, options?: IGetStreamByUserOptions) {
    return new Promise((resolve, reject) => {
        this._debug(`Getting stream by user id: ${user_id}`);
        this._client.CallApi(`/streams/${user_id}${this._client.ConstructOptions(options)}`).then((data: any) => {
            return resolve(<IStream>data.stream);
        }).catch((err) => reject(err));
    })
  }

  
/**
 * Get several streams by user_id's
 * 
 * @param {Array<string>} users
 * @param {IGetStreamsByUserOptions} [options]
 * @returns promise
 * 
 * @memberOf TwitchClient
 */
  public GetStreamsByUser(users: Array<number>, options?: Routes.IDefaultOptions) {
    return new Promise((resolve, reject) => {
        this._debug(`Getting streams by user array: ${this._client.ConstructCommalist(users)}`);
        this._client.CallApi(`/streams/?channel=${this._client.ConstructCommalist(users)}${this._client.ConstructOptions(options)}`)
         .then((data: IStreamResponse) => {
            return resolve(data);
        }).catch((err) => reject(err));
    })
  }

/**
 * Get streams by language, stream_type, game
 * 
 * @param {IGetStreamsOptions} options
 * @returns promise
 * 
 * @memberOf TwitchClient
 */
  public GetStreams(options: IGetStreamsOptions) {
    return new Promise((resolve, reject) => {
        this._debug(`Getting streams`);
        if (Object.keys(options).length === 0) {
            return reject('Need atleast one paramter to get streams by.');
        }

        this._client.CallApi(`/streams/${this._client.ConstructOptions(options)}`).then((data: IStreamResponse) => {
            return resolve(data);
        }).catch((err) => reject(err));
    })
  }

/**
 * Get list of featured streams
 * 
 * @param {IGetStreamsOptions} [options]
 * @returns promise
 * 
 * @memberOf TwitchClient
 */
  public GetFeaturedStreams(options?: IGetStreamsOptions) {
    return new Promise((resolve, reject) => {
        this._debug(`Getting featured streams`);
        this._client.CallApi(`/streams/featured${this._client.ConstructOptions(options)}`).then((data: any) => {
            return resolve(<IGetFeaturedStreams[]>data.featured);
        }).catch((err) => reject(err));
    })
  }

/**
 * Get stream summary by game or overall
 * 
 * @param {IGetStreamSummaryOptions} [options]
 * @returns promise
 * 
 * @memberOf TwitchClient
 */
  public GetStreamSummary(options?: IGetStreamSummaryOptions) {
    return new Promise((resolve, reject) => {
        this._debug(`Getting stream summary`);
        this._client.CallApi(`/streams/summary${this._client.ConstructOptions(options)}`).then((data: IGetStreamSummary) => {
            return resolve(data);
        }).catch((err) => reject(err));
    })
  }
}


