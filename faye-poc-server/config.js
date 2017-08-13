module.exports = {
    server: {
        port: 3000,
        faye: {
            mount: '/messages',
            timeout: 30,
            engine: {
                type: require('faye-redis'),
                host: 'localhost',
                port: 6379
            }
        }
    },
    
    topics: {
        "/log": {
            //topic server side configuration goes here
        },
        "/chat": {
            //topic server side configuration goes here
        }
    },

    errors: {
        E0000: 'Topic not found',
        E0001: 'Unauthorized'
    }
}