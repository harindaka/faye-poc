module.exports = function(config){
    var self = this;
    var jwt = require('jsonwebtoken');

    self.generateToken = function(tokenData, expiresIn){
        return new Promise((resolve, reject) => {
            if(!expiresIn){
                expiresIn = config.server.security.clientTokenExpiresIn;
            }

            try{                
                jwt.sign(tokenData, config.server.security.tokenSecret, { 
                    expiresIn: expiresIn,
                    algorithm: 'HS512'
                }, (error, token) => {
                    if(error){
                        reject(error);
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

    self.decryptToken = function(token){
        return new Promise((resolve, reject) => {
            try{                
                jwt.verify(token, config.server.security.tokenSecret, {                     
                    algorithm: 'HS512'
                }, (error, tokenData) => {
                    if(error){
                        reject(error);
                    }
                    else{
                        resolve(tokenData); 
                    }
                });
            }catch(e){
                reject(e);
            }
        })
    }
}