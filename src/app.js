"use strict";
var request = require("request");
var debug = require("debug");
var UserTypes;
(function (UserTypes) {
    UserTypes[UserTypes["user"] = 0] = "user";
    UserTypes[UserTypes["staff"] = 1] = "staff";
    UserTypes[UserTypes["admin"] = 2] = "admin";
})(UserTypes = exports.UserTypes || (exports.UserTypes = {}));
var TwitchClient = (function () {
    function TwitchClient(client_id) {
        this._twitchURI = 'https://api.twitch.tv/kraken';
        this._debug = debug('twitch');
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
    TwitchClient.prototype.GetChannelById = function (user_id) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._debug("Getting channel by id: " + user_id);
            _this.CallApi({ url: "/channels/" + user_id }).then(function (data) {
                return resolve(data);
            })["catch"](function (err) { return reject(err); });
        });
    };
    /**
     * Get user(s) by username
     *
     * @param {Array<string>} users
     * @returns promise
     *
     * @memberOf TwitchClient
     */
    TwitchClient.prototype.GetChannelsByUsername = function (users) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._debug("Getting channel(s) by username");
            var users_string = '';
            if (users.length > 0) {
                users.forEach(function (user, i) {
                    users_string += user;
                    if (users.length !== (i + 1)) {
                        users_string += ',';
                    }
                });
            }
            _this.CallApi({ url: "/users?login=" + users_string }).then(function (data) {
                return resolve(data);
            })["catch"](function (err) { return reject(err); });
        });
    };
    /**
     * Get list of followers of a channel by user_id
     *
     * @param {number} user_id
     * @param {FollowersOptionsInterface} options
     * @returns promise
     *
     * @memberOf TwitchClient
     */
    TwitchClient.prototype.GetChannelFollowers = function (user_id, options) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._debug("Getting channel followers by id: " + user_id);
            _this.CallApi({ url: "/channels/" + user_id + "/follows" + _this.ConstructOptions(options) }).then(function (data) {
                if (data._cursor !== '') {
                    var self_1 = _this;
                    data.next = function () {
                        options.cursor = data._cursor;
                        return self_1.GetChannelFollowers.apply(self_1, [user_id, options]);
                    };
                }
                return resolve(data);
            })["catch"](function (err) { return reject(err); });
        });
    };
    /**
     * Get list of teams of a channel by user_id
     *
     * @param {number} user_id
     * @returns promise
     *
     * @memberOf TwitchClient
     */
    TwitchClient.prototype.GetChannelTeams = function (user_id) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._debug("Getting channel teams by id: " + user_id);
            _this.CallApi({ url: "/channels/" + user_id + "/teams" }).then(function (data) {
                return resolve(data);
            })["catch"](function (err) { return reject(err); });
        });
    };
    /**
     * Get list of videos of a channel by user_id
     *
     * @param {number} user_id
     * @param {VideosOptionsInterface} options
     * @returns promise
     *
     * @memberOf TwitchClient
     */
    TwitchClient.prototype.GetChannelVideos = function (user_id, options) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._debug("Getting channel videos by id: " + user_id);
            _this.CallApi({ url: "/channels/" + user_id + "/videos" + _this.ConstructOptions(options) }).then(function (data) {
                return resolve(data);
            })["catch"](function (err) { return reject(err); });
        });
    };
    /**
     * Get community of a channel by user_id
     * DOES NOT WORK AS OF 2017-02-17
     *
     * @param {number} user_id
     * @returns promise
     *
     * @memberOf TwitchClient
     */
    TwitchClient.prototype.GetChannelCommunity = function (user_id) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            console.log(" :: TwitchApi - 'GetChannelCommunity' is depcrecated, sorry ::");
            reject('Deprecated');
            _this._debug("Getting channel community by id: " + user_id);
            _this.CallApi({ url: "/channels/" + user_id + "/community" }).then(function (data) {
                return resolve(data);
            })["catch"](function (err) { return reject(err); });
        });
    };
    /**
     * Call the api without restrictions :)
     *
     * @param {string} url
     * @param {Object} [options]
     * @returns promise
     *
     * @memberOf TwitchClient
     */
    TwitchClient.prototype.RawApi = function (url, options) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._debug("Rawapi request: " + (url + _this.ConstructOptions(options)));
            _this.CallApi({ url: url + (options ? _this.ConstructOptions(options) : '') }).then(function (data) {
                return resolve(data);
            })["catch"](function (err) { return reject(err); });
        });
    };
    /**
     * Construct options in the uri
     *
     * @private
     * @param {OptionsInterface} options
     * @returns string
     *
     * @memberOf TwitchClient
     */
    TwitchClient.prototype.ConstructOptions = function (options) {
        var query = '';
        if (!options || Object.keys(options).length === 0) {
            return;
        }
        // Nasty 
        Object.keys(options).forEach(function (option, i) {
            if (options.hasOwnProperty(option)) {
                if (i === 0) {
                    query += '?';
                }
                else {
                    query += '&';
                }
                query += option + "=" + options[option];
            }
        });
        return query;
    };
    /**
     * Call the api
     *
     * @private
     * @param {OptionsInterface} options
     * @returns promise
     *
     * @memberOf TwitchClient
     */
    TwitchClient.prototype.CallApi = function (options) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._debug("Calling api: " + _this._twitchURI + options.url);
            request.get({
                headers: {
                    'Accept': 'application/vnd.twitchtv.v5+json',
                    'Client-ID': _this._client_id
                },
                url: _this._twitchURI + options.url
            }, function (err, response, body) {
                if (err || response.statusCode !== 200) {
                    var data = JSON.parse(body);
                    _this._debug("Twitch Error: '" + data.error + "', message: '" + data.message + "'");
                    return reject(err || data);
                }
                return resolve(JSON.parse(body));
            });
        });
    };
    return TwitchClient;
}());
exports.TwitchClient = TwitchClient;
var api = new TwitchClient('t7esel84mtsx2x0lhxuppvonn5naclz');
//api.GetChannelsByUsername(['b0aty']).then((data) => console.log(data)).catch((err) => console.log(err));
/*api.GetChannelFollowers(27107346, { direction: 'desc', offset: 25 }).then((data: FollowersInterface) => {
    console.log(data);
    if (data.next) {
        data.next().then(data => console.log(data)).catch((err) => console.log(err));
    }
}).catch((err) => console.log(err));*/
//api.GetChannelCommunity(27107346).then((data: VideosInterface) => console.log(data)).catch((err) => console.log(err));
api.RawApi('/channels/27107346').then(function (data) { return console.log(data); })["catch"](function (err) { return console.log(err); });
