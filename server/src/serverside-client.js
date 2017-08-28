module.exports = function(
    config,
    fayeServer, 
    sessionManager){
    var self = this;
    
    let authToken = null;
    let serverSideFayeClient = fayeServer.getClient();
    serverSideFayeClient.addExtension({
        outgoing: function(message, callback) {
            getAuthToken().then((token) => {
                if(!message.ext){
                    message.ext = {};
                }

                message.ext.authToken = token;
                callback(message);
            }, (error)=> {
                console.log('Error encountered when generating the server side client token: ' + error.message);
                message.error = error;
                callback(message);
            });
        }
    });

    self.publish = function(channel, message){
        return serverSideFayeClient.publish(channel, message, {
            deadline: 10, //client will not attempt to resend the message any later than 10 seconds after your first publish() call
            attempts: 3 //how many times the client will try to send a message before giving up, including the first attempt
        });
    };

    function getAuthToken(){
        return new Promise((resolve, reject) => {
            try{
                if(authToken === null){
                    sessionManager.generateToken({ tokenType: "server-auth-token" }, 
                        config.server.security.serverTokenExpiresIn).then((newToken)=>{
                            authToken = newToken
                            resolve(authToken);
                    }, (error) => {
                        reject(error);
                    });
                }
                else{
                    resolve(authToken);
                }
            } catch(e){
                reject(e);
            }
        });
    }
}