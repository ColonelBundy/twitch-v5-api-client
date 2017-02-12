"use strict";
var should = require("should");
var Twitch = require("./app");
var Client = new Twitch.TwitchClient('t7esel84mtsx2x0lhxuppvonn5naclz');
describe('Channels', function () {
    describe('#GetChannelsByUsername()', function () {
        Client.GetChannelsByUsername(['lirik', 'monstercat', 'nocopyrightsounds']).then(function (data) {
            it('should return an array of users', function () {
                assert.equal(3, data.users.length);
                assert.equal(3, data._total);
            });
            it('should contain users of lirik, monstercat and nocopyrightsounds', function () {
                should(data.users[0]).have.property('name', 'lirik');
                should(data.users[1]).have.property('name', 'monstercat');
                should(data.users[2]).have.property('name', 'nocopyrightsounds');
            });
        });
    });
});
