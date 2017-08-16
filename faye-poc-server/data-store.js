module.exports = function(config){

    var self = this;
    
    var redis = require('redis').createClient(config.dataStore.options);

    const nicknameCollectionName = 'nicknames';
    
    self.reserveNickname = function(nickname){
        return new Promise((resolve, reject) => {
            redis.hsetnx(nicknameCollectionName, nickname, '', function(error, result) {
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

    self.updateAuthToken = function(nickname, authToken){
        return new Promise((resolve, reject) => {
            redis.hmset(nicknameCollectionName, nickname, authToken, function(error, result) {
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

    self.getAuthToken = function(nickname){
        return new Promise((resolve, reject) => {
            redis.hmget(nicknameCollectionName, nickname, function(error, result) {
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