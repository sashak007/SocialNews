'use strict;'

var request = require('request'),
		cheerio = require('cheerio'),
		twitter = require('twitter'),
		express = require('express'),
		http    = require('http'),
		exphbs  = require('express-handlebars'),
		async   = require('async'),
		io 			= require('socket.io'),
		moment  = require('moment');

var twitterConfig = {
								  consumer_key: process.env.TWITTER_CONSUMER_KEY,
								  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
								  access_token_key: process.env.TWITTER_ACCESS_TOKEN,
								  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
								};

var app = express(),
    server = http.createServer(app),
		live = io(server),
		client = new twitter(twitterConfig);

var topicList = [],
		topicTweets = {};

var refreshApp = function(){
	request('https://news.google.com/', function (error, response, body) {
  	var tempTopicList = [];
	  if (!error && response.statusCode === 200) {


	    $ = cheerio.load(body);

	    $('div.topic a').each(function(index,elem){

	    	tempTopicList.push($(elem).text());

	    });

	  } else {
	  	console.log(error);
			console.log('statusCode: ' + response.statusCode);
	  }

	  var topicListIterativeTasks = tempTopicList.map(function(topic) {

	  	return function(callback) {
				client.get('search/tweets', {q: topic}, function(error, tweets, response){
				   if(!error && response.statusCode === 200){
				   		callback(null, {"topic": topic, "tweets": tweets});
				   } else {
				   		if (error) {
				   			callback(error, null);
				   		} else {
				   			callback(new Error("bad status code: " + resonse.statusCode), null);
				   		}
				   }

				});
			};
		});

		async.parallel(topicListIterativeTasks, function(error, results) {
			if(!error) {
				var tempTopicTweets = {};
				results.forEach(function(result) {
					tempTopicTweets[result.topic] = result.tweets;
				});
				topicList = tempTopicList;
				topicTweets = tempTopicTweets;

				console.log('updateTweets');
				// sends update to the client
				live.sockets.emit('updatedTweets', topicTweets);

			} else {
				console.error(error);
			}
		});
	});
}

//refresh every 30 seconds
refreshApp();
setInterval(refreshApp, 30000);

// templatizing with handlebars
var handlebarsConfig = {
	defaultLayout: 'index',
	layoutsDir: './js/views/layouts',
	helpers: {
		formattedTimestamp: function(timestamp) {

			var hour = timestamp.split(" ");

			var timePassed = moment().startOf(hour[3]).fromNow();

			if (timePassed >= 24){
		  	var time = timestamp.split('+0000');
		  	return time[0] + time[1];
	  	} else {
	  		return timePassed;
	  	}
		}
	}
};

var hbs = exphbs.create(handlebarsConfig);

app.engine('html', hbs.engine);
app.set('views', './js/views');
app.set('view engine', 'html');

app.get('/', function (req, res) {
	var topicSelected = req.query.topic;
	if (typeof topicSelected === 'undefined') {
		topicSelected = topicList[0];
	}

	var	tweets = topicTweets[topicSelected].statuses;

  res.render('template',{topic:topicList,tweets:tweets, active: topicSelected});
});

app.use(express.static('public'));
server.listen(3000);
