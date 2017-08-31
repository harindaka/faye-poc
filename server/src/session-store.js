module.exports = function(config){

    var self = this;
    
    let redis = require('redis').createClient(config.sessionStore.options);

    const nicknameCollectionName = 'nicknames';
    const sessionCollectionNamePrefix = 'sessions-for-';
    
    self.reserveNickname = function(nickname){
        return new Promise((resolve, reject) => {
            redis.hsetnx(nicknameCollectionName, nickname, '', (error, result) => {
                try{
                    if(error){
                        reject(error);
                    } else {
                        if(result === 1){
                            resolve(true);
                        }
                        else {
                            resolve(false);
                        }
                    }
                } catch(e){
                    reject(e);
                }
            });
        });
    };

    self.deleteToken = function(nickname, clientId){        
        return new Promise((resolve, reject) => {
            try{
                let sessionCollectionName = sessionCollectionNamePrefix + nickname;
                let transaction = redis; // redis.multi();
                transaction.hdel(sessionCollectionName, clientId, (error, result) => {
                    try{
                        if(error){
                            reject(error);
                        } else {   
                            transaction.exists(sessionCollectionName, function(error, sessionsExistForUser){
                                try{
                                    if(error){
                                        reject(error);
                                    } else if(!sessionsExistForUser){
                                        transaction.hdel(nicknameCollectionName, nickname, (error, result) => {
                                            if(error){
                                                reject(error);
                                            }
                                            else {
                                                resolve();
                                            }
                                        });                                        
                                    }
                                } catch(e){
                                    reject(e);
                                }
                            });
                        }
                    } catch(e){
                        reject(e);
                    }
                });

                // transaction.exec((error, res) => {
                //     if(error){
                //         reject(error);
                //     }
                //     else{
                //         resolve();
                //     }
                // });
            } catch(e){
                reject(e);
            }
        });
    };

    self.updateToken = function(nickname, clientId, authToken){
        return new Promise((resolve, reject) => {
            redis.hmset(sessionCollectionNamePrefix + nickname, clientId, authToken, (error, result) => {
                try{
                    if(error){
                        reject(error);
                    } else {
                        resolve();
                    }
                } catch(e){
                    reject(e);
                }
            });
        });
    };

    self.retrieveToken = function(nickname, clientId){
        return new Promise((resolve, reject) => {
            redis.hmget(sessionCollectionNamePrefix + nickname, clientId, (error, result) => {
                try{
                    if(error){
                        reject(error);
                    } else {
                        resolve(result[0]);
                    }
                } catch(e){
                    reject(e);
                }
            });
        });
    };
}