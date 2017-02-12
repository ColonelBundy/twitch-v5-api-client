import request = require('request');
import debug = require('debug');

export interface OptionsInterface {
  url?: string,
  limit?: number,
  offset?: number,
  cursor?: string,
  direction?: 'desc' | 'asc',
  broadcast_type?: string,
  language?: string,
  sort?: string
}

export interface StreamResponseInterface {
  streams: Array<StreamInterface>
  _total: Number
}

export interface StreamInterface extends StreamResponseInterface {
  game: string,
  viewers: number,
  created_at: String,
  video_height: number,
  average_fps: number,
  delay: number,
  is_playlist: boolean,
  channel: ChannelInterface
}

export interface ChannelInterface {
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

export interface UserInterface {
    display_name: string,
    _id: number,
    name: string,
    type: UserTypes,
    bio: string,
    created_at: Date,
    updated_at: Date,
    logo: string
}

export interface TwitchError {
  error: String,
  status: Number,
  message: String
}

export enum UserTypes {
  user,
  staff,
  admin
}

export interface FollowersOptionsInterface {
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
    user: UserInterface
}

export interface TeamsInterface {
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

export interface VideosOptionsInterface {
    limit?: number,
    offset?: number,
    broadcast_type?: string,
    language?: string,
    sort?: string
}

export interface VideosInterface {
    _total: number,
    videos: Array<VideoInterface>,
}

export interface VideoInterface {
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

export interface CommunityInterface {
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
    users: Array<UserInterface>
}


export class TwitchClient {
  private _client_id: string;
  private _twitchURI: string = 'https://api.twitch.tv/kraken';
  private _debug = debug('twitch');

  constructor(client_id: string) {
    this._client_id = client_id;
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
        this.CallApi({url: `/channels/${user_id}`}).then((data: ChannelInterface) => {
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
        this._debug(`Getting channel(s) by username`);

        let users_string: string = '';

        if (users.length > 0) {
            users.forEach((user, i) => {
                users_string += user;

                if (users.length !== (i + 1)) {
                    users_string += ',';
                }
            });
        }

        this.CallApi({url: `/users?login=${users_string}`}).then((data: UsersInterface) => {
            return resolve(data);
        }).catch((err) => reject(err));
    })
  }

/**
 * Get list of followers of a channel by user_id
 * 
 * @param {number} user_id
 * @param {FollowersOptionsInterface} options
 * @returns promise
 * 
 * @memberOf TwitchClient
 */
  public GetChannelFollowers(user_id: number, options?: FollowersOptionsInterface) {
    return new Promise((resolve, reject) => {
        this._debug(`Getting channel followers by id: ${user_id}`);
        this.CallApi({url: `/channels/${user_id}/follows${this.ConstructOptions(options)}`}).then((data: FollowersInterface) => {
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
        this.CallApi({url: `/channels/${user_id}/teams`}).then((data: any) => {
            return resolve(<TeamsInterface[]>data.teams);
        }).catch((err) => reject(err));
    })
  }

/**
 * Get list of videos of a channel by user_id
 * 
 * @param {number} user_id
 * @param {VideosOptionsInterface} options
 * @returns promise
 * 
 * @memberOf TwitchClient
 */
  public GetChannelVideos(user_id: number, options?: VideosOptionsInterface) {
    return new Promise((resolve, reject) => {
        this._debug(`Getting channel videos by id: ${user_id}`);
        this.CallApi({url: `/channels/${user_id}/videos${this.ConstructOptions(options)}`}).then((data: VideosInterface) => {
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
        console.log(` :: TwitchApi - 'GetChannelCommunity' is depcrecated, sorry ::`);
        reject('Deprecated');
        this._debug(`Getting channel community by id: ${user_id}`);
        this.CallApi({url: `/channels/${user_id}/community`}).then((data: CommunityInterface) => {
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
        this.CallApi({url: url + (options ? this.ConstructOptions(options) : '')}).then((data: CommunityInterface) => {
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
 * Call the api
 * 
 * @private
 * @param {OptionsInterface} options
 * @returns promise
 * 
 * @memberOf TwitchClient
 */
  private CallApi(options: OptionsInterface) {
    return new Promise((resolve, reject) => {
        this._debug(`Calling api: ${this._twitchURI}${options.url}`);
        request.get({
            headers: {
                'Accept': 'application/vnd.twitchtv.v5+json',
                'Client-ID': this._client_id
            },
            url: this._twitchURI + options.url
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


//const api = new TwitchClient('t7esel84mtsx2x0lhxuppvonn5naclz');

//api.GetChannelsByUsername(['b0aty']).then((data) => console.log(data)).catch((err) => console.log(err));
/*api.GetChannelFollowers(27107346).then((data: FollowersInterface) => {
    console.log(data);
}).catch((err) => console.log(err));
*/
/*api.GetChannelTeams(27107346).then((data: Array<TeamsInterface>) => {
    if( typeof data === 'array') {
        console.log('its an array');
    } else if (typeof data === 'object') {
        console.log('its an object');
    }
}).catch((err) => console.log(err));
*/
//api.GetChannelCommunity(27107346).then((data: VideosInterface) => console.log(data)).catch((err) => console.log(err));
//api.RawApi('/channels/27107346').then((data) => console.log(data)).catch((err) => console.log(err));