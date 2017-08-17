module.exports = function(config){
    var self = this;
    var jwt = require('jsonwebtoken');
    
    self.generateToken = function(tokenData){
        return new Promise((resolve, reject) => {
            try{                
                jwt.sign(tokenData, config.server.security.tokenSecret, { 
                    expiresIn: '1m',
                    algorithm: 'RS512'
                }, (error, token) => {
                    if(error){
                        resolve(null);
                    }
                    else{
                        resolve(token); 
                    }
                });                
            }catch(e){
                reject(e);
            }
        })
    }

    self.decrypt = function(token){
        return new Promise((resolve, reject) => {
            try{
                if(token && token !== null){
                    jwt.verify(tokenData, config.server.security.tokenSecret, {                     
                        algorithm: 'RS512'
                    }, (error, tokenData) => {
                        if(error){
                            resolve(null);
                        }
                        else{
                            resolve(tokenData); 
                        }
                    });                    
                }
                else{
                    resolve(null);
                }
            }catch(e){
                reject(e);
            }
        })
    }
}