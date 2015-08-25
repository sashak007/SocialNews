'use strict;'

var request = require('request'),
		cheerio = require('cheerio'),
		twitter = require('twitter'),
		express = require('express'),
		exphbs  = require('express-handlebars'),
		async   = require('async'),
		moment =  require('moment');

var twitterConfig = {
								  consumer_key: process.env.TWITTER_CONSUMER_KEY,
								  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
								  access_token_key: process.env.TWITTER_ACCESS_TOKEN,
								  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
								};

var app = express(),
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
	  	
	  	if(response){
	  		console.log('statusCode: ' + response.statusCode);
	  	}
			
	  }

	  var topicListTasks = tempTopicList.map(function(topic) {
	  	 
	  	return function(callback) {
				client.get('search/tweets', {q: topic}, function(error, tweets, response){
				   if(!error && response.statusCode === 200){
				   	  //console.log('get topic tweets: ' + topic);
				   		//console.log(JSON.stringify(tweets));
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

		async.parallel(topicListTasks, function(error, results) {
			if(!error) {
				var tempTopicTweets = {};
				results.forEach(function(result) {
					tempTopicTweets[result.topic] = result.tweets;
				});
				topicList = tempTopicList;
				topicTweets = tempTopicTweets;
			} else {
				console.error(error);
			}
		});
	});
}


refreshApp();
//refresh every 30 seconds
setInterval(refreshApp, 30000);

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


// templatizing 
app.engine('html', hbs.engine);
app.set('views', './js/views');
app.set('view engine', 'html');

app.get('/', function (req, res) {
	var topicSelected = req.query.topic;
	if (typeof topicSelected === 'undefined') {
		topicSelected = topicList[0];
	}
	//console.log("topicSelected: " + topicSelected);
	var	tweets = topicTweets[topicSelected].statuses;
	// console.log('tweets: ' + JSON.stringify(tweets));
  res.render('template',{topic:topicList,tweets:tweets, active: topicSelected});
});

app.use(express.static('public'));
app.listen(3000);
