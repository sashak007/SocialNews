var refreshPage = function(){
	location.reload();
}

var socket = io.connect('http://192.168.59.103:3000');

socket.on('updateTweets', function (tweets) {
  console.log(tweets);
  location.reload();
});
