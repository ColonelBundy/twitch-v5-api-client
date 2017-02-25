import Client from '../lib/client';
import debug = require('debug');

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

export interface UsersInterface {
    _total: Number,
    users: Array<IUser>
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

export class Channel {

    private _debug = debug('twitch:channel');
    private _client: Client;

    constructor(client: Client) {
        this._client = client;
    }

    /**
     * Get channel editors of a channel
     * 
     * Scope 'channel_read' required
     * 
     * @param {number} user_id
     * @returns promise
     * 
     * @memberOf Channel
     */
    public GetChannelEditors(user_id: number): Promise<IUser> {
        return new Promise((resolve, reject) => {
            this._debug(`Getting channel editors by id: ${user_id}`);

            if (!this._client.HasScope('channel_read')) {
                return reject('Insufficient scope access');
            }   

            this._client.CallApi(`/channels/${user_id}/editors`, true).then(resolve).catch(reject);
        })
    }

  /**
   * Get channel by user_id
   * 
   * No scope required
   * 
   * @param {number} user_id
   * @returns promise
   * 
   * @memberOf TwitchClient
   */
  public GetChannelById(user_id: number): Promise<IChannel> {
    return new Promise((resolve, reject) => {
        this._debug(`Getting channel by id: ${user_id}`);
        this._client.CallApi(`/channels/${user_id}`).then(resolve).catch(reject);
    })
  }

/**
 * Get user(s) by username
 * 
 *  No scope required
 * 
 * @param {Array<string>} users
 * @returns promise
 * 
 * @memberOf TwitchClient
 */
  public GetChannelsByUsername(users: Array<string>): Promise<UsersInterface> {
    return new Promise((resolve, reject) => {
        this._debug(`Getting channels by usernames: ${this._client.ConstructCommalist(users)}`);
        this._client.CallApi(`/users?login=${this._client.ConstructCommalist(users)}`).then(resolve).catch(reject);
    })
  }

/**
 * Get list of followers of a channel by user_id
 * 
 *  No scope required
 * 
 * @param {number} user_id
 * @param {IGetChannelFollowersOptions} options
 * @returns promise
 * 
 * @memberOf TwitchClient
 */
  public GetChannelFollowers(user_id: number, options?: IGetChannelFollowersOptions): Promise<FollowersInterface> {
    return new Promise((resolve, reject) => {
        this._debug(`Getting channel followers by id: ${user_id}`);
        this._client.CallApi(`/channels/${user_id}/follows${this._client.ConstructOptions(options)}`).then((data: FollowersInterface) => {
            if (data._cursor !== '') {
                let self = this;
                data.next = function() {
                    options.cursor = data._cursor;
                    return self.GetChannelFollowers.apply(self, [user_id, options]);
                }
            }
            return resolve(<FollowersInterface>data);
        }).catch(reject);
    })
  }

/**
 * Get list of teams of a channel by user_id
 * 
 *  No scope required
 * 
 * @param {number} user_id
 * @returns promise
 * 
 * @memberOf TwitchClient
 */
  public GetChannelTeams(user_id: number): Promise<ITeams[]> {
    return new Promise((resolve, reject) => {
        this._debug(`Getting channel teams by id: ${user_id}`);
        this._client.CallApi(`/channels/${user_id}/teams`).then((data: any) => {
            return resolve(<ITeams[]>data.teams);
        }).catch(reject);
    })
  }

/**
 * Get list of videos of a channel by user_id
 * 
 *  No scope required
 * 
 * @param {number} user_id
 * @param {IGetChannelVideosOptions} options
 * @returns promise
 * 
 * @memberOf TwitchClient
 */
  public GetChannelVideos(user_id: number, options?: IGetChannelVideosOptions): Promise<IVideos> {
    return new Promise((resolve, reject) => {
        this._debug(`Getting channel videos by id: ${user_id}`);
        this._client.CallApi(`/channels/${user_id}/videos${this._client.ConstructOptions(options)}`).then(resolve).catch(reject);
    })
  }

/**
 * Get community of a channel by user_id
 * 
 *  No scope required
 * 
 * @param {number} user_id
 * @returns promise
 * 
 * @memberOf TwitchClient
 */
  public GetChannelCommunity(user_id: number): Promise<ICommunity> {
    return new Promise((resolve, reject) => {
        this._debug(`Getting channel community by user_id: ${user_id}`);
        this._client.CallApi(`/channels/${user_id}/community`).then(resolve).catch(reject);
    })
  }

}


