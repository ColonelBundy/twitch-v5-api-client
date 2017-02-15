import request = require('request');
import debug = require('debug');

export interface ICombinedOptions {
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

export interface IDefaultOptions {
    limit?: number,
    offset?: number
}

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
  channel: IChannel
}

export interface IChannel {
  mature: boolean,
  status: string,
  broadcaster_language: string,
  display_name: string,
  game: string,
  language: string,
  name: string,
  created_at: Date,
  updated_at: Date,
  _id: Number,
  logo: string,
  video_banner: string,
  profile_banner: string,
  profile_banner_background_color: string,
  partner: Boolean,
  url: string,
  views: number,
  followers: number
}

export interface IUser {
    display_name: string,
    _id: number,
    name: string,
    type: IUserTypes,
    bio: string,
    created_at: Date,
    updated_at: Date,
    logo: string
}

export interface ITwitchError {
  error: String,
  status: Number,
  message: String
}

export enum IUserTypes {
  user,
  staff,
  admin
}

export interface IGetChannelFollowersOptions {
    limit?: number,
    offset?: number,
    cursor?: string,
    direction?: 'desc' | 'asc'
}

export interface FollowersInterface {
    _total: number,
    _cursor: string,
    next?: Function,
    follows: Array<IFollower>
}

export interface IFollower {
    created_at: Date,
    notifications: boolean,
    user: IUser
}

export interface ITeams {
    _id: number,
    background: string,
    banner: string,
    created_at: Date,
    display_name: string,
    info: string,
    logo: string,
    name: string,
    updated_at: Date
}

export interface IGetChannelVideosOptions {
    limit?: number,
    offset?: number,
    broadcast_type?: string,
    language?: string,
    sort?: string
}

export interface IVideos {
    _total: number,
    videos: Array<IVideo>,
}

export interface IVideo {
    _id: string,
    broadcast_id: string,
    broadcast_type: string,
    channel: {
        _id: string,
        display_name: string,
        name: string
    },
    created_at: Date,
    description: string,
    description_html: string,
    fps: {
        chunked?: number,
        high?: number,
        low?: number,
        medium?: number,
        mobile?: number
    },
    game: string,
    language: string,
    length: number,
    preview: {
        large: string,
        medium: string,
        small: string,
        template: string
    },
    published_at: Date,
    resolutions: {
        chunked?: string,
        high?: string,
        medium?: string,
        low?: string,
        mobile?: string
    },
    status: string,
    tag_list: string,
    thumbnails: {
        large: Array<{
            type: string,
            url: string
        }>,
        medium: Array<{
            type: string,
            url: string
        }>,
        small: Array<{
            type: string,
            url: string
        }>,
        template: Array<{
            type: string,
            url: string
        }>
    },
    title: string,
    url: string,
    viewable: string,
    viewable_at: Date,
    views: number
}

export interface ICommunity {
    _id: string,
    avatar_image_url: string,
    cover_image_url: string,
    description: string,
    description_html: string,
    language: string,
    name: string,
    owner_id: string,
    rules: string,
    rules_html: string,
    summary: string
}

export interface UsersInterface {
    _total: Number,
    users: Array<IUser>
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


export class TwitchClient {
  private _client_id: string;
  private _twitchURI: string = 'https://api.twitch.tv/kraken';
  private _debug = debug('twitch');

  constructor(client_id?: string) {
    this._client_id = client_id || process.env.TWITCH_TOKEN;
  }

  /**
   * Get channel by user_id
   * 
   * @param {number} user_id
   * @returns promise
   * 
   * @memberOf TwitchClient
   */
  public GetChannelById(user_id: number) {
    return new Promise((resolve, reject) => {
        this._debug(`Getting channel by id: ${user_id}`);
        this.CallApi(`/channels/${user_id}`).then((data: IChannel) => {
            return resolve(data);
        }).catch((err) => reject(err));
    })
  }

/**
 * Get user(s) by username
 * 
 * @param {Array<string>} users
 * @returns promise
 * 
 * @memberOf TwitchClient
 */
  public GetChannelsByUsername(users: Array<string>) {
    return new Promise((resolve, reject) => {
        this._debug(`Getting channels by usernames: ${this.ConstructCommalist(users)}`);
        this.CallApi(`/users?login=${this.ConstructCommalist(users)}`).then((data: UsersInterface) => {
            return resolve(data);
        }).catch((err) => reject(err));
    })
  }

/**
 * Get list of followers of a channel by user_id
 * 
 * @param {number} user_id
 * @param {IGetChannelFollowersOptions} options
 * @returns promise
 * 
 * @memberOf TwitchClient
 */
  public GetChannelFollowers(user_id: number, options?: IGetChannelFollowersOptions) {
    return new Promise((resolve, reject) => {
        this._debug(`Getting channel followers by id: ${user_id}`);
        this.CallApi(`/channels/${user_id}/follows${this.ConstructOptions(options)}`).then((data: FollowersInterface) => {
            if (data._cursor !== '') {
                let self = this;
                data.next = function() {
                    options.cursor = data._cursor;
                    return self.GetChannelFollowers.apply(self, [user_id, options]);
                }
            }
            return resolve(<FollowersInterface>data);
        }).catch((err) => reject(err));
    })
  }

/**
 * Get list of teams of a channel by user_id
 * 
 * @param {number} user_id
 * @returns promise
 * 
 * @memberOf TwitchClient
 */
  public GetChannelTeams(user_id: number) {
    return new Promise((resolve, reject) => {
        this._debug(`Getting channel teams by id: ${user_id}`);
        this.CallApi(`/channels/${user_id}/teams`).then((data: any) => {
            return resolve(<ITeams[]>data.teams);
        }).catch((err) => reject(err));
    })
  }

/**
 * Get list of videos of a channel by user_id
 * 
 * @param {number} user_id
 * @param {IGetChannelVideosOptions} options
 * @returns promise
 * 
 * @memberOf TwitchClient
 */
  public GetChannelVideos(user_id: number, options?: IGetChannelVideosOptions) {
    return new Promise((resolve, reject) => {
        this._debug(`Getting channel videos by id: ${user_id}`);
        this.CallApi(`/channels/${user_id}/videos${this.ConstructOptions(options)}`).then((data: IVideos) => {
            return resolve(data);
        }).catch((err) => reject(err));
    })
  }

/**
 * Get community of a channel by user_id
 * DOES NOT WORK AS OF 2017-02-17
 * 
 * @param {number} user_id
 * @returns promise
 * 
 * @memberOf TwitchClient
 */
  public GetChannelCommunity(user_id: number) {
    return new Promise((resolve, reject) => {
        console.error(` :: TwitchApi - 'GetChannelCommunity' is depcrecated, sorry ::`);
        reject('Deprecated');
        this._debug(`Getting channel community by id: ${user_id}`);
        this.CallApi(`/channels/${user_id}/community`).then((data: ICommunity) => {
            return resolve(data);
        }).catch((err) => reject(err));
    })
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
        this.CallApi(`/streams/${user_id}${this.ConstructOptions(options)}`).then((data: any) => {
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
  public GetStreamsByUser(users: Array<number>, options?: IDefaultOptions) {
    return new Promise((resolve, reject) => {
        this._debug(`Getting streams by user array: ${this.ConstructCommalist(users)}`);
        this.CallApi(`/streams/?channel=${this.ConstructCommalist(users)}${this.ConstructOptions(options)}`)
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

        this.CallApi(`/streams/${this.ConstructOptions(options)}`).then((data: IStreamResponse) => {
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
        this.CallApi(`/streams/featured${this.ConstructOptions(options)}`).then((data: any) => {
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
        this.CallApi(`/streams/summary${this.ConstructOptions(options)}`).then((data: IGetStreamSummary) => {
            return resolve(data);
        }).catch((err) => reject(err));
    })
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
        this.CallApi(url + (options ? this.ConstructOptions(options) : '')).then((data: ICommunity) => {
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
  private ConstructOptions(options: Object) {
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
  private ConstructCommalist(users: Array<any>) {
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
  private CallApi(url: string) {
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
