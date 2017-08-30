(function(){
    
    let config = require('./config');
    let http = require('http');
    let httpServer = http.createServer();

    let topicIndex = createTopicIndex();

    let MessageFactory = require('./message-factory');
    let messageFactory = new MessageFactory();
    
    let SessionStore = require('./session-store');
    let sessionStore = new SessionStore(config);

    let ErrorUtil = require('./error-util');
    let errorUtil = new ErrorUtil(config);

    let TokenUtil = require('./token-util');
    let tokenUtil = new TokenUtil(config);

    let faye = require('faye');
    let fayeServer = new faye.NodeAdapter(config.server.faye.options);

    let ServersideClient = require('./serverside-client');
    let serversideClient = new ServersideClient(config, fayeServer, tokenUtil);    

    let ChannelRequestParser = require('./channel-request-parser');
    let channelRequestParser = new ChannelRequestParser();

    let SessionManager = require('./session-manager');
    let sessionManager = new SessionManager(config, sessionStore, fayeServer, serversideClient, channelRequestParser, messageFactory, tokenUtil, errorUtil);    

    let SubscriptionInterceptor = require('./subscription-interceptor');
    let subscriptionInterceptor = new SubscriptionInterceptor(topicIndex, sessionManager, errorUtil);

    let IncomingMessageInterceptor = require('./incoming-message-interceptor');
    let incomingMessageInterceptor = new IncomingMessageInterceptor(topicIndex, sessionManager, errorUtil);

    let OutgoingMessageInterceptor = require('./outgoing-message-interceptor');
    let outgoingMessageInterceptor = new OutgoingMessageInterceptor();

    // fayeServer.addExtension({
    //     incoming: function(message, callback) {         
    //         let parsedRequest = channelRequestParser.parseRequest(message);
    //         if(parsedRequest.requestType === 'subscription'){
    //             subscriptionInterceptor.processRequest(parsedRequest).then(() => {
    //                 callback(message);
    //             }).catch((error) => {
    //                 console.log('[' + parsedRequest.channel + '] Rejecting subscription due to error: ' + errorUtil.toMessage(error));
    //                 message.error = errorUtil.toJson(error);
    //                 callback(message);
    //             });
    //         }
    //         else if(parsedRequest.requestType === 'meta'){
    //             callback(message);
    //         }
    //         else{ //parsedRequest.requestType === 'message'
    //             incomingMessageInterceptor.processRequest(parsedRequest, message).then(() => {
    //                 callback(message);
    //             }).catch((error) => {
    //                 console.log('[' + parsedRequest.channel + '] Rejecting message due to error: ' + errorUtil.toMessage(error));
    //                 message.error = errorUtil.toJson(error);
    //                 callback(message);
    //             });
    //         }            
    //     },

    //     outgoing: function(message, callback){
    //         outgoingMessageInterceptor.processResponse(message).then(() => {
    //             callback(message);
    //         }).catch((error) => {
    //             console.log('[' + parsedRequest.channel + '] Failed to process outgoing message due to error: ' + errorUtil.toMessage(error));
    //             message.error = errorUtil.toJson(error);
    //             callback(message);
    //         });
    //     }
    // });

    // fayeServer.on('subscribe', function(clientId, channel) {        
    //     let nickname = channelRequestParser.parseNicknamefromUserChannelUrl(channel);
    //     if(nickname !== null){                        
    //         let tokenMessage = messageFactory.create('auth-token');
    //         let userJoinMessage = messageFactory.create('chat');
    //         userJoinMessage.text = nickname + ' joined the chat';

    //         sessionStore.retrieveToken(nickname, clientId).then((authToken) => {
    //             tokenMessage.authToken = authToken;
    //             tokenMessage.clientId = clientId;
    //             return serversideClient.publish(channel, tokenMessage);
    //         }).then(() => {
    //             console.log('[' + nickname + '][' + channel + '] Published auth-token');                
    //         }).catch((error) => {
    //             console.log('[' + nickname + '][' + channel + '] Failed to publish auth-token ' + JSON.stringify(tokenMessage) + ' due to error: ' + errorUtil.toMessage(error));                
    //         }).then(() => {
    //             return serversideClient.publish(config.server.faye.topics.chat.url, userJoinMessage);
    //         }).then(() => {
    //             console.log('[' + nickname + '][' + config.server.faye.topics.chat.url + '] Published message: ' + JSON.stringify(userJoinMessage));                
    //         }).catch((error) => {
    //             console.log('[' + nickname + '][' + config.server.faye.topics.chat.url + '] Failed to publish message ' + JSON.stringify(userJoinMessage) + ' due to error: ' + errorUtil.toMessage(error));                
    //         });                                   
    //     }
    // });

    // fayeServer.on('unsubscribe', function(clientId, channel) {
    //     let nickname = channelRequestParser.parseNicknamefromUserChannelUrl(channel);
    //     if(nickname !== null){                        
    //         let userLeaveMessage = messageFactory.create('chat');
    //         userLeaveMessage.text = nickname + ' left the chat';

    //         sessionStore.deleteToken(nickname, clientId).then(() => {
    //             return serversideClient.publish(config.server.faye.topics.chat.url, userLeaveMessage);
    //         }).then(() => {
    //             console.log('[' + nickname + '][' + config.server.faye.topics.chat.url + '] Published chat: ' + JSON.stringify(userLeaveMessage));
    //         }).catch((error) => {
    //             console.log('[' + nickname + '][' + config.server.faye.topics.chat.url + '] Failed to publish chat ' + JSON.stringify(userLeaveMessage) + ' due to error: ' + errorUtil.toMessage(error));                
    //         });                   
    //     }
    // });

    function createTopicIndex(){
        let index = {};
        for(let topic in config.server.faye.topics){
            if(config.server.faye.topics.hasOwnProperty(topic)){
                index[config.server.faye.topics[topic].url] = config.server.faye.topics[topic];
            }
        }

        return index;
    }

    fayeServer.attach(httpServer);
    httpServer.listen(config.server.port, (error) => {
        if(error){
            console.log('Failed to initialize http server due to error: ' + errorUtil.toMessage(error));
        }
        else{
            console.log('Successfully initialized server on port ' + config.server.port);

            let publishedMessageCount = 0;
            setInterval(() => {          
                let topicUrl = config.server.faye.topics.log.url;  
                serversideClient.publish(topicUrl, { 
                    text: 'Hello!', 
                    clientId: null,
                    publishedMessageCount: publishedMessageCount
                }, {
                    deadline: 10, //client will not attempt to resend the message any later than 10 seconds after your first publish() call
                    attempts: 3 //how many times the client will try to send a message before giving up, including the first attempt
                }).then(() => {
                    publishedMessageCount += 1;                    
                }).catch((error) => {
                    console.log('The server explicitly rejected publishing the message due to error: ' + errorUtil.toMessage(error));
                });
            }, 3000);
        }
    });
})();