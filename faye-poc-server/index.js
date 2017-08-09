(function(){
    
    var http = require('http');
    var httpServer = http.createServer();

    var faye = require('faye');
    var fayeRedisEngine = require('faye-redis');
    var fayeServer = new faye.NodeAdapter({
        mount: '/messages',
        timeout: 30,
        engine: {
            type: fayeRedisEngine,
            host: 'localhost',
            port: 6379
        }
    });

    fayeServer.attach(httpServer);
    var port = 3000;
    httpServer.listen(port, function(error){
        if(error){
            console.log(error);
        }
        else{
            console.log('Listening on port ' + port);

            var publishedMessageCount = 0;
            var serverSideFayeClient = fayeServer.getClient();
            setInterval(function(){          
                var topicUrl = '/mytopic';  
                serverSideFayeClient.publish(topicUrl, { 
                    text: 'Hello!', 
                    clientId: null,
                    publishedMessageCount: publishedMessageCount
                }, {
                    deadline: 10, //client will not attempt to resend the message any later than 10 seconds after your first publish() call
                    attempts: 3 //how many times the client will try to send a message before giving up, including the first attempt
                }).then(function(){
                    publishedMessageCount += 1;                    
                }, function(error){
                    console.log('The server explicitly rejected publishing the message due to error: ' + error.message);
                });
            }, 3000);
        }
    });
})();