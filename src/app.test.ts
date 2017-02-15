import should = require('should');
import * as Twitch from './app';

const Client = new Twitch.TwitchClient();
const TestUser = {
  id: 23161357,
  name: 'lirik'
};

const TestUser2 = {
  id: 27446517,
  name: 'Monstercat'
}

const TestUser3 = {
  id: 46375210,
  name: 'nocopyrightsounds'
}


describe('Channels', function() {
  describe('#GetChannelsByUsername()', function() {
      it('should return an array of users', function(done) {
        Client.GetChannelsByUsername([TestUser.name, TestUser2.name]).then((data: Twitch.UsersInterface) => {
          should(data.users[0]).have.properties(['display_name', '_id', 'name', 'type', 'bio', 'created_at', 'updated_at', 'logo'])
          data._total.should.equal(2);
          data.users.should.be.type('object');

          done();
        });
      });
  });

  describe('#GetChannelById()', function() {
      it('should return an user object', function(done) {
        Client.GetChannelById(TestUser.id).then((data: Twitch.IChannel) => {
          data.should.have.properties(
            ['mature', 'status', 'broadcaster_language', 'display_name', 'game', 'language',
            'name', 'created_at', 'updated_at', '_id', 'logo', 'video_banner', 'profile_banner', 
            'profile_banner_background_color', 'partner', 'url', 'views', 'followers']);
          data.name.should.equal(TestUser.name);
          data._id.should.equal(TestUser.id.toString());

          done();
        });
      });
  });

  describe('#GetChannelFollowers()', function() {
      it('should return a list of users following a user', function(done) {
        Client.GetChannelFollowers(TestUser.id).then((data: Twitch.FollowersInterface) => {
          should(data.follows).be.type('object');
          data.should.have.properties(['_cursor', '_total', 'follows'])
          data.follows[0].should.have.properties(['created_at', 'notifications', 'user']);

          done();
        });
      });
  });



  describe('#GetChannelTeams()', function() {
      it('should return a list of teams of a user', function(done) {
        Client.GetChannelTeams(TestUser.id).then((data: Array<Twitch.ITeams>) => {
          data.should.be.type('object');
          should(data[0]).have.properties(['_id', 'background', 'banner', 'created_at', 
            'display_name', 'info', 'logo', 'name', 'updated_at']);

          done();
        });
      });
  });


  describe('#GetChannelVideos()', function() {
      it('should return a list of videos of a user', function(done) {
        Client.GetChannelVideos(TestUser.id).then((data: Twitch.IVideos) => {
          data.videos.should.be.type('object');
          should(data.videos[0]).have.properties(['_id', 'broadcast_id', 'broadcast_type', 'created_at', 
          'description', 'description_html', 'game', 'language', 'length', 'published_at', 'status', 
          'tag_list', 'title', 'url', 'viewable', 'viewable_at', 'views', 'fps', 'resolutions']);
          should(data.videos[0]).have.property('channel').have.properties(['_id', 'display_name', 'name']);
          should(data.videos[0]).have.property('preview').have.properties(['large', 'medium', 'small', 'template']);
          should(data.videos[0]).have.property('thumbnails').have.properties(['large', 'medium', 'small', 'template']);
          
          done();
        });
      });
  });
});


describe('streams', function() {
  
  describe('#GetStreamByUser()', function() {
      it('should return a stream object', function(done) {
        Client.GetStreamByUser(TestUser2.id).then((data: Twitch.IStream) => {
          data.should.be.Object();
          should(data).have.properties(['_id', 'game', 'community_id', 'viewers', 
          'video_height', 'average_fps', 'delay', 'created_at', 'is_playlist', 'preview', 'channel']);

          done();
        });
      });
  });

  describe('#GetStreamsByUser()', function() {
      it('should return an array stream objects', function(done) {
        Client.GetStreamsByUser([TestUser3.id, TestUser2.id]).then((data: Twitch.IStreamResponse) => {
          data.streams.should.be.Array();
          should(data.streams[0]).have.properties(['_id', 'game', 'community_id', 'viewers', 
          'video_height', 'average_fps', 'delay', 'created_at', 'is_playlist', 'preview', 'channel']);
          
          done();
        });
      });
  });
  

  describe('#GetStreams()', function() {
      it('should return an array stream objects', function(done) {
        Client.GetStreams({language: 'en', stream_type: 'live'}).then((data: Twitch.IStreamResponse) => {
          data.streams.should.be.Array();
          should(data.streams[0]).have.properties(['_id', 'game', 'community_id', 'viewers', 
          'video_height', 'average_fps', 'delay', 'created_at', 'is_playlist', 'preview', 'channel']);
          
          done();
        });
      });
  });

  describe('#GetFeaturedStreams()', function() {
      it('should return an array stream objects', function(done) {
        Client.GetFeaturedStreams().then((data: Array<Twitch.IGetFeaturedStreams>) => {
          data.should.be.Array();
          should(data[0]).have.properties(['image', 'priority', 'scheduled', 
          'sponsored', 'text', 'title']);
          should(data[0]).have.property('stream').have.property('channel');
          
          done();
        });
      });
  });

  describe('#GetStreamSummary()', function() {
      it('should return an object', function(done) {
        Client.GetStreamSummary().then((data: Twitch.IGetStreamSummary) => {
          data.should.be.Object();
          should(data).have.property('channels').be.Number
          should(data).have.property('viewers').be.Number
          
          done();
        });
      });
  });

  
});
