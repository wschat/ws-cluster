const {proxy,events} = require('./src/proxy')
const {inherits} = require('util')
const cluster=require('cluster')
const counts=require('os').cpus().length
const fs=require('fs')

class Obj extends events{}

var p = new Proxy(Obj, {
    
    construct: function(target, args,newTarget) {
        console.log('called: ',typeof target);
        var app=new Proxy(new target(...args),{
            set: function(obj, prop, value, receiver) {
                obj[prop] = receiver;
                // 无论有没有下面这一行，都会报错
                console.log('set...',prop,value)
                return true;
            },
        });
        return app
    },
    
    
});

var a=new p();
a.aa='1123';
a.on('aa',_=>{
    console.log('on aa')
})
a.emit('aa',{})


 