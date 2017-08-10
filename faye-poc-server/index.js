(function(){
    
    var config = require('./config');
    var http = require('http');
    var httpServer = http.createServer();

    var faye = require('faye');
    var fayeServer = new faye.NodeAdapter(config.server.faye);

    fayeServer.addExtension({
        incoming: function(message, callback) {
            if (message.channel === '/meta/subscribe') {                
                if(!config.topics[message.subscription]){
                    message.error = buildError('E0000'); 
                } else if (!isAuthorized(message)){
                    message.error = buildError('E0001');
                }
            }
            
            callback(message);
        }
    });

    fayeServer.attach(httpServer);
    httpServer.listen(config.server.port, function(error){
        if(error){
            console.log(error);
        }
        else{
            console.log('Listening on port ' + config.server.port);

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

    function isAuthorized(message) {
        return true;
    };

    function buildError(errorCode){
        return {
            code: errorCode,
            message: config.errors[errorCode]
        }
    }
})();